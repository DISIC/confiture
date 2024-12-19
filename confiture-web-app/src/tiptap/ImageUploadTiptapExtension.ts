import { Editor, Extension } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { EditorState, Plugin, Selection, Transaction } from "@tiptap/pm/state";
import { canSplit } from "@tiptap/pm/transform";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";

import { FileErrorMessage, Limitations } from "../enums";
import { useAuditStore } from "../store/audit";
import { AuditFile, FileDisplay } from "../types";
import { getUploadUrl, handleFileUploadError } from "../utils";

export interface ImageUploadTiptapExtensionOptions {
  uniqueId: string;
}

/**
 * Placeholder plugin
 *
 * The placeholder is an image blob (local to browser), with 50% opacity.
 * Within ProseMirror it’s a Decoration.
 */
const PlaceholderPlugin = new Plugin({
  state: {
    init() {
      return DecorationSet.empty;
    },
    apply(tr, set) {
      const trDoc = tr.doc;
      // Adjust decoration positions to changes made by the transaction
      set = set.map(tr.mapping, trDoc);
      // See if the transaction adds or removes any placeholders
      const action = tr.getMeta(PlaceholderPlugin);
      if (action && action.add) {
        const deco = Decoration.widget(
          action.add.pos,
          () => {
            return action.add.element;
          },
          {
            id: action.add.id,
            width: action.add.element.width.toString(),
            height: action.add.element.height.toString()
          }
        );
        set = set.add(trDoc, [deco]);
      } else if (action && action.remove) {
        set = set.remove(
          set.find(undefined, undefined, (spec) => spec.id == action.remove.id)
        );
      }
      return set;
    }
  },
  props: {
    decorations(state) {
      return this.getState(state);
    }
  }
});

/**
 * HandleFileImport plugin
 *
 * Handles "drag and drop" and "copy / paste" inside editor, then upload to server:
 * - multiple image files
 * - dataURL
 * - external image from URL (⚠️ CORS)
 */
const HandleFileImportPlugin = (options: ImageUploadTiptapExtensionOptions) => {
  const { uniqueId } = options;
  return new Plugin({
    props: {
      /**
       * handleDrop: called when something is dropped on the editor.
       *
       * @param {Plugin<any>} this
       * @param {EditorView} view
       * @param {DragEvent} dragEvent
       * @param {Slice} slice
       * @param {boolean} moved
       * @returns true if event is handled, otherwise false
       */
      handleDrop(
        this: Plugin<any>,
        view: EditorView,
        dragEvent: DragEvent,
        slice: Slice,
        moved: boolean
      ): boolean {
        if (moved || !dragEvent.dataTransfer || !dragEvent.dataTransfer.files) {
          return false;
        }
        const position = view.posAtCoords({
          left: dragEvent.clientX,
          top: dragEvent.clientY
        });
        if (!position) {
          console.warn(
            `the given coordinates aren't inside of the editor: {${dragEvent.clientX}, ${dragEvent.clientY}}`
          );
          return false;
        }

        return handleDataTransfer(
          uniqueId,
          view,
          dragEvent.dataTransfer,
          position.pos
        );
      },

      /**
       * handlePaste: called when something is dropped on the editor.
       *
       * @param {Plugin<any>} this
       * @param {EditorView} view
       * @param {ClipboardEvent} clipboardEvent
       * @param {Slice} slice
       * @returns true if event is handled, otherwise false
       */
      handlePaste(
        this: Plugin<any>,
        view: EditorView,
        clipboardEvent: ClipboardEvent
      ): boolean {
        if (
          !clipboardEvent.clipboardData ||
          !(clipboardEvent.clipboardData?.files?.length > 0)
        ) {
          return false;
        }

        const pos = view.state.selection.from;
        return handleDataTransfer(
          uniqueId,
          view,
          clipboardEvent.clipboardData,
          pos,
          {
            replaceSelection: true
          }
        );
      }
    }
  });
};

/**
 * handleDataTransfer: called for both drop and paste.
 *
 * @param {string} uniqueId
 * @param {EditorView} view
 * @param {DataTransfer} dataTransfer
 * @param {number} pos
 * @param {{replaceSelection: boolean}} options
 * @returns true if event is handled, otherwise false
 */
function handleDataTransfer(
  uniqueId: string,
  view: EditorView,
  dataTransfer: DataTransfer,
  pos: number,
  options?: { replaceSelection: boolean }
) {
  if (dataTransfer.files.length === 0) {
    // Handle a single URL (ex: when an external image is dragged from another window)
    // TODO multiple URLs
    // See: "text/uri-list" and
    // https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Recommended_drag_types
    const url = dataTransfer.getData("URL");
    if (url) {
      createFileFromImageUrl(url).then((file) => {
        if (file) {
          handleFileImport(uniqueId, view, pos, file, options);
        }
      });
    }
    return false;
  }

  // Handle multiple files
  return handleFilesImport(uniqueId, view, pos, dataTransfer.files, options);
}

/**
 * Handles multiple files import (drop or paste)
 *
 * @param {string} uniqueId
 * @param {EditorView} view
 * @param {number} pos
 * @param {FileList} files
 * @param {{replaceSelection: boolean}} options
 * @returns {boolean} true or false if:
 *   - files array is empty
 *   - any file is not dropped inside of the editor (should not happen)
 */
function handleFilesImport(
  uniqueId: string,
  view: EditorView,
  pos: number,
  files: FileList,
  options?: { replaceSelection: boolean }
): boolean {
  // FIXME: sometimes placeholders order differs from final images order
  for (let i = 0, il = files.length, file: File; i < il; i++) {
    file = files.item(i)!;
    if (!handleFileImport(uniqueId, view, pos, file, options)) {
      return false;
    }
  }
  return true;
}

/**
 * Handles file import (drop or paste)
 *
 * @param {string} uniqueId
 * @param {EditorView} view
 * @param {number} pos
 * @param {File} file
 * @param {{replaceSelection: boolean}} options
 * @returns {boolean} true or false if file is not dropped inside of the editor (should not happen)
 */
function handleFileImport(
  uniqueId: string,
  view: EditorView,
  pos: number,
  file: File,
  options?: { replaceSelection: boolean }
): boolean {
  if (file.size > Limitations.FILE_SIZE) {
    //FIXME: use a notification
    window.alert(FileErrorMessage.UPLOAD_SIZE);
    return true;
  }

  // A fresh object to act as the ID for this upload
  const id = {};

  const _URL = window.URL || window.webkitURL;
  const localURL = _URL.createObjectURL(file);
  // const container: HTMLParagraphElement = document.createElement("p");
  let element: HTMLImageElement | HTMLVideoElement;
  if (file.type.startsWith("image")) {
    element = document.createElement("img");
    // container.appendChild(element);
    element.onerror = () => {
      //FIXME: use a notification
      window.alert(FileErrorMessage.UPLOAD_FORMAT);
    };
    element.onload = () => {
      URL.revokeObjectURL(element.src);
      element.setAttribute("width", element.width.toString());
      element.setAttribute("height", element.height.toString());
      const state: EditorState = view.state;
      const tr: Transaction = state.tr;

      if (options?.replaceSelection && !state.selection.empty) {
        tr.deleteSelection();

        // Delete the paragraph if it becomes empty
        if (tr.doc.resolve(pos).parent.textContent === "") {
          tr.deleteRange(pos - 1, pos + 1);
        }
      }

      const $pos = tr.doc.resolve(pos);
      if (canSplit(state.tr.doc, pos)) {
        if (pos === $pos.start()) {
          pos -= 1;
        } else {
          if (pos < $pos.end()) {
            tr.split(pos);
          }
          pos += 1;
        }
      }
      tr.setMeta(PlaceholderPlugin, {
        add: { id, container: null, element, pos }
      });
      tr.setSelection(Selection.near(tr.doc.resolve(pos), 1));
      view.dispatch(tr);
      uploadAndReplacePlaceholder(uniqueId, view, file, id);
    };
    element.src = localURL;
  } else if (file.type.startsWith("video")) {
    //FIXME: Handle videos
    // element = document.createElement("video");
    // …
    //FIXME: use a notification
    window.alert(FileErrorMessage.UPLOAD_FORMAT);
  } else {
    //FIXME: use a notification
    window.alert(FileErrorMessage.UPLOAD_FORMAT);
  }

  return true;
}

/**
 * Uploads and then replaces the placeholder
 *
 * @param {string} uniqueId
 * @param {EditorView} view
 * @param {DragEvent} dragEvent
 * @param {File} file
 * @param {{replaceSelection: boolean}} options
 */
function uploadAndReplacePlaceholder(
  uniqueId: string,
  view: EditorView,
  file: File,
  id: any
) {
  const auditStore = useAuditStore();
  auditStore.uploadAuditFile(uniqueId, file, FileDisplay.EDITOR).then(
    (response: AuditFile) => {
      const placeholder = findPlaceholderDecoration(view.state, id);
      const pos: number | undefined = placeholder?.from;

      // If the content around the placeholder has been deleted, drop
      // the image
      if (pos === undefined) {
        // TODO remove image from server
        return;
      }

      // Otherwise, insert it at the placeholder's position, and remove
      // the placeholder
      const imgUrl: string = getUploadUrl(response.key);
      const state = view.state;
      const tr = state.tr;
      const node = state.schema.nodes.image.create({
        width: placeholder?.spec.width,
        height: placeholder?.spec.height,
        src: imgUrl
      });
      tr.replaceWith(pos, pos, node);
      tr.setMeta(PlaceholderPlugin, { remove: { id } });

      // Selects the image
      // tr.setSelection(new NodeSelection(tr.doc.resolve(pos)));
      view.dispatch(tr);
    },
    async (reason: any) => {
      // On failure, just clean up the placeholder
      view.dispatch(
        view.state.tr.setMeta(PlaceholderPlugin, { remove: { id } })
      );
      //FIXME: use a notification
      window.alert(await handleFileUploadError(reason));
    }
  );
}

/**
 * Finds the given placeholder (by id) within the given editor state.
 *
 * @param {EditorState} state
 * @param {any} id
 * @returns {Decoration} the placeholder (a ProseMirror decoration)
 */
function findPlaceholderDecoration(
  state: EditorState,
  id: any
): Decoration | undefined {
  const decos = PlaceholderPlugin.getState(state);
  const found = decos?.find(undefined, undefined, (spec) => spec.id == id);
  return found?.[0];
}

/**
 * Creates a File object from a given URL
 *
 * @param {string} url
 * @returns {Promise<File | null>} the created File or null if any error
 */
function createFileFromImageUrl(url: string): Promise<File | null> {
  let mimeType: string | undefined = undefined;
  return fetch(url)
    .then((res: Response) => {
      mimeType = res.headers.get("content-type") || undefined;
      return res.arrayBuffer();
    })
    .then((buf: ArrayBuffer) => {
      return new File([buf], "external", { type: mimeType });
    })
    .catch(() => {
      window.alert(FileErrorMessage.FETCH_ERROR);
      return null;
    });
}

/**
 * Extension ImageUploadTiptapExtension
 *
 * Tiptap extension handling images “drag and drop” and upload
 * Adds 2 custom ProseMirror plugins (@see https://tiptap.dev/docs/editor/extensions/custom-extensions/extend-existing#prosemirror-plugins-advanced):
 * - HandleDropPlugin
 * - PlaceholderPlugin
 * Modifies schema: adds a disableDropCursor property to Nodes spec to control
 * the showing of a drop cursor inside them (only shows horizontal cursors)
 * @see https://github.com/ProseMirror/prosemirror-dropcursor
 */
export const ImageUploadTiptapExtension =
  Extension.create<ImageUploadTiptapExtensionOptions>({
    name: "imageUpload",
    addProseMirrorPlugins() {
      return [
        HandleFileImportPlugin({ uniqueId: this.options.uniqueId }),
        PlaceholderPlugin
      ];
    }
    // Deactivate vertical cursor?
    // extendNodeSchema() {
    //   return {
    //     disableDropCursor: (
    //       view: EditorView,
    //       position: { pos: number; inside: number }
    //     ) => {
    //       const $pos = view.state.doc.resolve(position.pos);
    //       return isPosInsideInlineContent(view, $pos);
    //     }
    //   };
    // }
  });

export function insertFilesAtSelection(
  uniqueId: string,
  editor: Editor,
  files: FileList
) {
  const view: EditorView = editor.view;
  const state: EditorState = view.state;
  const tr: Transaction = state.tr;
  const pos = state.selection.from;

  view.focus();
  tr.deleteSelection();

  return handleFilesImport(uniqueId, view, pos, files, {
    replaceSelection: true
  });
}

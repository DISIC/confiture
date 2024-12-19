import { Extension } from "@tiptap/core";
import { Plugin, Transaction } from "@tiptap/pm/state";

export interface AraTiptapExtensionOptions {
  uniqueId: string;
}

/**
 * Link title plugin
 *
 * The placeholder is an image blob (local to browser), with 50% opacity.
 * Within ProseMirror it’s a Decoration.
 */
const linkTitlePlugin = new Plugin({
  appendTransaction: (
    transactions: readonly Transaction[],
    oldState,
    newState
  ) => {
    const tr = newState.tr;

    newState.doc.descendants((node, pos) => {
      if (node.marks.length > 0) {
        node.marks.forEach((mark) => {
          const newAttrs = {
            ...mark.attrs,
            title: node.text + " - nouvelle fenêtre"
          };
          tr.removeMark(pos, pos + node.nodeSize, mark.type);
          tr.addMark(pos, pos + node.nodeSize, mark.type.create(newAttrs));
        });
      }
    });

    return tr;
  }
});

/**
 * Extension AraTiptapExtension
 *
 * Tiptap extension for Ara specificities
 * @see https://github.com/ProseMirror/prosemirror-dropcursor
 */
export const AraTiptapExtension = Extension.create<AraTiptapExtensionOptions>({
  name: "ara",
  addProseMirrorPlugins() {
    return [linkTitlePlugin];
  },
  extendNodeSchema() {
    return {
      image: {
        marks: "_"
      }
    };
  }
});

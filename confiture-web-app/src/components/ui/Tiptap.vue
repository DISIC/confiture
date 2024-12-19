<script lang="ts" setup>
import { mergeAttributes } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import DropCursor from "@tiptap/extension-dropcursor";
import { Heading, type Level } from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import { Image as ImageExtension } from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import StarterKit from "@tiptap/starter-kit";
import { Editor, EditorContent, useEditor } from "@tiptap/vue-3";
import css from "highlight.js/lib/languages/css";
import js from "highlight.js/lib/languages/javascript";
import ts from "highlight.js/lib/languages/typescript";
import html from "highlight.js/lib/languages/xml";
// load common languages
import { common, createLowlight } from "lowlight";
import { Markdown } from "tiptap-markdown";
import { computed, onBeforeUnmount, onMounted, ref, ShallowRef } from "vue";
import { useRoute } from "vue-router";

import { useNotifications } from "../../composables/useNotifications";
import { AraTiptapExtension } from "../../tiptap/AraTiptapExtension";
import {
  ImageUploadTiptapExtension,
  insertFilesAtSelection
} from "../../tiptap/ImageUploadTiptapExtension";
import TiptapButton from "./TiptapButton.vue";

const HEADINGS_LEVELS = [2, 3, 4, 5, 6] as Array<Level>;
const displayedHeadings = computed(() => HEADINGS_LEVELS.slice(0, 3));

// create a lowlight instance
const lowlight = createLowlight(common);

// you can also register languages
lowlight.register("html", html);
lowlight.register("css", css);
lowlight.register("js", js);
lowlight.register("ts", ts);

const route = useRoute();
const notify = useNotifications();

const props = defineProps<{
  content: string;
  labelledBy: string;
}>();
const emit = defineEmits(["update:content"]);

const uniqueId = computed(() => route.params.uniqueId as string);

function getContent() {
  let jsonContent;
  try {
    jsonContent = JSON.parse(props.content);
  } catch {
    jsonContent = props.content;
  }

  return jsonContent;
}

const editor = useEditor({
  editorProps: {
    attributes: {
      "aria-labelledby": props.labelledBy,
      "aria-describedby": "tiptap-description",
      rows: "10",
      "aria-multiline": "true",
      role: "textbox"
    }
  },
  content: getContent(),
  extensions: [
    Heading.extend({
      // prevent all marks from being applied to headings
      marks: ""
    }).configure({
      levels: HEADINGS_LEVELS
    }),
    StarterKit.configure({
      codeBlock: false,
      dropcursor: false,
      heading: false
    }),
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: "html" }),
    DropCursor.configure({ color: "var(--dsfr-outline)", width: 3 }),
    Highlight,
    Link.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          class: {
            default: null,
            renderHTML: () => {
              return { class: null }; // reset class when copy pasting for example
            }
          },
          title: {
            default: null,
            renderHTML: (attributes) => {
              return {
                title: attributes.title
              };
            }
          }
        };
      },
      renderHTML({ HTMLAttributes }) {
        return ["a", mergeAttributes(HTMLAttributes), 0];
      }
    }).configure({
      openOnClick: false,
      defaultProtocol: "https"
    }),
    Markdown,
    TaskItem,
    TaskList,
    ImageExtension.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          width: {
            default: "0"
          },
          height: {
            default: "0"
          }
        };
      }
    }).configure({ inline: false }),
    ImageUploadTiptapExtension.configure({
      uniqueId: uniqueId.value
    }),
    AraTiptapExtension,
    Typography.configure({
      openDoubleQuote: "« ",
      closeDoubleQuote: " »"
    })
  ],
  onUpdate({ editor }) {
    // The content has changed.
    emit("update:content", JSON.stringify(editor.getJSON()));
  }
}) as ShallowRef<Editor>;

const browseInput = ref<InstanceType<typeof HTMLInputElement>>();
onMounted(() => {
  browseInput.value?.addEventListener(
    "change",
    (e) => {
      const inputElement = e?.target as HTMLInputElement;
      const files = inputElement.files!;
      insertFilesAtSelection(uniqueId.value, editor.value, files);
    },
    false
  );
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

function setLink() {
  const previousUrl = editor.value.getAttributes("link").href;
  const url = window.prompt("URL", previousUrl);

  // cancelled
  if (url === null) {
    return;
  }

  // empty
  if (url === "") {
    editor.value.chain().focus().extendMarkRange("link").unsetLink().run();

    return;
  }

  // update link
  editor.value
    .chain()
    .focus()
    .extendMarkRange("link")
    .setLink({ href: url })
    .run();
}

function onImageAdd() {
  browseInput.value?.click();
}
</script>

<template>
  <div class="tiptap-container">
    <p id="tiptap-description" class="fr-sr-only">
      Éditeur de texte riche, vous pouvez utiliser le format Markdown ou bien
      utiliser les raccourcis clavier.
    </p>
    <editor-content :editor="editor" />
    <ul class="tiptap-buttons">
      <li>
        <ul>
          <li>
            <TiptapButton
              label="Mettre en gras"
              switch-off-label="Retirer le gras"
              icon="bold"
              :is-toggle="true"
              :disabled="!editor?.can().toggleBold()"
              :pressed="editor?.isActive('bold')"
              @click="editor.chain().focus().toggleBold().run()"
            />
          </li>
          <li>
            <TiptapButton
              label="Mettre en italique"
              switch-off-label="Retirer l’italique"
              icon="italic"
              :is-toggle="true"
              :disabled="!editor?.can().toggleItalic()"
              :pressed="editor?.isActive('italic')"
              @click="editor.chain().focus().toggleItalic().run()"
            />
          </li>
          <li>
            <TiptapButton
              label="Barrer le texte"
              switch-off-label="Ne pas barrer le texte"
              icon="strikethrough"
              :is-toggle="true"
              :disabled="!editor?.can().toggleStrike()"
              :pressed="editor?.isActive('strike')"
              @click="editor.chain().focus().toggleStrike().run()"
            />
          </li>
          <li v-for="(hLevel, i) in displayedHeadings" :key="i">
            <TiptapButton
              :label="`Passer en titre de niveau ${i + 1}`"
              :switch-off-label="`Retirer le niveau de titre ${i + 1}`"
              :icon="`h-${i + 1}`"
              :is-toggle="true"
              :disabled="
                !editor?.can().toggleHeading({ level: hLevel as Level })
              "
              :pressed="editor?.isActive('heading', { level: hLevel })"
              @click="
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: hLevel as Level })
                  .run()
              "
            />
          </li>
        </ul>
      </li>
      <li>
        <ul>
          <li>
            <TiptapButton
              label="Ajouter un lien"
              switch-off-label="Éditer le lien"
              icon="link"
              :is-toggle="true"
              :disabled="!editor?.can().setLink({ href: 'test' })"
              :pressed="editor?.isActive('link')"
              @click="setLink"
            />
          </li>
        </ul>
      </li>
      <li>
        <ul>
          <li>
            <TiptapButton
              label="Passer en liste non ordonnée"
              switch-off-label="Retirer les puces de liste"
              icon="list-unordered"
              :is-toggle="true"
              :disabled="
                !editor?.can().toggleBulletList() &&
                !editor?.can().toggleOrderedList()
              "
              :pressed="editor?.isActive('bulletList')"
              @click="editor.chain().focus().toggleBulletList().run()"
            />
          </li>
          <li>
            <TiptapButton
              label="Passer en liste ordonnée"
              switch-off-label="Retirer les numéros de liste"
              icon="list-ordered"
              :is-toggle="true"
              :disabled="
                !editor?.can().toggleBulletList() &&
                !editor?.can().toggleOrderedList()
              "
              :pressed="editor?.isActive('orderedList')"
              @click="editor.chain().focus().toggleOrderedList().run()"
            />
          </li>
        </ul>
      </li>
      <li>
        <ul>
          <li>
            <TiptapButton
              label="Définir comme passage de code"
              switch-off-label="Ne pas définir comme passage de code"
              icon="code-view"
              :is-toggle="true"
              :disabled="!editor?.can().toggleCode()"
              :pressed="editor?.isActive('code')"
              @click="editor.chain().focus().toggleCode().run()"
            />
          </li>
          <li>
            <TiptapButton
              label="Définir comme bloc de code"
              switch-off-label="Ne pas définir comme bloc de code"
              icon="code-block"
              :is-toggle="true"
              :disabled="!editor?.can().toggleCodeBlock()"
              :pressed="editor?.isActive('codeBlock')"
              @click="editor.chain().focus().toggleCodeBlock().run()"
            />
          </li>
        </ul>
      </li>
      <li>
        <TiptapButton
          label="Insérer une image"
          icon="image-add-line"
          :label-visible="true"
          @click="onImageAdd"
        />
        <input
          id="tiptap-browse-input"
          ref="browseInput"
          type="file"
          class="fr-hidden"
          hidden
          multiple
        />
      </li>
    </ul>
  </div>
</template>

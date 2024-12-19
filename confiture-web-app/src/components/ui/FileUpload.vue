<script lang="ts" setup>
import { computed, Ref, ref } from "vue";

import { useIsOffline } from "../../composables/useIsOffline";
import { useUniqueId } from "../../composables/useUniqueId";
import { FileErrorMessage, Limitations } from "../../enums";
import { AuditFile } from "../../types";
import { formatBytes, getUploadUrl } from "../../utils";

export interface Props {
  acceptedFormats?: Array<string>;
  auditFiles: AuditFile[];
  errorMessage?: FileErrorMessage | string | null;
  maxFileSize?: string;
  multiple?: boolean;
  readonly?: boolean;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  acceptedFormats: undefined,
  boldTitle: false,
  errorMessage: null,
  errorMessageTitle: null,
  maxFileSize: "2 Mo",
  multiple: false,
  readonly: false,
  title: "Ajouter un fichier"
});

const emit = defineEmits<{
  (e: "upload-file", payload: File): void;
  (e: "delete-file", payload: AuditFile): void;
}>();

defineExpose({ onFileRequestFinished });

const localErrorMessage: Ref<FileErrorMessage | null> = ref(null);

const id = useUniqueId();
const isOffline = useIsOffline();
const fileInputRef = ref<HTMLInputElement>();

const selectedFiles = computed(() => {
  const len = props.auditFiles.length;
  if (len === 0) {
    return "Aucun fichier ajouté.";
  } else if (len === 1) {
    return `${len} fichier ajouté.`;
  } else {
    return `${len} fichiers ajoutés.`;
  }
});

const acceptedFormatsHtml = computed(() => {
  if (!props.acceptedFormats) {
    return "Tous les formats sont pris en compte";
  } else {
    return "Fichiers supportés&#8239;: " + props.acceptedFormats.join(", ");
  }
});

const acceptedFormatsAttr = computed(() => {
  if (!props.acceptedFormats) {
    return undefined;
  } else {
    return props.acceptedFormats.map((e) => `.${e}`).join(",");
  }
});

function handleFileChange() {
  if (fileInputRef.value?.files && fileInputRef.value?.files[0]) {
    const file = fileInputRef.value?.files[0];
    if (file.size > Limitations.FILE_SIZE) {
      localErrorMessage.value = FileErrorMessage.UPLOAD_SIZE;
      return;
    }
    emit("upload-file", file);
    fileInputRef.value.value = "";
  }
}

function deleteFile(file: AuditFile) {
  emit("delete-file", file);
}

function getFileName(auditFile: AuditFile) {
  return auditFile.originalFilename;
}

function getFullFileName(auditFile: AuditFile) {
  return getFileName(auditFile) + " (" + getFileDetails(auditFile) + ")";
}

function getFileDetails(auditFile: AuditFile) {
  const name = auditFile.originalFilename;
  const extension = name.substring(name.lastIndexOf(".") + 1).toUpperCase();
  return extension + " – " + formatBytes(auditFile.size);
}

function isViewable(auditFile: AuditFile) {
  return (
    auditFile.mimetype.startsWith("image") || auditFile.mimetype.includes("pdf")
  );
}

function onFileRequestFinished() {
  localErrorMessage.value = null;
}
</script>

<template>
  <div>
    <div class="upload-wrapper">
      <div v-if="!readonly" class="fr-upload-group">
        <p
          :id="`file-upload-description-${id}`"
          class="fr-label fr-upload-group__desc"
        >
          {{ title }}
        </p>
        <p class="fr-text--regular fr-hint-text fr-my-2v">
          Taille maximale par fichier&#8239;: {{ maxFileSize }}.
          <span v-html="acceptedFormatsHtml"></span>
          <template v-if="multiple">. Plusieurs fichiers possibles.</template>
        </p>

        <!-- TODO: handle multiple files upload -->
        <!-- :multiple="multiple ?? undefined" -->
        <label
          class="upload-btn fr-btn fr-btn--tertiary"
          tabindex="0"
          :for="`file-upload-${id}`"
          >Choisir un fichier</label
        >
        <input
          :id="`file-upload-${id}`"
          ref="fileInputRef"
          class="fr-sr-only"
          tabindex="-1"
          type="file"
          :accept="acceptedFormatsAttr"
          :disabled="isOffline"
          :aria-describedby="`file-upload-description-${id} file-upload-error-format-${id} file-upload-error-size-${id}`"
          @change="handleFileChange"
        />
        <p class="fr-text--sm fr-mt-3v fr-mb-2v">{{ selectedFiles }}</p>
      </div>

      <p
        v-if="errorMessage || localErrorMessage"
        :id="`file-upload-error-format-${id}`"
        class="fr-error-text fr-mt-0"
      >
        {{ errorMessage ? errorMessage : localErrorMessage }}
      </p>
    </div>

    <!-- Audit files -->
    <ul class="files">
      <li v-for="auditFile in auditFiles" :key="auditFile.id">
        <img
          v-if="auditFile.thumbnailKey"
          class="fr-icon--lg file-thumbnail"
          :src="getUploadUrl(auditFile.thumbnailKey)"
          alt=""
          loading="lazy"
          width="80"
          height="80"
        />
        <span
          v-else
          class="fr-icon--lg file-thumbnail__default fr-icon-file-text-line"
          loading="lazy"
        >
        </span>
        <div class="file-link">
          <span>{{ getFileName(auditFile) }}</span
          ><br />
          <span class="fr-hint-text">{{ getFileDetails(auditFile) }}</span>
        </div>
        <ul class="fr-btns-group fr-btns-group--inline">
          <li v-if="isViewable(auditFile)">
            <a
              class="fr-btn fr-btn fr-btn--tertiary-no-outline fr-icon-eye-line fr-mb-0"
              :href="getUploadUrl(auditFile.key)"
              :disabled="isOffline"
              target="_blank"
              :title="
                'Voir ' + getFullFileName(auditFile) + ' - nouvelle fenêtre'
              "
            >
              Voir
              <span class="sr-only">{{ getFullFileName(auditFile) }}</span>
            </a>
          </li>
          <li>
            <a
              class="fr-btn fr-btn--tertiary-no-outline fr-icon-download-line fr-mb-0"
              download
              :href="getUploadUrl(auditFile.key)"
              :disabled="isOffline"
              :title="'Télécharger ' + getFullFileName(auditFile)"
            >
              Télécharger
              <span class="sr-only">{{ getFullFileName(auditFile) }}</span>
            </a>
          </li>
          <li v-if="!readonly">
            <button
              class="fr-btn fr-btn--tertiary-no-outline fr-icon-delete-bin-line fr-mb-0"
              :disabled="isOffline"
              :title="'Supprimer ' + getFullFileName(auditFile)"
              @click="deleteFile(auditFile)"
            >
              Supprimer
              <span class="sr-only">{{ getFullFileName(auditFile) }}</span>
            </button>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.fr-upload-group__desc {
  margin: 0;
}

@media (hover: hover) and (pointer: fine) {
  .upload-btn:not(:disabled):hover {
    background-color: var(--hover-tint);
    cursor: pointer;
  }
}

.files {
  padding: 0;
  list-style: bullet;
  width: 39rem; /* 6 columns */
  min-width: 50%;
  max-width: 100%;
}

.files > li {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--artwork-motif-grey);
}

.files > li + li {
  margin-top: 1rem;
}

.file-link {
  flex-basis: 33%;
  flex-grow: 1;
  word-break: break-word;
}

.file-thumbnail,
.file-thumbnail__default {
  --thumbnail-size: 3rem;
  color: var(--artwork-motif-grey);
  background-color: var(--background-alt-blue-france);
  width: var(--thumbnail-size);
  height: var(--thumbnail-size);
  min-width: var(--thumbnail-size);
  min-height: var(--thumbnail-size);
  max-width: 100%;
  object-fit: contain;
}
.file-thumbnail__default {
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--text-label-blue-france);
  background-color: var(--background-alt-blue-france);
}

.file-thumbnail__default::before {
  --icon-size: 2.5rem;
}
</style>

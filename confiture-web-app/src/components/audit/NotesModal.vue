<script lang="ts" setup>
import { debounce } from "lodash-es";
import { computed, Ref, ref } from "vue";
import { useRoute } from "vue-router";

import { useIsOffline } from "../../composables/useIsOffline";
import { FileErrorMessage } from "../../enums";
import { useAuditStore } from "../../store/audit";
import { AuditFile, FileDisplay, StoreName } from "../../types";
import { handleFileDeleteError, handleFileUploadError } from "../../utils";
import DsfrModal from "../ui/DsfrModal.vue";
import FileUpload from "../ui/FileUpload.vue";
import Tiptap from "../ui/Tiptap.vue";
import MarkdownHelpButton from "./MarkdownHelpButton.vue";
import SaveIndicator from "./SaveIndicator.vue";

defineProps<{
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: "closed"): void;
  (e: "confirm", payload: string): void;
}>();

defineExpose({
  show: () => modal.value?.show(),
  hide: () => modal.value?.hide()
});

const errorMessage: Ref<FileErrorMessage | string | null> = ref(null);
const fileUpload = ref<InstanceType<typeof FileUpload>>();

const auditStore = useAuditStore();
const route = useRoute();

const modal = ref<InstanceType<typeof DsfrModal>>();
const isOffline = useIsOffline();

const notes = ref(auditStore.currentAudit?.notes || "");

const uniqueId = computed(() => route.params.uniqueId as string);
const files = computed(
  () =>
    auditStore.currentAudit?.notesFiles?.filter(
      (e) => e.display === FileDisplay.ATTACHMENT
    ) || []
);

const handleNotesChange = debounce((notesContent: string) => {
  notes.value = notesContent;
  emit("confirm", notes.value);
}, 500);

function handleUploadFile(file: File) {
  auditStore
    .uploadAuditFile(uniqueId.value, file)
    .then(() => {
      errorMessage.value = null;
    })
    .catch(async (error) => {
      errorMessage.value = await handleFileUploadError(error);
    })
    .finally(() => {
      fileUpload.value?.onFileRequestFinished();
    });
}

function handleDeleteFile(file: AuditFile) {
  auditStore
    .deleteAuditFile(uniqueId.value, file.id)
    .then(() => {
      errorMessage.value = null;
    })
    .catch(async (error) => {
      errorMessage.value = await handleFileDeleteError(error);
    })
    .finally(() => {
      fileUpload.value?.onFileRequestFinished();
    });
}
</script>

<template>
  <DsfrModal
    id="notes-modal"
    ref="modal"
    aria-labelledby="notes-modal-title"
    :is-sidebar="true"
    @closed="$emit('closed')"
  >
    <form class="fr-container fr-container--fluid" @submit.prevent>
      <div class="fr-grid-row">
        <div class="fr-col-12 sidebar-col">
          <div class="fr-modal__body">
            <div class="fr-modal__content">
              <div class="sidebar-header">
                <button
                  class="fr-btn--close fr-btn fr-text--md"
                  aria-controls="notes-modal"
                  type="button"
                >
                  Fermer
                </button>
                <div class="title-container">
                  <h1 id="notes-modal-title" class="fr-modal__title">
                    Annotations de l’audit
                  </h1>
                  <SaveIndicator :store-name="StoreName.AUDIT_STORE" />
                </div>
              </div>
              <div class="fr-input-group fr-mb-1v">
                <label id="audit-notes-label" class="fr-label">
                  Remarques et recommandations générales
                </label>
                <tiptap
                  :content="notes"
                  labelled-by="audit-notes-label"
                  :disabled="isOffline"
                  @update:content="handleNotesChange"
                />
              </div>
              <MarkdownHelpButton
                :id="`markdown-notice-notes`"
                class="fr-mb-4w"
              />
              <!-- FILE -->
              <FileUpload
                ref="fileUpload"
                class="fr-mb-4w"
                :audit-files="files"
                :disabled="isOffline"
                :error-message="errorMessage"
                :multiple="true"
                @upload-file="handleUploadFile"
                @delete-file="handleDeleteFile"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  </DsfrModal>
</template>

<style scoped>
.fr-modal__content {
  padding-left: 3rem;
  padding-right: 3rem;
}
.sidebar-header {
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  column-gap: 1rem;
  align-items: center;
  margin: 0 -3rem 1.5rem -3rem;
  padding: 2rem 3rem 0.75rem;
  position: sticky;
  top: 0;
  z-index: 9;
  background-color: var(--background-lifted-grey);
}
.sidebar-header h1 {
  margin-bottom: 0;
  padding-right: 1rem;
  margin-right: 1rem;
}
.title-container {
  flex-basis: 100%;
  flex-grow: 1;
}

label {
  margin-bottom: 1rem;
}

@media (min-width: 36em) {
  .title-container {
    display: flex;
    flex-basis: auto;
    align-items: center;
  }
  .sidebar-header h1 {
    border-right: 1px solid var(--border-default-grey);
  }
}
</style>

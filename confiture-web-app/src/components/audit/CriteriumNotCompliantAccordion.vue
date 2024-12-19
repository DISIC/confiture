<script setup lang="ts">
import { ref } from "vue";

import { useIsOffline } from "../../composables/useIsOffline";
import { FileErrorMessage } from "../../enums";
import { AuditFile, CriterionResultUserImpact } from "../../types";
import { formatUserImpact } from "../../utils";
import FileUpload from "../ui/FileUpload.vue";
import { RadioColor } from "../ui/Radio.vue";
import RadioGroup from "../ui/RadioGroup.vue";
import LazyAccordion from "./LazyAccordion.vue";
import MarkdownHelpButton from "./MarkdownHelpButton.vue";

export interface Props {
  id: string;
  comment: string | null;
  errorMessage?: FileErrorMessage | string | null;
  exampleImages: AuditFile[];
  quickWin?: boolean;
  userImpact: CriterionResultUserImpact | null;
}

withDefaults(defineProps<Props>(), {
  errorMessage: null
});

const emit = defineEmits<{
  (e: "update:comment", payload: string): void;
  (e: "update:userImpact", payload: CriterionResultUserImpact | null): void;
  (e: "upload-file", payload: File): void;
  (e: "delete-file", payload: AuditFile): void;
  (e: "update:quickWin", payload: boolean): void;
}>();

defineExpose({ onFileRequestFinished, disclose });

const userImpacts: Array<{
  label: string;
  value: CriterionResultUserImpact;
  color?: RadioColor;
}> = [
  {
    value: CriterionResultUserImpact.MINOR,
    label: formatUserImpact(CriterionResultUserImpact.MINOR),
    color: RadioColor.GREY
  },
  {
    value: CriterionResultUserImpact.MAJOR,
    label: formatUserImpact(CriterionResultUserImpact.MAJOR),
    color: RadioColor.YELLOW
  },
  {
    value: CriterionResultUserImpact.BLOCKING,
    label: formatUserImpact(CriterionResultUserImpact.BLOCKING),
    color: RadioColor.RED
  }
];

const isOffline = useIsOffline();

const fileUpload = ref<InstanceType<typeof FileUpload>>();

function handleUploadFile(image: File) {
  emit("upload-file", image);
}

function handleDeleteFile(image: AuditFile) {
  emit("delete-file", image);
}

function onFileRequestFinished() {
  fileUpload.value?.onFileRequestFinished();
}

const lazyAccordionRef = ref<InstanceType<typeof LazyAccordion>>();
const commentFieldRef = ref<HTMLTextAreaElement>();

let hasJustBeenSetAsNotCompliant = false;

async function disclose() {
  const accordion = lazyAccordionRef.value?.accordionRef;

  hasJustBeenSetAsNotCompliant = true;
  dsfr(accordion).accordionsGroup.members[0].disclose();
}

function lazyAccordionOpened() {
  if (!hasJustBeenSetAsNotCompliant) {
    return;
  }

  commentFieldRef.value?.focus();
  hasJustBeenSetAsNotCompliant = false;
}

const title = "Erreur et recommandation";
</script>

<template>
  <LazyAccordion
    ref="lazyAccordionRef"
    :title="title"
    disclose-color="var(--background-default-grey)"
    @opened="lazyAccordionOpened"
  >
    <!-- COMMENT -->
    <div class="fr-input-group fr-mb-1w">
      <label class="fr-label" :for="`criterum-comment-field-${id}`">
        {{ title }}
      </label>
      <textarea
        :id="`criterum-comment-field-${id}`"
        ref="commentFieldRef"
        :value="comment ?? ''"
        class="fr-input"
        rows="5"
        :disabled="isOffline"
        :aria-describedby="`markdown-notice-${id}`"
        @input="
          $emit('update:comment', ($event.target as HTMLTextAreaElement).value)
        "
      ></textarea>
    </div>

    <MarkdownHelpButton :id="`markdown-notice-${id}`" class="fr-mb-4w" />

    <!-- FILE -->
    <FileUpload
      ref="fileUpload"
      class="fr-mb-4w"
      :accepted-formats="['jpg', 'jpeg', 'png']"
      :audit-files="exampleImages"
      :disabled="isOffline"
      :multiple="true"
      :error-message="errorMessage"
      title="Ajouter des images d’exemple"
      @delete-file="handleDeleteFile"
      @upload-file="handleUploadFile"
    />

    <!-- USER IMPACT -->
    <RadioGroup
      class="fr-mb-4w"
      :model-value="userImpact"
      :items="userImpacts"
      label="Impact sur l’usager"
      :default-value="null"
      :disabled="isOffline"
      @update:model-value="$emit('update:userImpact', $event)"
    />

    <!-- QUICK WIN -->
    <div class="fr-fieldset__element fr-fieldset__element--inline">
      <div class="fr-checkbox-group">
        <input
          :id="`criterium-quick-win-${id}`"
          :checked="quickWin"
          type="checkbox"
          @input="
            $emit(
              'update:quickWin',
              ($event.target as HTMLInputElement).checked
            )
          "
        />
        <label class="fr-label" :for="`criterium-quick-win-${id}`">
          Facile à corriger
        </label>
      </div>
    </div>
  </LazyAccordion>
</template>

<style scoped>
.markdown-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-impact-container {
  border: none;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
</style>

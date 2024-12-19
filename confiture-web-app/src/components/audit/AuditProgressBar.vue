<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  value: number;
  label?: string;
  isLarge?: boolean;
}>();

/**
 * TODO:
 * - Refactor component
 */

const progressPercentage = computed(() => {
  const percentage = props.value * 100;
  const rounded = Math.round(percentage);

  // Only return 100% when the progress is actually 100%, 99.99% would return 99%
  if (rounded === 100 && percentage !== 100) {
    return 99;
  }

  return rounded;
});
const progressBarValue = computed(() => props.value * 100 + "%");
</script>

<template>
  <div :class="['audit-progress', { 'audit-progress--thick': isLarge }]">
    <span v-if="label" class="audit-progress-label">{{ label }}</span
    ><span
      :class="[
        'fr-text--xs fr-text--action-high-grey fr-m-0 audit-progress-percentage',
        { 'fr-text--sm': isLarge }
      ]"
    >
      {{ progressPercentage }}%
    </span>
    <div class="audit-progress-bar" />
  </div>
</template>

<style scoped>
.audit-progress-bar {
  background-color: var(--background-contrast-grey);
  position: relative;
  grid-column: 1 / -1;
}

.audit-progress {
  background: none;
  display: grid;
  gap: 0.25rem 1rem;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto 0.25rem;
}

.audit-progress--thick {
  gap: 0.75rem 0;
  grid-template-rows: auto 0.75rem;
}

.audit-progress-bar::after {
  background-color: var(--background-flat-success);
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  transition: width 1s ease;
  width: v-bind(progressBarValue);
}

.audit-progress-label {
  font-weight: 500;
}

.audit-progress-percentage {
  color: var(--text-mention-grey);
  align-self: end;
}
</style>

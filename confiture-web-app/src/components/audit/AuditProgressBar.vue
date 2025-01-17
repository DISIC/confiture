<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  value: number;
  label: string;
  size: number; // value in px
  inline?: boolean;
}>();

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
const progressBarSize = computed(() => `${props.size / 16}rem`);
</script>

<template>
  <div :class="['audit-progress', { 'audit-progress--inline': inline }]">
    <span :class="['audit-progress-label', { 'fr-sr-only': inline }]">
      {{ label }}
    </span>
    <span
      :class="[
        ' fr-text--action-high-grey fr-m-0 audit-progress-percentage',
        {
          'fr-text--xs': !inline
        }
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
  gap: v-bind(progressBarSize) 1rem;
  grid-template-columns: 1fr 4ch;
  grid-template-rows: auto v-bind(progressBarSize);
}

.audit-progress--inline {
  grid-template-rows: v-bind(progressBarSize);
  gap: 0 1rem;

  .audit-progress-bar {
    height: v-bind(progressBarSize);
    grid-column: 1 / span 1;
  }

  .audit-progress-percentage {
    grid-column: 2;
    grid-row: 1;
    align-self: center;
  }
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
  text-align: end;
}
</style>

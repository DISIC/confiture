<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useUniqueId } from "../../composables/useUniqueId";

defineProps<{
  title: string;
  buttonProps?: object;
  alignLeft?: boolean;
  iconLeft?: boolean;
  disabled?: boolean;
}>();

const uniqueId = useUniqueId();

const showContent = ref(false);
const buttonRef = ref<HTMLButtonElement>();
const containerRef = ref<HTMLDivElement>();

function toggleOptions() {
  showContent.value = !showContent.value;
}

function closeOptions() {
  showContent.value = false;
  buttonRef.value?.focus();
}

// Close the dropdown if click is outside the dropdown container or if the clicked element is a button or link.
function handleWindowClick(e: MouseEvent) {
  if (!containerRef.value?.contains(e.target as HTMLElement)) {
    // Click outside of container
    showContent.value = false;
  } else {
    // Click inside container, check if clicked element is an interactive element other than the trigger button
    const { nodeName } = e.target as HTMLElement;
    if (
      e.target !== buttonRef.value &&
      (nodeName === "BUTTON" || nodeName === "A")
    ) {
      showContent.value = false;
      buttonRef.value?.focus();
    }
  }
}

watch(showContent, () => {
  if (showContent.value) {
    window.addEventListener("click", handleWindowClick);
  } else {
    window.removeEventListener("click", handleWindowClick);
  }
});

const route = useRoute();

// Close dropdown when changing route
watch(route, () => {
  if (showContent.value) {
    showContent.value = false;
  }
});

defineExpose({ buttonRef, closeOptions });
</script>

<template>
  <div
    ref="containerRef"
    class="dropdown-container"
    @keydown.esc="closeOptions"
  >
    <slot name="button" />
    <button
      ref="buttonRef"
      class="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-down-s-line"
      :class="[iconLeft ? 'fr-btn--icon-left' : 'fr-btn--icon-right']"
      aria-haspopup="true"
      :aria-expanded="showContent"
      :aria-controls="`dropdown-${uniqueId}`"
      :disabled="disabled"
      v-bind="buttonProps"
      @click="toggleOptions"
    >
      {{ title }}
    </button>
    <div
      :id="`dropdown-${uniqueId}`"
      :hidden="!showContent"
      :class="[
        'fr-p-2w dropdown-content',
        { 'dropdown-content-left': alignLeft }
      ]"
      role="menu"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.dropdown-container {
  position: relative;
  z-index: 2;
}

.dropdown-content {
  background: var(--background-default-grey);
  filter: drop-shadow(var(--lifted-shadow));
  position: absolute;
  top: 100%;
  right: 0;
  width: max-content;
}

.dropdown-content-left {
  left: 0;
  right: initial;
}

.dropdown-content :deep(.dropdown-list) {
  display: flex;
  flex-direction: column;
  list-style: none;
}

.dropdown-content :deep(.dropdown-separator) {
  background-color: var(--border-default-grey);
  height: 1px;
  margin: 0.75rem 0;
  padding: 0;
}

.dropdown-content :deep(.dropdown-item) {
  padding-bottom: 0;
}

/* Transition */
.v-enter-active,
.v-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

/* Make actions hover full width */
.dropdown-content :deep(.dropdown-item > a),
.dropdown-content :deep(.dropdown-item > button) {
  width: 100%;
}

/* Custom `.fr-btn` with sub text */
.dropdown-content :deep(.dropdown-item--with-meta > a),
.dropdown-content :deep(.dropdown-item--with-meta > button) {
  display: grid;
  grid-template-columns: auto 1fr;
  justify-items: start;
}

.dropdown-content :deep(.dropdown-item-meta) {
  grid-column: 1 / -1;
  color: var(--text-mention-grey);
  text-align: initial;
}
</style>

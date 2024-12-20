<!--
  This component is only used to replicate DSFR tabs with sticky functionality.
  For tabs that have no sticky needs, please use `fr-tabs` instead of this component.
  https://www.systeme-de-design.gouv.fr/elements-d-interface/composants/onglet
 -->

<script setup lang="ts" generic="T">
import { ref, watch } from "vue";

import { useUniqueId } from "../../composables/useUniqueId";
import LayoutIcon from "../icons/LayoutIcon.vue";

const props = defineProps<{
  tabs: { label: string; data: T }[];
  stickyTop: string;
}>();

defineSlots<{
  panel(props: { i: number; data: T }): void;
}>();

const emit = defineEmits<{
  (e: "change", currentTab: number): void;
}>();

const uniqueId = useUniqueId();
const tabId = (i: number) => "tab-" + uniqueId.value + "-" + i;
const panelId = (i: number) => "panel-" + uniqueId.value + "-" + i;

const currentTab = ref(0);
const tabControlRefs = ref<HTMLButtonElement[]>();

const selectNextTab = () => {
  currentTab.value = (currentTab.value + 1) % props.tabs.length;
  tabControlRefs.value?.at(currentTab.value)?.focus();
};

const selectPreviousTab = () => {
  if (currentTab.value === 0) {
    currentTab.value = props.tabs.length - 1;
  } else {
    currentTab.value -= 1;
  }
  tabControlRefs.value?.at(currentTab.value)?.focus();
};

const selectFirstTab = () => {
  currentTab.value = 0;
  tabControlRefs.value?.at(currentTab.value)?.focus();
};

const selectLastTab = () => {
  currentTab.value = props.tabs.length - 1;
  tabControlRefs.value?.at(currentTab.value)?.focus();
};

watch(currentTab, (currentTab) => {
  emit("change", currentTab);
});
</script>

<!--
  TODO:
  - ajouter une shadow quand les onglets sont scrollables
-->

<template>
  <div class="tabs-wrapper" :style="{ '--tabs-top-offset': stickyTop }">
    <ul role="tablist" class="tabs">
      <li v-for="(tab, i) in tabs" :key="i">
        <button
          :id="tabId(i)"
          ref="tabControlRefs"
          role="tab"
          :aria-controls="panelId(i)"
          :aria-selected="i === currentTab ? 'true' : 'false'"
          :tabindex="i === currentTab ? undefined : '-1'"
          @click="currentTab = i"
          @keydown.right.down.prevent="selectNextTab"
          @keydown.left.up.prevent="selectPreviousTab"
          @keydown.home.prevent="selectFirstTab"
          @keydown.end.prevent="selectLastTab"
        >
          <LayoutIcon v-if="i === 0" class="fr-mr-2v" />{{ tab.label }}
        </button>
      </li>
    </ul>
  </div>
  <div class="panel-container">
    <template v-for="(tab, i) in tabs" :key="i">
      <div
        :id="panelId(i)"
        :aria-labelledby="tabId(i)"
        :class="{ visible: i === currentTab }"
        role="tabpanel"
        tabindex="0"
      >
        <slot v-if="i === currentTab" name="panel" :data="tab.data" :i="i" />
      </div>
    </template>
  </div>
</template>

<style scoped>
/* The styles are mostly copy-pasted from the DSFR tabs component. */
.tabs-wrapper {
  background-color: var(--background-default-grey);
  z-index: 2;
  position: sticky;
  top: var(--tabs-top-offset, 4rem);
}

.tabs-wrapper::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: var(--border-default-grey);
}

.tabs {
  margin: 0;

  display: flex;
  gap: 0.25rem;
  list-style: none;

  padding: 0;
  overflow-x: auto;
}

li {
  padding: 0;
}

.tabs button {
  --text-spacing: 0;
  --title-spacing: 0;
  --underline-img: none;
  --hover-tint: var(--hover);
  align-items: center;
  display: inline-flex;
  flex-direction: row;
  font-size: 1rem;
  font-weight: 700;
  height: 100%;
  line-height: 1.5rem;
  min-height: 2.5rem;
  overflow: visible;
  padding: 0.5rem 1rem;
  position: relative;
  white-space: nowrap;
  width: -moz-fit-content;
  width: fit-content;
  z-index: 1;
}

.tabs button:hover {
  background-color: var(--hover-tint);
}

.tabs button:active {
  background-color: var(--active-tint);
}

.tabs button:focus-visible {
  outline: 2px solid var(--dsfr-outline);
  outline-offset: -2px;
}

[aria-selected="true"] {
  --idle: transparent;
  --hover: var(--background-default-grey-hover);
  --active: var(--background-default-grey-active);
  background-color: var(--background-default-grey);
  color: var(--text-active-blue-france);

  border: 1px solid var(--border-default-grey);
  border-bottom-color: transparent;
  position: relative;
}

[aria-selected="true"]::after {
  content: "";
  left: -1px;
  top: -1px;
  right: -1px;
  height: 2px;
  background-color: var(--text-active-blue-france);
  position: absolute;
  z-index: 1;
}

[aria-selected="false"] {
  --idle: transparent;
  --hover: var(--background-action-low-blue-france-hover);
  --active: var(--background-action-low-blue-france-active);
  background-color: var(--background-action-low-blue-france);
  color: var(--text-action-high-grey);
  border: 1px solid transparent;
  border-bottom-color: var(--border-default-grey);
}

[role="tabpanel"]:not(.visible) {
  display: none;
}

.panel-container {
  border: 1px solid var(--border-default-grey);
  border-top: none;
  padding: 2rem;
}
</style>

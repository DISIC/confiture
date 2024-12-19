<script lang="ts" setup>
import { computed } from "vue";

export interface Props {
  disabled?: boolean;
  icon: string;
  label: string;
  switchOffLabel?: string;
  labelVisible?: boolean;
  isToggle?: boolean;
  pressed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  labelVisible: false,
  switchOffLabel: undefined,
  isToggle: false,
  pressed: false
});

const isPressed = computed(() => props.pressed);
const title = computed(() =>
  props.pressed === true ? props.switchOffLabel : props.label
);
</script>

<template>
  <button
    :disabled="disabled"
    class="fr-btn fr-btn--tertiary"
    :class="[
      labelVisible ? 'fr-btn--icon-left' : '',
      icon ? 'fr-icon-' + icon : '',
      isToggle ? 'fr-btn--is-toggle' : ''
    ]"
    :aria-pressed="isPressed"
    :title="labelVisible ? '' : title"
  >
    {{ label }}
  </button>
</template>

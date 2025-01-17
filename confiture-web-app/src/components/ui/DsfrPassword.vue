<script lang="ts" setup>
import { computed, ref } from "vue";

const props = defineProps<{
  modelValue?: string;
  label: string;
  hint?: string;
  required?: boolean;
  minLength?: number;
  error?: string;
  id: string;
  autocomplete: "new-password" | "current-password";
  requirements?: string[];
  /** Shows the "forgotten password" link. */
  showForgottenPasswordLink?: boolean;
  /**
   * If set, skip asking for user email and sends the password reset link to
   * the currently signedin email
   */
  skipForgottenPasswordFirstStep?: boolean;
}>();

defineEmits<{
  (e: "update:modelValue", payload: string): void;
}>();

const isError = computed(() => !!props.error);

const inputId = props.id + "-password-input";
const errorId = props.id + "-password-error-message";
const toggleId = props.id + "-password-toggle";
const requirementsId = props.id + "-password-requirements";

const inputRef = ref<HTMLInputElement>();
const toggleRef = ref<HTMLInputElement>();
defineExpose({ inputRef, toggleRef });
</script>

<template>
  <div :class="['fr-password', { 'fr-input-group--error': isError }]">
    <label class="fr-label" :for="inputId">
      {{ label }}
      <span v-if="hint || $slots.hint" class="fr-hint-text">
        <slot name="hint">{{ hint }}</slot>
      </span>
    </label>
    <div class="fr-input-wrap">
      <input
        :id="inputId"
        ref="inputRef"
        :class="['fr-password__input fr-input', { 'fr-input--error': isError }]"
        :aria-describedby="isError ? errorId : requirementsId"
        :autocomplete="autocomplete"
        type="password"
        :required="required"
        :minlength="minLength"
        :value="modelValue"
        @input="
          $emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
      />
    </div>

    <p v-if="isError" :id="errorId" class="fr-error-text">
      {{ error }}
    </p>

    <div
      v-else-if="requirements?.length"
      :id="requirementsId"
      class="fr-messages-group"
      aria-live="assertive"
    >
      <p class="fr-message">Votre mot de passe doit contenir :</p>
      <p
        v-for="requirement in requirements"
        :key="requirement"
        class="fr-message fr-message--info"
      >
        {{ requirement }}
      </p>
    </div>

    <div class="fr-password__checkbox fr-checkbox-group fr-checkbox-group--sm">
      <input
        :id="toggleId"
        ref="toggleRef"
        aria-label="Afficher le mot de passe"
        type="checkbox"
      />
      <label class="fr-password__checkbox fr-label" :for="toggleId">
        Afficher
      </label>
    </div>

    <p v-if="showForgottenPasswordLink" class="fr-m-0">
      <RouterLink
        :to="{
          name: 'password-reset',
          state: { skipFirstStep: skipForgottenPasswordFirstStep }
        }"
        class="fr-link"
      >
        Mot de passe oublié ?
      </RouterLink>
    </p>
  </div>
</template>

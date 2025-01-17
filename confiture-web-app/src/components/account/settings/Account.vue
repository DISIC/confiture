<script lang="ts" setup>
import { HTTPError } from "ky";
import { nextTick, ref } from "vue";
import { useRouter } from "vue-router";

import { useNotifications } from "../../../composables/useNotifications";
import { useAccountStore } from "../../../store/account";
import { captureWithPayloads } from "../../../utils";
import DsfrPassword from "../../ui/DsfrPassword.vue";

const router = useRouter();
const accountStore = useAccountStore();
const notify = useNotifications();

const VALIDATION_STRING = "je confirme vouloir supprimer mon compte";

const validation = ref("");
const password = ref("");

const displayAccountDeletionForm = ref(false);

// Form submission
const validationFieldRef = ref<HTMLInputElement>();
const passwordFieldRef = ref<InstanceType<typeof DsfrPassword>>();
const validationError = ref<string>();
const passwordError = ref<string>();

function validateValidationField() {
  validationError.value = undefined;

  // Empty validation sentence
  if (!validation.value.length) {
    validationError.value =
      "Champ obligatoire. Veuillez saisir la phrase de confirmation";
    validationFieldRef.value?.focus();
    return false;
  }

  // Wrong validation sentence
  if (validation.value !== VALIDATION_STRING) {
    validationError.value =
      "La phrase saisie est incorrect. Veuillez vérifier votre saisie.";
    validationFieldRef.value?.focus();
    return;
  }

  return true;
}

function validatePasswordField() {
  passwordError.value = undefined;

  // Empty password
  if (!password.value.length) {
    passwordError.value =
      "Champ obligatoire. Veuillez saisir votre mot de passe";
    passwordFieldRef.value?.inputRef?.focus();
    return false;
  }

  return true;
}

async function deleteAccount() {
  if (![validatePasswordField(), validateValidationField()].every((i) => i)) {
    // Invalid form
    return;
  }

  accountStore
    .deleteAccount(password.value)
    .then(() => {
      router.push({ name: "account-deletion-feedback" });
    })
    .catch(async (e) => {
      if (e instanceof HTTPError && e.response.status === 401) {
        passwordError.value = "Le mot de passe saisi est incorrect.";
        await nextTick();
        passwordFieldRef.value?.inputRef?.focus();
      } else {
        notify(
          "error",
          "Impossible de supprimer le compte",
          "Une erreur inconnue empêche la suppression du compte. Contactez-nous à l'adresse ara@design.numerique.gouv.fr si le problème persiste."
        );
        captureWithPayloads(e, false);
      }
    });
}

// Toggle display
const showButtonRef = ref<HTMLButtonElement>();
const alertRef = ref<HTMLDivElement>();

async function showAccountDeletionForm() {
  displayAccountDeletionForm.value = true;
  await nextTick();
  alertRef.value?.focus();
}

async function hideAccountDeletionForm() {
  displayAccountDeletionForm.value = false;
  await nextTick();
  showButtonRef.value?.focus();
}
</script>

<template>
  <template v-if="displayAccountDeletionForm">
    <div ref="alertRef" class="fr-alert fr-alert--error fr-mb-3w" tabindex="-1">
      <h3 class="fr-alert__title">Vous allez supprimer votre compte</h3>
      <p>
        Toutes les données associées à votre compte seront définitivement
        supprimées. Les audits et rapports que vous avez créés ne seront pas
        supprimés, cependant, votre nom, prénom et adresse e-mail ne seront plus
        mentionnés dans ces audits et rapports.
      </p>
    </div>
    <form class="wrapper" novalidate @submit.prevent="deleteAccount">
      <div
        class="fr-input-group"
        :class="{ 'fr-input-group--error': validationError }"
      >
        <label class="fr-label" for="confirm-sentence"
          >Pour confirmer la suppression de votre compte veuillez saisir :
          {{ VALIDATION_STRING }}
          <span class="fr-hint-text"
            >Attention à ne pas utiliser de majuscule ou ajouter d’espace au
            début ou à la fin de votre saisie.
          </span>
        </label>
        <input
          id="confirm-sentence"
          ref="validationFieldRef"
          v-model="validation"
          class="fr-input"
          :class="{ 'fr-input--error': validationError }"
          :aria-describedby="validationError ? 'validation-error' : undefined"
          type="text"
          required
        />
        <p v-if="validationError" id="validation-error" class="fr-error-text">
          {{ validationError }}
        </p>
      </div>

      <DsfrPassword
        id="account-password"
        ref="passwordFieldRef"
        v-model="password"
        :error="passwordError"
        label="Mot de passe"
        required
        autocomplete="current-password"
        show-forgotten-password-link
        skip-forgotten-password-first-step
      />

      <ul
        class="fr-btns-group fr-btns-group--inline fr-btns-group--right fr-mt-3w"
      >
        <li>
          <button
            class="fr-btn fr-btn--secondary fr-mb-0"
            type="button"
            @click="hideAccountDeletionForm"
          >
            Annuler
          </button>
        </li>
        <li>
          <button type="submit" class="fr-btn fr-mb-0 danger-button">
            Supprimer mon compte
          </button>
        </li>
      </ul>
    </form>
  </template>
  <button
    v-else
    ref="showButtonRef"
    class="fr-btn fr-btn--tertiary-no-outline danger-button-outline"
    @click="showAccountDeletionForm"
  >
    Supprimer mon compte
  </button>
</template>

<style scoped>
.wrapper {
  max-width: 24rem;
}
</style>

<script lang="ts" setup>
import { HTTPError } from "ky";
import { nextTick, ref } from "vue";

import { useNotifications } from "../../../composables/useNotifications";
import { useAccountStore } from "../../../store/account";
import { captureWithPayloads } from "../../../utils";
import DsfrPassword from "../../ui/DsfrPassword.vue";

const currentPasswordFieldRef = ref<InstanceType<typeof DsfrPassword>>();
const newPasswordFieldRef = ref<InstanceType<typeof DsfrPassword>>();

// Toggle display
const showButtonRef = ref<HTMLButtonElement>();

const displayUpdatePasswordForm = ref(false);

async function showUpdatePasswordForm() {
  displaySuccessAlert.value = false;
  displayUpdatePasswordForm.value = true;
  await nextTick();
  currentPasswordFieldRef.value?.inputRef?.focus();
}

async function hideUpdatePasswordForm() {
  displayUpdatePasswordForm.value = false;
  currentPassword.value = "";
  newPassword.value = "";
  currentPasswordError.value = "";
  newPasswordError.value = "";
  await nextTick();
  showButtonRef.value?.focus();
}

// Form submission
const currentPassword = ref("");
const newPassword = ref("");

const displaySuccessAlert = ref(false);

const successAlertRef = ref<HTMLDivElement>();

const currentPasswordError = ref("");
const newPasswordError = ref("");

const accountStore = useAccountStore();
const notify = useNotifications();

async function updatePassword() {
  currentPasswordError.value = "";
  newPasswordError.value = "";

  accountStore
    .updatePassword(currentPassword.value, newPassword.value)
    .then(() => {
      displayUpdatePasswordForm.value = false;
      displaySuccessAlert.value = true;
      currentPassword.value = "";
      newPassword.value = "";
    })
    .catch(async (err) => {
      if (err instanceof HTTPError && err.response.status === 401) {
        // Wrong password
        currentPasswordError.value = "Le mot de passe saisi est incorrect.";
        await nextTick();
        currentPasswordFieldRef.value?.inputRef?.focus();
      } else if (err instanceof HTTPError && err.response.status === 400) {
        // Same password
        newPasswordError.value =
          "Le mot de passe saisi est identique au mot de passe actuel. Veuillez choisir un nouveau mot de passe.";
        await nextTick();
        newPasswordFieldRef.value?.inputRef?.focus();
      } else {
        // Unexpected network error
        notify(
          "error",
          "Échec de la mise à jour du mot de passe",
          "Une erreur inconnue empêche la mise à jour du mot de passe. Contactez-nous à l'adresse ara@design.numerique.gouv.fr si le problème persiste."
        );
        captureWithPayloads(err, false);
      }
    });
}

async function hideSuccessAlert() {
  displaySuccessAlert.value = false;
  await nextTick();
  showButtonRef.value?.focus();
}
</script>

<template>
  <h2 class="fr-h6">Mot de passe</h2>
  <form
    v-if="displayUpdatePasswordForm"
    class="wrapper"
    @submit.prevent="updatePassword"
  >
    <!-- Current password -->
    <DsfrPassword
      id="current-password"
      ref="currentPasswordFieldRef"
      v-model="currentPassword"
      class="fr-mb-3w"
      :error="currentPasswordError"
      label="Mot de passe actuel"
      required
      autocomplete="current-password"
      show-forgotten-password-link
      skip-forgotten-password-first-step
    />

    <!-- New password -->
    <DsfrPassword
      id="new-password"
      ref="newPasswordFieldRef"
      v-model="newPassword"
      :error="newPasswordError"
      label="Nouveau mot de passe"
      required
      autocomplete="new-password"
      :min-length="12"
      :requirements="['12 caractères minimum']"
    />

    <!-- Actions -->
    <ul
      class="fr-btns-group fr-btns-group--inline fr-btns-group--right fr-mt-3w"
    >
      <li>
        <button
          class="fr-btn fr-btn--secondary fr-mb-0"
          type="button"
          @click="hideUpdatePasswordForm"
        >
          Annuler
        </button>
      </li>
      <li>
        <button type="submit" class="fr-btn fr-mb-0">
          Changer de mot de passe
        </button>
      </li>
    </ul>
  </form>
  <button
    v-else
    ref="showButtonRef"
    class="fr-btn fr-btn--tertiary-no-outline fr-mb-2w"
    @click="showUpdatePasswordForm"
  >
    Changer de mot de passe
  </button>

  <div
    v-if="displaySuccessAlert"
    ref="successAlertRef"
    tabindex="-1"
    class="fr-alert fr-alert--success fr-alert--sm"
  >
    <p>Votre mot de passe a été mis à jour avec succès</p>
    <button class="fr-link--close fr-link" @click="hideSuccessAlert">
      Masquer le message
    </button>
  </div>
</template>

<style scoped>
.wrapper {
  max-width: 30rem;
}
</style>

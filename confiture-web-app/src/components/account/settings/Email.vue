<script lang="ts" setup>
import { HTTPError } from "ky";
import { nextTick, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";

import { useNotifications } from "../../../composables/useNotifications";
import { history } from "../../../router";
import { useAccountStore } from "../../../store/account";
import {
  captureWithPayloads,
  formatEmail,
  validateEmail
} from "../../../utils";
import DsfrField from "../../ui/DsfrField.vue";
import DsfrPassword from "../../ui/DsfrPassword.vue";

const accountStore = useAccountStore();
const notify = useNotifications();

// Form submission
const passwordFieldRef = ref<InstanceType<typeof DsfrPassword>>();
const newEmailFieldRef = ref<InstanceType<typeof DsfrField>>();
const confirmAlert = ref<HTMLDivElement>();

// Field errors
const passwordError = ref<string>();
const newEmailError = ref<string>();

// Field values
const password = ref("");
const newEmail = ref("");

const displayPendingEmailVerification = ref(false);

const displayEmailUpdateSuccess = ref(!!history.state.updatedEmail);

async function closeEmailUpdateSuccess() {
  displayEmailUpdateSuccess.value = false;
  await nextTick();
  showButtonRef.value?.focus();
}

async function showPending() {
  displayPendingEmailVerification.value = true;
  await nextTick();
  confirmAlert.value?.focus();
}

async function hidePending() {
  displayPendingEmailVerification.value = false;
  ac.value?.abort();
  await nextTick();
  passwordFieldRef.value?.inputRef?.focus();
}

const ac = ref<AbortController>();

function validateNewEmailField() {
  newEmailError.value = undefined;

  // Empty email
  if (newEmail.value.trim().length === 0) {
    newEmailError.value =
      "Champ obligatoire. Veuillez choisir une adresse e-mail au format : nom@domaine.fr";
    newEmailFieldRef.value?.inputRef?.focus();
    return false;
  }

  // Invalid email format
  if (!validateEmail(newEmail.value)) {
    newEmailError.value =
      "Le format de l’adresse e-mail est incorrect. Veuillez saisir une adresse e-mail au format : nom@domaine.fr";
    newEmailFieldRef.value?.inputRef?.focus();
    return false;
  }

  return true;
}

function validatePasswordField() {
  passwordError.value = undefined;

  // Empty password
  if (password.value.length === 0) {
    passwordError.value =
      "Champ obligatoire. Veuillez saisir votre mot de passe";
    passwordFieldRef.value?.inputRef?.focus();
    return false;
  }

  return true;
}

async function updateEmail() {
  if (![validateNewEmailField(), validatePasswordField()].every((i) => i)) {
    // Invalid form
    return;
  }

  accountStore
    .updateEmail(formatEmail(newEmail.value), password.value)
    .then(showPending)
    .then(() => {
      ac.value = new AbortController();
      return accountStore
        .waitForEmailUpdateVerification(newEmail.value, ac.value.signal)
        .then(() => {
          displayPendingEmailVerification.value = false;
          displayEmailUpdateSuccess.value = true;
          displayUpdateEmailForm.value = false;
          accountStore.refreshToken();
        })
        .catch(() => {
          /* Cancelled */
        });
    })
    .catch(async (e) => {
      if (e instanceof HTTPError && e.response.status === 401) {
        passwordError.value = "Le mot de passe saisi est incorrect.";
        await nextTick();
        passwordFieldRef.value?.inputRef?.focus();
      } else if (e instanceof HTTPError && e.response.status === 409) {
        newEmailError.value =
          "La nouvelle adresse e-mail saisie est identique à celle utilisée pour votre compte. Veuillez choisir une autre adresse e-mail.";
        await nextTick();
        newEmailFieldRef.value?.inputRef?.focus();
      } else {
        notify(
          "error",
          "Impossible de mettre à jour l'adresse mail.",
          "Une erreur inconnue empêche la mise à jour de votre compte. Contactez-nous à l'adresse ara@design.numerique.gouv.fr si le problème persiste."
        );
        captureWithPayloads(e, false);
      }
    });
}

onBeforeRouteLeave(() => {
  ac.value?.abort();
});

// Send new email
const resendButtonRef = ref<HTMLButtonElement>();
const displayResendAlert = ref(false);

async function hideResendAlert() {
  displayResendAlert.value = false;
  await nextTick();
  resendButtonRef.value?.focus();
}

async function sendNewEmail() {
  await accountStore.resendEmailUpdateVerificationEmail();
  displayResendAlert.value = true;
}

// Toggle display
const showButtonRef = ref<HTMLButtonElement>();
const displayUpdateEmailForm = ref(false);

async function showUpdateEmailForm() {
  displayUpdateEmailForm.value = true;
  await nextTick();
  passwordFieldRef.value?.inputRef?.focus();
}

async function hideUpdateEmailForm() {
  displayUpdateEmailForm.value = false;
  await nextTick();
  showButtonRef.value?.focus();
}

// Cancel email update
async function cancelEmailUpdate() {
  try {
    await accountStore.cancelEmailUpdate();
  } catch (e) {
    notify(
      "error",
      "Impossible d’annuler le changement d’adresse e-mail.",
      "Une erreur inconnue empêche l’annulation du changement d’adresse e-mail. Contactez-nous à l'adresse ara@design.numerique.gouv.fr si le problème persiste."
    );
    captureWithPayloads(e, false);
  } finally {
    displayPendingEmailVerification.value = false;
    displayUpdateEmailForm.value = false;
    password.value = "";
    newEmail.value = "";
    await nextTick();
    showButtonRef.value?.focus();
  }
}
</script>

<template>
  <h2 class="fr-h6">Adresse e-mail</h2>
  <p>
    Votre adresse email : <strong>{{ accountStore.account?.email }}</strong>
  </p>

  <!-- Success alert -->
  <div
    v-if="displayEmailUpdateSuccess"
    class="fr-alert fr-alert--success fr-mb-3v"
  >
    <p>Votre adresse e-mail a été mise à jour avec succès.</p>
    <button class="fr-link--close fr-link" @click="closeEmailUpdateSuccess">
      Masquer le message
    </button>
  </div>

  <!-- Instructions -->
  <div v-if="displayPendingEmailVerification" class="fr-mb-2w">
    <div
      ref="confirmAlert"
      tabindex="-1"
      class="fr-alert fr-alert--info fr-mb-3v"
    >
      <p>
        Un lien pour confirmer votre nouvelle adresse e-mail vient de vous être
        envoyé à l’adresse suivante : <strong>{{ newEmail }}</strong>
      </p>
    </div>

    <h3 class="fr-text--sm fr-mb-1w">Aucun e-mail reçu ?</h3>
    <p class="fr-text--sm fr-mb-1w">
      Pensez à vérifier que vous n’avez pas reçu l’e-mail dans vos courriers
      indésirables. Sinon veuillez demander l’envoi d’un nouvel e-mail à l’aide
      du bouton ci-dessous.
    </p>
    <button
      ref="resendButtonRef"
      class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
      :class="{ 'fr-mb-1w': displayResendAlert }"
      @click="sendNewEmail"
    >
      Demander l’envoi d’un nouvel e-mail
    </button>
    <div aria-live="polite">
      <div
        v-if="displayResendAlert"
        class="fr-alert fr-alert--success fr-alert--sm"
      >
        <p>Un nouvel e-mail vient de vous être envoyé</p>
        <button class="fr-link--close fr-link" @click="hideResendAlert">
          Masquer le message
        </button>
      </div>
    </div>

    <h3 class="fr-text--sm fr-mb-1w fr-mt-3v">
      L’adresse e-mail saisie est erronée ?
    </h3>
    <button
      class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
      @click="hidePending"
    >
      Modifier mon adresse e-mail
    </button>

    <div class="fr-mt-3w">
      <button class="fr-btn fr-btn--secondary" @click="cancelEmailUpdate">
        Annuler le changement d’adresse e-mail
      </button>
    </div>
  </div>

  <!-- Update email form -->
  <form
    v-if="displayUpdateEmailForm && !displayPendingEmailVerification"
    class="wrapper"
    novalidate
    @submit.prevent="updateEmail"
  >
    <DsfrPassword
      id="email-password"
      ref="passwordFieldRef"
      v-model="password"
      class="fr-mb-3w"
      :error="passwordError"
      label="Mot de passe"
      required
      autocomplete="current-password"
      show-forgotten-password-link
      skip-forgotten-password-first-step
    />

    <DsfrField
      id="new-email"
      ref="newEmailFieldRef"
      v-model="newEmail"
      class="fr-mt-3v"
      label="Nouvelle adresse e-mail"
      hint="Format attendu : nom@domaine.fr"
      type="email"
      :error="newEmailError"
      required
    />

    <ul
      class="fr-btns-group fr-btns-group--inline fr-btns-group--right fr-mt-3w"
    >
      <li>
        <button
          class="fr-btn fr-btn--secondary fr-mb-0"
          @click="hideUpdateEmailForm"
        >
          Annuler
        </button>
      </li>
      <li>
        <button type="submit" class="fr-btn fr-mb-0">
          Changer d’adresse e-mail
        </button>
      </li>
    </ul>
  </form>

  <button
    v-else-if="!displayPendingEmailVerification"
    ref="showButtonRef"
    class="fr-btn fr-btn--tertiary-no-outline fr-mb-2w"
    @click="showUpdateEmailForm"
  >
    Changer d’adresse e-mail
  </button>
</template>

<style scoped>
.wrapper {
  max-width: 30rem;
}
</style>

<script lang="ts" setup>
import jwtDecode from "jwt-decode";
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import NewPasswordForm from "../../components/account/password-reset/NewPasswordForm.vue";
import RequestPasswordReset from "../../components/account/password-reset/RequestPasswordReset.vue";
import ResetInstructions from "../../components/account/password-reset/ResetInstructions.vue";
import PageMeta from "../../components/PageMeta";
import { useNotifications } from "../../composables/useNotifications";
import { history } from "../../router";
import { useAccountStore } from "../../store/account";
import { PasswordResetVerificationJwtPayload } from "../../types";
import { captureWithPayloads, formatEmail, isJwtExpired } from "../../utils";

const route = useRoute();
const router = useRouter();
const verificationToken = computed(() => route.query.token);
const verificationTokenIsExpired = computed(
  () =>
    typeof verificationToken.value === "string" &&
    isJwtExpired(verificationToken.value as string)
);
const store = useAccountStore();
const skipFirstStep =
  !!history.state["skipFirstStep"] && !!store.account?.email;
const currentStep = ref(verificationToken.value ? 2 : skipFirstStep ? null : 0);
const notify = useNotifications();

const resetInstructionsRef = ref<InstanceType<typeof ResetInstructions>>();
const requestPasswordResetRef =
  ref<InstanceType<typeof RequestPasswordReset>>();

const accountEmail = ref<string>();

async function onRequestSubmit(email: string) {
  try {
    await store.requestPasswordReset(formatEmail(email));
    accountEmail.value = email;
    currentStep.value = 1;
    await nextTick();
    resetInstructionsRef.value?.focusHeading();
  } catch (e) {
    notify(
      "error",
      "Impossible de demander la réinitialisation du mot de passe",
      "Une erreur inconnue empêche la réinitialisation de votre mot de passe. Contactez-nous à l'adresse ara@design.numerique.gouv.fr si le problème persiste."
    );
    captureWithPayloads(e);
  }
}

async function resendEmail() {
  try {
    // the resend button only appears when the email is already known
    await store.requestPasswordReset(formatEmail(accountEmail.value!));
    resetInstructionsRef.value?.displayResendAlert();
  } catch (e) {
    notify(
      "error",
      "Impossible de demander la réinitialisation du mot de passe",
      "Une erreur inconnue empêche la réinitialisation de votre mot de passe. Contactez-nous à l'adresse ara@design.numerique.gouv.fr si le problème persiste."
    );
    captureWithPayloads(e);
  }
}

async function updateEmail() {
  currentStep.value = 0;
  await nextTick();
  requestPasswordResetRef.value?.focusEmailField();
}

async function resetPassword(newPassword: string) {
  try {
    const { email } = jwtDecode(
      verificationToken.value as string
    ) as PasswordResetVerificationJwtPayload;
    await store.resetPassword(newPassword, verificationToken.value as string);

    if (store.account) {
      // User is logged in
      router.push({
        name: "account-dashboard",
        state: { passwordReset: true }
      });
    } else {
      router.push({ name: "login", state: { email, passwordReset: true } });
    }
  } catch (e) {
    notify(
      "error",
      "Impossible de procéder à la mise à jour du mot de passe",
      "Une erreur inconnue empêche la mise à jour du mot de passe. Contactez-nous à l'adresse ara@design.numerique.gouv.fr si le problème persiste."
    );
    captureWithPayloads(e, false);
  }
}

onMounted(() => {
  if (skipFirstStep) {
    onRequestSubmit(store.account.email);
  }
});
</script>

<template>
  <PageMeta title="Réinitialiser le mot de passe" />
  <RequestPasswordReset
    v-if="currentStep === 0"
    ref="requestPasswordResetRef"
    @submit="onRequestSubmit"
  />
  <ResetInstructions
    v-if="currentStep === 1"
    ref="resetInstructionsRef"
    :email="accountEmail!"
    @resend-email="resendEmail"
    @update-email="updateEmail"
  />
  <template v-if="currentStep === 2">
    <div v-if="verificationTokenIsExpired" class="wrapper">
      <div class="fr-mb-3w title">
        <h1 class="fr-h1 fr-m-0">Désolé, votre lien n’est plus valide</h1>
      </div>

      <p class="fr-text--xl">
        Votre lien de vérification a expiré. Veuillez changer de nouveau votre
        mot de passe pour recevoir un lien valide.
      </p>

      <p class="fr-text--sm fr-mb-6w">
        Si vous avez besoin d’aide pour changer de mot de passe, merci de nous
        contacter par e-mail à l’adresse suivante :
        <strong>ara@design.numerique.gouv.fr</strong>.
      </p>

      <RouterLink
        :to="{ name: 'password-reset' }"
        class="fr-link fr-icon-arrow-right-line fr-link--icon-right"
        @click="currentStep = 0"
      >
        Changer de mot de passe
      </RouterLink>
    </div>
    <NewPasswordForm v-else @submit="resetPassword" />
  </template>
</template>

<style scoped>
.wrapper {
  max-width: 49.5rem;
  margin: 0 auto;
}
</style>

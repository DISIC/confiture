<script setup lang="ts">
import fiphfpLogo from "../../assets/images/fiphfp.png";
import { useAccountStore } from "../../store/account";
import ThemeModal from "./ThemeModal.vue";

const accountStore = useAccountStore();

const bottomLinks = [
  {
    label: "Plan du site",
    routeName: "site-map"
  },
  {
    label: "Accessibilité : non conforme",
    routeName: "accessibility"
  },
  {
    label: "Mentions légales",
    routeName: "legal"
  },
  {
    label: "Données personnelles",
    routeName: "privacy"
  },
  {
    label: "Contact et contributions",
    routeName: "contact"
  }
];
</script>

<template>
  <footer id="footer" class="fr-footer fr-mt-auto" role="contentinfo">
    <div v-if="accountStore.account" class="fr-footer__top">
      <div class="fr-container">
        <div class="fr-grid-row fr-grid-row--start fr-grid-row--gutters">
          <div class="fr-col-12 fr-col-sm-3 fr-col-md-2">
            <h3 class="fr-footer__top-cat">Nouveautés</h3>
            <ul class="fr-footer__top-list">
              <li>
                <RouterLink
                  class="fr-footer__top-link"
                  :to="{ name: 'changelog' }"
                  >Notes de versions</RouterLink
                >
              </li>
              <li>
                <RouterLink
                  class="fr-footer__top-link"
                  :to="{ name: 'roadmap' }"
                  >Feuille de route</RouterLink
                >
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="fr-container">
      <div class="fr-footer__body">
        <div class="fr-footer__brand fr-enlarge-link">
          <RouterLink :to="{ name: 'home' }" title="Retour à l’accueil">
            <p class="fr-logo" title="république française">
              République<br />
              Française
            </p>
          </RouterLink>
        </div>
        <div class="fr-footer__content">
          <p class="fr-footer__content-desc">
            Ce site est réalisé par
            <a
              class="fr-link fr-text--sm"
              href="https://design.numerique.gouv.fr/"
              target="_blank"
            >
              DesignGouv <span class="fr-sr-only">(nouvelle fenêtre)</span></a
            >, le pôle Design des services numériques de la
            <a
              class="fr-link fr-text--sm"
              href="https://www.numerique.gouv.fr/dinum/"
              rel="noreferrer noopener"
              target="_blank"
            >
              direction interministérielle du numérique
              <span class="fr-sr-only">(nouvelle fenêtre)</span></a
            >
            avec le soutien du
            <a
              class="fr-link fr-text--sm"
              href="https://www.fiphfp.fr/"
              target="_blank"
              >FIPHFP<span class="fr-sr-only">
                Fonds pour l’insertion des personnes handicapées dans la
                Fonction publique (nouvelle fenêtre)
              </span></a
            >.
          </p>
          <ul class="fr-footer__content-list">
            <li class="fr-footer__content-item">
              <a
                class="fr-footer__content-link"
                href="https://info.gouv.fr"
                target="_blank"
                >info.gouv.fr
                <span class="fr-sr-only">(nouvelle fenêtre)</span></a
              >
            </li>
            <li class="fr-footer__content-item">
              <a
                class="fr-footer__content-link"
                href="https://service-public.fr"
                target="_blank"
                >service-public.fr
                <span class="fr-sr-only">(nouvelle fenêtre)</span></a
              >
            </li>
            <li class="fr-footer__content-item">
              <a
                class="fr-footer__content-link"
                href="https://legifrance.gouv.fr"
                target="_blank"
                >legifrance.gouv.fr
                <span class="fr-sr-only">(nouvelle fenêtre)</span></a
              >
            </li>
            <li class="fr-footer__content-item">
              <a
                class="fr-footer__content-link"
                href="https://data.gouv.fr"
                target="_blank"
                >data.gouv.fr
                <span class="fr-sr-only">(nouvelle fenêtre)</span></a
              >
            </li>
          </ul>
        </div>
      </div>
      <div class="fr-footer__partners">
        <p class="fr-footer__partners-title fr-mb-1w">
          Conçu avec le soutien de notre partenaire :
        </p>
        <div class="fr-footer__partners-logos">
          <div class="fr-footer__partners-main">
            <a
              class="fr-footer__partners-link"
              target="_blank"
              href="https://www.fiphfp.fr/"
            >
              <img
                class="fr-footer__logo logo-partner"
                :src="fiphfpLogo"
                alt="Site du FIPHFP : Fonds pour l’insertion des personnes handicapées dans la Fonction publique (nouvelle fenêtre)"
              />
            </a>
          </div>
        </div>
      </div>
      <div class="fr-footer__bottom">
        <ul class="fr-footer__bottom-list">
          <li
            v-for="link in bottomLinks"
            :key="link.routeName"
            class="fr-footer__bottom-item"
          >
            <RouterLink
              class="fr-footer__bottom-link"
              :to="{ name: link.routeName }"
            >
              {{ link.label }}
            </RouterLink>
          </li>
          <li class="fr-footer__bottom-item">
            <button
              class="fr-footer__bottom-link fr-fi-theme-fill fr-link--icon-left"
              aria-controls="fr-theme-modal"
              data-fr-opened="false"
            >
              Paramètres d'affichage
            </button>
          </li>
        </ul>
        <div class="fr-footer__bottom-copy">
          <p>
            Sauf mention contraire, tous les contenus de ce site sont sous
            <a
              href="https://github.com/etalab/licence-ouverte/blob/master/LO.md"
              target="_blank"
              >licence etalab-2.0
              <span class="fr-sr-only">(nouvelle fenêtre)</span></a
            >
          </p>
        </div>
      </div>
    </div>
  </footer>
  <ThemeModal />
</template>

<style scoped>
.logo-partner {
  border: 1px solid var(--border-default-grey);
}
.fr-footer__partners-link::after {
  content: none;
}
</style>

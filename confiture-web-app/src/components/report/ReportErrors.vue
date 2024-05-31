<script setup lang="ts">
import { computed, ref } from "vue";

import { useReportStore } from "../../store";
import { CriterionResultUserImpact, CriteriumResultStatus } from "../../types";
import { getReportErrors } from "./getReportErrors";
import ReportCriteria from "./ReportCriteria.vue";
import ReportErrorCriterium from "./ReportErrorCriterium.vue";

const report = useReportStore();

// Filters
const defaultUserImpactFillters = [
  CriterionResultUserImpact.MINOR,
  CriterionResultUserImpact.MAJOR,
  CriterionResultUserImpact.BLOCKING,
  null
];

const userImpactFilters = ref<
  Array<CriterionResultUserImpact | `${CriterionResultUserImpact}` | null>
>(defaultUserImpactFillters);

const disabledResetFilters = computed(
  () =>
    userImpactFilters.value.length === defaultUserImpactFillters.length &&
    !quickWinFilter.value
);

const minorUserImpactErrorCount = computed(
  () =>
    report.data?.results.filter(
      (r) =>
        r.status === CriteriumResultStatus.NOT_COMPLIANT &&
        r.userImpact === CriterionResultUserImpact.MINOR
    ).length
);

const majorUserImpactErrorCount = computed(
  () =>
    report.data?.results.filter(
      (r) =>
        r.status === CriteriumResultStatus.NOT_COMPLIANT &&
        r.userImpact === CriterionResultUserImpact.MAJOR
    ).length
);

const blockingUserImpactErrorCount = computed(
  () =>
    report.data?.results.filter(
      (r) =>
        r.status === CriteriumResultStatus.NOT_COMPLIANT &&
        r.userImpact === CriterionResultUserImpact.BLOCKING
    ).length
);

const unknownUserImpactErrorCount = computed(
  () =>
    report.data?.results.filter(
      (r) =>
        r.status === CriteriumResultStatus.NOT_COMPLIANT &&
        r.userImpact === null
    ).length
);

const transverseErrors = computed(() => {
  return getReportErrors(
    report,
    quickWinFilter.value,
    userImpactFilters.value
  )[0];
});

const pagesErrors = computed(() => {
  return getReportErrors(
    report,
    quickWinFilter.value,
    userImpactFilters.value
  ).slice(1);
});

const errorsCount = computed(() => {
  return getReportErrors(report, quickWinFilter.value, userImpactFilters.value)
    .map((page: any) => page.topics.map((topic: any) => topic.errors))
    .flat(2).length;
});

const quickWinFilter = ref(false);

function resetFilters() {
  userImpactFilters.value = defaultUserImpactFillters;
  quickWinFilter.value = false;
}
</script>

<template>
  <ReportCriteria
    v-if="report.data"
    :count="errorsCount"
    :pages-data="pagesErrors"
    :transverse-data="transverseErrors"
    :show-filters="true"
  >
    <template #filter>
      <div class="fr-text--bold fr-text--xl fr-mb-2w filter-title">Filtres</div>
      <button
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-refresh-line fr-btn--icon-right fr-mb-3w"
        :disabled="disabledResetFilters"
        @click="resetFilters"
      >
        Réinitialiser les filtres
      </button>
      <div class="fr-form-group">
        <fieldset class="fr-fieldset">
          <legend
            id="checkboxes-hint-element-legend"
            class="fr-fieldset__legend fr-text--regular fr-text--bold"
          >
            Impact de l’erreur
          </legend>
          <div class="fr-fieldset__content">
            <div class="fr-checkbox-group">
              <input
                id="user-impact-filter-minor"
                v-model="userImpactFilters"
                :value="CriterionResultUserImpact.MINOR"
                type="checkbox"
              />
              <label class="fr-label" for="user-impact-filter-minor">
                Mineur ({{ minorUserImpactErrorCount }})
                <span class="fr-hint-text">
                  Gêne dans l’utilisation du site
                </span>
              </label>
            </div>
            <div class="fr-checkbox-group">
              <input
                id="user-impact-filter-major"
                v-model="userImpactFilters"
                :value="CriterionResultUserImpact.MAJOR"
                type="checkbox"
              />
              <label class="fr-label" for="user-impact-filter-major">
                Majeur ({{ majorUserImpactErrorCount }})
                <span class="fr-hint-text">
                  Complexifie grandement l’utilisation du site
                </span>
              </label>
            </div>
            <div class="fr-checkbox-group">
              <input
                id="user-impact-filter-blocking"
                v-model="userImpactFilters"
                :value="CriterionResultUserImpact.BLOCKING"
                type="checkbox"
              />
              <label class="fr-label" for="user-impact-filter-blocking">
                Bloquant ({{ blockingUserImpactErrorCount }})
                <span class="fr-hint-text">
                  Empêche totalement l’utilisation du site
                </span>
              </label>
            </div>
            <div class="fr-checkbox-group">
              <input
                id="user-impact-filter-unknown"
                v-model="userImpactFilters"
                :value="null"
                type="checkbox"
              />
              <label class="fr-label" for="user-impact-filter-unknown">
                Impact non renseigné ({{ unknownUserImpactErrorCount }})
              </label>
            </div>
          </div>
        </fieldset>
      </div>
      <div class="fr-form-group">
        <fieldset class="fr-fieldset">
          <legend class="fr-fieldset__legend fr-text--regular fr-text--bold">
            Correction de l’erreur
          </legend>
          <div class="fr-fieldset__content">
            <div class="fr-checkbox-group">
              <input
                id="quick-win-filter"
                v-model="quickWinFilter"
                type="checkbox"
              />
              <label class="fr-label" for="quick-win-filter">
                Uniquement les erreurs faciles à corriger
              </label>
            </div>
          </div>
        </fieldset>
      </div>
    </template>

    <template v-if="transverseErrors.topics.length" #transverse-data>
      <section class="fr-mb-8w">
        <h2 id="elements-transverses" class="fr-h3 fr-mb-2w page-title">
          Éléments transverses
        </h2>

        <div
          v-for="(topic, i) in transverseErrors.topics"
          :key="topic.topic"
          :class="{ 'fr-mt-9v': i !== 0 }"
        >
          <p class="fr-tag fr-tag--sm fr-mb-3v">
            {{ topic.topic }}.&nbsp;{{ topic.name }}
          </p>

          <ReportErrorCriterium
            v-for="(error, j) in topic.errors"
            :key="j"
            :error="error"
            :class="{ 'fr-mt-9v': j !== 0 }"
          />
        </div>
      </section>
    </template>

    <template #pages-data>
      <section v-for="page in pagesErrors" :key="page.id" class="fr-mb-8w">
        <h2 :id="`${page.id}`" class="fr-h3 fr-mb-2w page-title">
          {{ page.name }}
        </h2>
        <a
          :href="page.url"
          class="fr-link page-url"
          target="_blank"
          rel="noopener"
        >
          {{ page.url }} <span class="fr-sr-only">(nouvelle fenêtre)</span>
        </a>

        <p v-if="page.topics.length === 0" class="fr-mt-4w">
          Aucune erreur d'accessibilité relevée sur cette page.
        </p>

        <div
          v-for="(topic, i) in page.topics"
          :key="topic.topic"
          :class="i === 0 ? 'fr-mt-4w' : 'fr-mt-9v'"
        >
          <p class="fr-tag fr-tag--sm fr-mb-3w">
            {{ topic.topic }}.&nbsp;{{ topic.name }}
          </p>

          <ReportErrorCriterium
            v-for="(error, j) in topic.errors"
            :key="j"
            :error="error"
            :class="{ 'fr-mt-9v': j !== 0 }"
          />
        </div>
      </section>
    </template>
  </ReportCriteria>
</template>

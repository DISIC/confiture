<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import { useAuditStats } from "../../composables/useAuditStats";
import { useResultsStore } from "../../store";
import { Audit, AuditType } from "../../types";
import { formatDate, getCriteriaCount, pluralize } from "../../utils";
import AuditProgressBar from "../audit/AuditProgressBar.vue";
import StatDonut from "../StatDonut.vue";
import StepCard from "./StepCard.vue";

defineProps<{
  audit: Audit;
}>();

const route = useRoute();
const uniqueId = computed(() => route.params.uniqueId as string);
const resultsStore = useResultsStore();

const {
  complianceLevel,
  notApplicableCriteriaCount,
  notCompliantCriteriaCount,
  errorsCount
} = useAuditStats();

const auditIsReady = computed(() => {
  return resultsStore.auditProgress === 1;
});

const auditIsInProgress = computed(() => {
  return resultsStore.auditProgress > 0 && resultsStore.auditProgress < 1;
});
</script>

<template>
  <StepCard>
    <div class="fr-mb-3w audit-step-heading">
      <span
        v-if="auditIsReady"
        id="audit-step-status"
        class="fr-icon--lg fr-icon-checkbox-circle-fill audit-step-check"
      >
        <span class="fr-sr-only">Étape terminée</span>
      </span>

      <h2
        class="fr-h3 fr-mb-0 audit-step-title"
        aria-describedby="audit-step-status"
      >
        Audit
        <p
          v-if="audit.auditType"
          class="fr-badge fr-badge--info fr-badge--no-icon"
        >
          {{ getCriteriaCount(audit.auditType) }}
          critères
        </p>
      </h2>
      <RouterLink
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-settings-5-line audit-step-settings-link"
        :to="{
          name: 'audit-settings',
          params: { uniqueId: audit.editUniqueId }
        }"
      >
        Modifier les paramètres
      </RouterLink>
    </div>

    <p class="fr-text--sm fr-mb-2w audit-step-date">
      <template v-if="auditIsInProgress && audit.creationDate">
        Commencé le
        <time :datetime="audit.creationDate.toString()">{{
          formatDate(audit.creationDate)
        }}</time></template
      >

      <template v-else-if="auditIsReady && audit.publicationDate">
        Terminé le
        <time :datetime="audit.publicationDate.toString()">{{
          formatDate(audit.publicationDate)
        }}</time>
        <template v-if="audit.editionDate">
          - Mis à jour le
          <time :datetime="audit.editionDate.toString()">{{
            formatDate(audit.editionDate)
          }}</time></template
        >
      </template>
      <template v-else-if="audit.creationDate">
        Créé le
        <time :datetime="audit.creationDate.toString()">{{
          formatDate(audit.creationDate)
        }}</time>
      </template>
    </p>

    <div
      v-if="auditIsReady"
      class="fr-mb-3w audit-step-charts"
      :class="{ 'audit-step-charts--full': audit.auditType === AuditType.FULL }"
    >
      <template v-if="audit.auditType === AuditType.FULL">
        <div class="audit-step-chart">
          <StatDonut
            :value="complianceLevel"
            :total="100"
            unit="%"
            theme="blue"
            size="sm"
          />

          <div class="card-info">
            <p class="fr-text--bold fr-mb-1v">Taux global de conformité</p>
            <p class="fr-text--xs fr-mb-0">RGAA version 4.1</p>
          </div>
        </div>
        <span aria-hidden="true" class="audit-step-chart-separator" />
      </template>
      <div class="audit-step-chart">
        <StatDonut
          :value="notCompliantCriteriaCount"
          :total="getCriteriaCount(audit.auditType)"
          theme="red"
          size="sm"
        />

        <div class="card-info">
          <p class="fr-text--bold fr-mb-1v">
            {{
              `${pluralize(
                "Critère",
                "Critères",
                errorsCount.total
              )} non ${pluralize("conforme", "conformes", errorsCount.total)}`
            }}
          </p>
          <p class="fr-text--xs fr-mb-0">
            {{
              `${errorsCount.blocking} ${pluralize(
                "bloquant",
                "bloquants",
                errorsCount.blocking
              )}`
            }}
          </p>
        </div>
      </div>
      <span aria-hidden="true" class="audit-step-chart-separator" />
      <div class="audit-step-chart">
        <StatDonut
          :value="notApplicableCriteriaCount"
          :total="getCriteriaCount(audit.auditType)"
          size="sm"
        />

        <div class="card-info">
          <p class="fr-text--bold fr-mb-1v">
            {{ pluralize("Critère", "Critères", notApplicableCriteriaCount) }}
            non
            {{
              pluralize("applicable", "applicables", notApplicableCriteriaCount)
            }}
          </p>
          <p class="fr-text--xs fr-mb-0">
            Sur {{ getCriteriaCount(audit.auditType) }} critères
          </p>
        </div>
      </div>
    </div>

    <AuditProgressBar
      v-else
      :value="resultsStore.auditProgress"
      label="Progression"
      is-large
      class="fr-mb-3w audit-step-progress-bar"
    />

    <ul
      :class="[
        'fr-btns-group fr-btns-group--icon-left audit-step-card-actions',
        { 'audit-step-card-actions--half': auditIsReady }
      ]"
    >
      <li>
        <RouterLink
          :to="{
            name: 'audit-generation',
            params: { uniqueId: uniqueId }
          }"
          class="fr-btn fr-btn--icon-left fr-mb-0"
          :class="
            auditIsReady
              ? 'fr-btn--secondary fr-icon-draft-line'
              : 'fr-icon-edit-fill'
          "
        >
          {{
            auditIsReady
              ? "Accéder"
              : auditIsInProgress
                ? "Continuer"
                : "Commencer"
          }}
        </RouterLink>
      </li>
    </ul>
  </StepCard>
</template>

<style scoped>
.audit-step-heading {
  align-items: center;
  display: flex;
  gap: 1rem;
  grid-column: 1 / -1;
}

.audit-step-title {
  /* FIXME: DSFR default badges dont align. Those with icons does. */
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.audit-step-check {
  color: var(--text-default-success);
}

.audit-step-settings-link {
  margin-inline-start: auto;
}

.audit-step-date {
  color: var(--text-mention-grey);
  grid-column: 1 / -1;
  grid-row: 2;
}

.audit-step-progress-bar {
  grid-column: 1 / -1;
  grid-row: 3;
}

.audit-step-charts {
  grid-column: 1 / -1;
  grid-row: 3;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
}

.audit-step-charts--full {
  grid-template-columns: 1fr auto 1fr auto 1fr;
}

.audit-step-chart {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.audit-step-chart-separator {
  width: 1px;
  background: var(--border-default-grey);
  height: 100%;
  margin-left: 0.5rem;
  margin-right: 1rem;
}

.audit-step-card-actions {
  grid-column: 1 / -1;
}

.audit-step-card-actions--half {
  grid-column: 1;
}

@media (width < 48rem) {
  .audit-step-charts {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .audit-step-chart-separator {
    display: none;
  }
}
</style>

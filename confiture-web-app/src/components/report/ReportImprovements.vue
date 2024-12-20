<script setup lang="ts">
import { computed } from "vue";

import { useReportStore } from "../../store";
import { getReportImprovements } from "./getReportImprovements";
import ReportCriteria from "./ReportCriteria.vue";
import ReportImprovementCriterium from "./ReportImprovementCriterium.vue";

const report = useReportStore();

const transverseImprovements = computed(() => {
  return getReportImprovements(report)[0];
});

const pagesImprovements = computed(() => {
  return getReportImprovements(report)
    .slice(1)
    .filter((p) => p.topics.length > 0);
});

const improvementsCount = computed(() => {
  return getReportImprovements(report)
    .map((page: any) => page.topics.map((topic: any) => topic.improvements))
    .flat(2).length;
});
</script>

<template>
  <ReportCriteria
    v-if="report.data"
    top-notice="Ci-dessous les commentaires de l’auditeur ou de l’auditrice concernant des critères conformes ou non applicables."
    :count="improvementsCount"
    :pages-data="pagesImprovements"
    tab-slug="improvements"
    :transverse-data="transverseImprovements"
  >
    <template #transverse-data>
      <section v-if="transverseImprovements.topics.length > 0" class="fr-mb-8w">
        <h2
          id="improvements_elements-transverses"
          class="fr-h3 fr-mb-2w page-title"
        >
          Éléments transverses
        </h2>

        <div
          v-for="(topic, i) in transverseImprovements.topics"
          :key="topic.number"
          :class="{ 'fr-mt-9v': i !== 0 }"
        >
          <p class="fr-tag fr-tag--sm fr-mb-3v">
            {{ topic.number }}.&nbsp;{{ topic.name }}
          </p>

          <ReportImprovementCriterium
            v-for="(improvement, j) in topic.improvements"
            :key="j"
            :class="j === 0 ? null : 'fr-mt-9v'"
            :topic="topic.number"
            :criterium="improvement.criterium"
            :comment="improvement.comment!"
            :status="improvement.status"
          />
        </div>
      </section>
    </template>

    <template #pages-data>
      <section
        v-for="page in pagesImprovements"
        :key="page.id"
        class="fr-mb-8w"
      >
        <h2 :id="`improvements_${page.id}`" class="fr-h3 fr-mb-2w page-title">
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

        <div
          v-for="(topic, i) in page.topics"
          :key="topic.number"
          :class="i === 0 ? 'fr-mt-4w' : 'fr-mt-9v'"
        >
          <p class="fr-tag fr-tag--sm fr-mb-3v">
            {{ topic.number }}.&nbsp;{{ topic.name }}
          </p>
          <ReportImprovementCriterium
            v-for="(improvement, j) in topic.improvements"
            :key="j"
            :class="j === 0 ? null : 'fr-mt-9v'"
            :topic="topic.number"
            :criterium="improvement.criterium"
            :comment="improvement.comment!"
            :status="improvement.status"
          />
        </div>
      </section>
    </template>
  </ReportCriteria>
</template>

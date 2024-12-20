<script lang="ts" setup>
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";

import { useNotifications } from "../../../composables/useNotifications";
import { useAuditStore } from "../../../store";
import { AuditStatus, AuditType } from "../../../types";
import { AccountAudit } from "../../../types/account";
import {
  captureWithPayloads,
  formatBytes,
  formatDate,
  getCriteriaCount,
  slugify
} from "../../../utils";
import DeleteModal from "../../audit/DeleteModal.vue";
import DuplicateModal from "../../audit/DuplicateModal.vue";
import CopyIcon from "../../icons/CopyIcon.vue";
import Dropdown from "../../ui/Dropdown.vue";

const props = defineProps<{
  audit: AccountAudit;
  zIndex?: number;
}>();

const notify = useNotifications();
const auditStore = useAuditStore();

const isNotStarted = computed(
  () => props.audit.status === AuditStatus.NOT_STARTED
);

const isInProgress = computed(
  () => props.audit.status === AuditStatus.IN_PROGRESS
);

const optionsDropdownRef = ref<InstanceType<typeof Dropdown>>();

const duplicateModal = ref<InstanceType<typeof DuplicateModal>>();
const isDuplicationLoading = ref(false);

function duplicateAudit(name: string) {
  isDuplicationLoading.value = true;
  auditStore
    .duplicateAudit(props.audit.editUniqueId, name)
    .then((newAuditId) => {
      duplicateModal.value?.hide();

      notify("success", undefined, `Audit ${name} dupliqué avec succès`, {
        action: {
          label: "Annuler",
          cb() {
            console.log("Cancelled" + newAuditId);
            auditStore
              .deleteAudit(newAuditId)
              .then(() => {
                notify("success", undefined, "Duplication de l’audit annulée.");
              })
              .catch((error) => {
                notify(
                  "error",
                  "Une erreur est survenue",
                  "Un problème empêche la sauvegarde de vos données. Contactez-nous à l'adresse ara@design.numerique.gouv.fr si le problème persiste."
                );
                captureWithPayloads(error);
              });
          }
        }
      });
    })
    .catch((error) => {
      notify(
        "error",
        "Une erreur est survenue",
        "Un problème empêche la duplication de l’audit. Contactez-nous à l'adresse ara@design.numerique.gouv.fr si le problème persiste."
      );
      captureWithPayloads(error);
    })
    .finally(() => {
      isDuplicationLoading.value = false;
      duplicateModal.value?.hide();
    });
}

const deleteModal = ref<InstanceType<typeof DeleteModal>>();
const isDeletionLoading = ref(false);

function deleteAudit() {
  isDeletionLoading.value = true;

  const auditName = props.audit.procedureName;

  auditStore
    .deleteAudit(props.audit.editUniqueId)
    .then(() => {
      notify("success", undefined, `Audit ${auditName} supprimé avec succès`);
    })
    .catch((error) => {
      notify(
        "error",
        "Une erreur est survenue",
        "Un problème empêche la suppression de votre audit. Contactez-nous à l'adresse ara@design.numerique.gouv.fr si le problème persiste."
      );
      captureWithPayloads(error);
    })
    .finally(() => {
      isDeletionLoading.value = false;
      deleteModal.value?.hide();
    });
}

const csvExportUrl = computed(
  () => `/api/audits/${props.audit.editUniqueId}/exports/csv`
);

const csvExportFilename = computed(() => {
  if (!props.audit.procedureName) {
    return "audit.csv";
  }
  return `audit-${slugify(props.audit.procedureName)}.csv`;
});

function copyAuditLink(uniqueId: string) {
  const url = `${window.location.origin}/audits/${uniqueId}/generation`;

  navigator.clipboard.writeText(url).then(() => {
    notify(
      "success",
      undefined,
      `Le lien vers l’audit a bien été copié dans le presse-papier.`
    );
  });
}

function copyReportLink(uniqueId: string) {
  const url = `${window.location.origin}/rapport/${uniqueId}`;

  navigator.clipboard.writeText(url).then(() => {
    notify(
      "success",
      undefined,
      `Le lien vers le rapport a bien été copié dans le presse-papier.`
    );
  });
}

function copyStatementLink(uniqueId: string) {
  const url = `${window.location.origin}/declaration/${uniqueId}`;

  navigator.clipboard.writeText(url).then(() => {
    notify(
      "success",
      undefined,
      `Le lien vers la déclaration d’accessibilité a bien été copié dans le presse-papier.`
    );
  });
}
</script>

<template>
  <div class="fr-py-2w grid">
    <!-- Name -->
    <RouterLink
      :to="{ name: 'audit-overview', params: { uniqueId: audit.editUniqueId } }"
      class="fr-pl-2w audit-name"
    >
      <strong>{{ audit.procedureName }}</strong>
    </RouterLink>

    <!-- Status -->
    <p
      class="fr-badge fr-badge--sm audit-status"
      :class="{
        'fr-badge--purple-glycine': isInProgress || isNotStarted
      }"
    >
      <span class="fr-sr-only">Statut </span
      >{{ isInProgress || isNotStarted ? "En cours" : "Terminé" }}
    </p>

    <!-- Creation date -->
    <p class="fr-mb-0 audit-date">
      <span class="fr-sr-only">Date de création </span>
      <time :datetime="audit.creationDate.toString()">
        {{ formatDate(audit.creationDate.toString(), true) }}
      </time>
    </p>

    <!-- Type -->
    <p class="fr-mb-0 audit-type">
      <span class="fr-sr-only">Type </span>
      {{ getCriteriaCount(audit.auditType) }} critères
    </p>

    <!-- Compliance level -->
    <div class="audit-compliance-level">
      <template v-if="audit.auditType === AuditType.FULL">
        <p
          class="fr-badge fr-badge--sm fr-badge--no-icon fr-mb-0"
          :class="
            isInProgress || isNotStarted
              ? null
              : {
                  'fr-badge--green-emeraude': audit.complianceLevel === 100,
                  'fr-badge--new': audit.complianceLevel >= 50,
                  'fr-badge--error': audit.complianceLevel < 50
                }
          "
        >
          <span v-if="!isInProgress" class="fr-sr-only"
            >Taux de conformité
          </span>
          {{
            isInProgress || isNotStarted
              ? "Audit en cours"
              : `${audit.complianceLevel}%`
          }}
        </p>
        <p
          v-if="!isInProgress && !isNotStarted"
          class="fr-text--xs fr-mb-0 fr-mt-1v"
        >
          {{
            audit.complianceLevel === 100
              ? "Totalement conforme"
              : audit.complianceLevel >= 50
                ? "Partiellement conforme"
                : "Non conforme"
          }}
        </p>
      </template>
      <p v-else class="fr-m-0">
        Non-applicable
        <button
          class="fr-btn--tooltip fr-btn audit-compliance-level-tooltip"
          :aria-describedby="`compliance-tooltip-${zIndex}`"
        >
          Information contextuelle
        </button>
        <span
          :id="`compliance-tooltip-${zIndex}`"
          class="fr-tooltip fr-placement"
          role="tooltip"
          aria-hidden="true"
        >
          Seul l'audit 106 critères permet d'obtenir un taux de conformité
        </span>
      </p>
    </div>

    <!-- Main action -->
    <RouterLink
      :to="
        isInProgress || isNotStarted
          ? {
              name: 'audit-generation',
              params: { uniqueId: audit.editUniqueId }
            }
          : { name: 'report', params: { uniqueId: audit.consultUniqueId } }
      "
      class="fr-btn fr-btn--secondary fr-btn--icon-left audit-main-action"
      :class="
        isInProgress || isNotStarted
          ? 'fr-icon-edit-line'
          : 'fr-icon-eye-line no-external-icon'
      "
      :target="isInProgress || isNotStarted ? null : '_blank'"
    >
      {{
        isNotStarted
          ? "Commencer l’audit"
          : isInProgress
            ? "Continuer l’audit"
            : "Voir le rapport"
      }}
      <span v-if="isInProgress || isNotStarted" class="fr-sr-only">
        {{ audit.procedureName }}</span
      >
      <span v-else class="fr-sr-only"
        >pour l’audit {{ audit.procedureName }}</span
      >
    </RouterLink>

    <!-- Sub actions -->
    <div class="fr-pr-2w" :style="{ zIndex: zIndex }">
      <Dropdown
        ref="optionsDropdownRef"
        title="Options"
        :button-props="{
          class: 'fr-btn--tertiary',
          ariaLabel: `Options de l’audit ${audit.procedureName}`
        }"
      >
        <ul role="list" class="fr-p-0 fr-m-0 dropdown-list">
          <li class="dropdown-item">
            <RouterLink
              :to="{
                name: 'audit-overview',
                params: { uniqueId: audit.editUniqueId }
              }"
              class="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-todo-line fr-m-0"
            >
              Accéder au tableau de bord
            </RouterLink>
          </li>

          <li class="dropdown-item">
            <RouterLink
              :to="
                isInProgress || isNotStarted
                  ? {
                      name: 'report',
                      params: { uniqueId: audit.consultUniqueId }
                    }
                  : {
                      name: 'audit-generation',
                      params: { uniqueId: audit.editUniqueId }
                    }
              "
              :target="isInProgress || isNotStarted ? '_blank' : undefined"
              :class="`fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left ${
                isInProgress || isNotStarted
                  ? 'fr-icon-eye-line'
                  : 'fr-icon-file-line'
              } fr-m-0 no-external-icon`"
            >
              {{
                isInProgress || isNotStarted
                  ? "Voir le rapport"
                  : "Accéder à l’audit"
              }}
              <span class="fr-sr-only"> {{ audit.procedureName }}</span>
            </RouterLink>
          </li>

          <li aria-hidden="true" class="dropdown-separator"></li>
          <li class="dropdown-item">
            <button
              class="fr-btn fr-btn--tertiary-no-outline fr-m-0"
              @click="duplicateModal?.show()"
            >
              <CopyIcon class="fr-mr-2v" />
              Dupliquer l’audit
              <span class="fr-sr-only"> {{ audit.procedureName }}</span>
            </button>
          </li>
          <li class="dropdown-item">
            <RouterLink
              class="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-settings-5-line fr-m-0"
              :to="{
                name: 'audit-settings',
                params: { uniqueId: audit.editUniqueId }
              }"
            >
              Modifier les paramètres de l’audit
            </RouterLink>
          </li>

          <li aria-hidden="true" class="dropdown-separator"></li>

          <li class="dropdown-item dropdown-item--with-meta">
            <button
              class="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-link fr-m-0"
              @click="copyAuditLink(audit.editUniqueId)"
            >
              Copier le lien de l’audit
              <span class="fr-sr-only"> {{ audit.procedureName }}</span>
              <span class="fr-text--xs fr-text--regular dropdown-item-meta">
                Ce lien permet de modifier l’audit
              </span>
            </button>
          </li>
          <li class="dropdown-item">
            <button
              class="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-link fr-m-0"
              @click="copyReportLink(audit.consultUniqueId)"
            >
              Copier le lien du rapport
              <span class="fr-sr-only">
                de l’audit {{ audit.procedureName }}</span
              >
            </button>
          </li>

          <li v-if="audit.statementIsPublished" class="dropdown-item">
            <button
              class="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-link fr-m-0"
              @click="copyStatementLink(audit.consultUniqueId)"
            >
              Copier le lien de la déclaration
            </button>
          </li>

          <li aria-hidden="true" class="dropdown-separator"></li>

          <li class="dropdown-item dropdown-item--with-meta">
            <a
              class="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-download-fill fr-m-0"
              :href="csvExportUrl"
              :download="csvExportFilename"
            >
              Télécharger l’audit
              <span class="fr-sr-only"> {{ audit.procedureName }}</span>
              <span class="fr-text--xs fr-text--regular dropdown-item-meta">
                CSV – {{ formatBytes(audit.estimatedCsvSize, 2) }}
              </span>
            </a>
          </li>
          <li aria-hidden="true" class="dropdown-separator"></li>
          <li class="dropdown-item">
            <button
              class="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-delete-line fr-m-0 delete-button"
              @click="deleteModal?.show()"
            >
              Supprimer l’audit
              <span class="fr-sr-only"> {{ audit.procedureName }}</span>
            </button>
          </li>
        </ul>
      </Dropdown>
    </div>
  </div>

  <DuplicateModal
    :id="audit.editUniqueId"
    ref="duplicateModal"
    :original-audit-name="audit.procedureName"
    :is-loading="isDuplicationLoading"
    @confirm="duplicateAudit"
    @closed="
      optionsDropdownRef?.buttonRef?.focus();
      optionsDropdownRef?.closeOptions();
    "
  />

  <DeleteModal
    :id="audit.editUniqueId"
    ref="deleteModal"
    @confirm="deleteAudit"
    @closed="
      optionsDropdownRef?.buttonRef?.focus();
      optionsDropdownRef?.closeOptions();
    "
  />
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 2fr 0.75fr 0.75fr 0.75fr 1.25fr 1.5fr 1fr;
  grid-gap: 1rem;
  align-items: center;
  border: 1px solid var(--border-default-grey);
  position: relative;
  transition: background 0.25s ease;
}

.grid:hover,
.grid:focus-within {
  background: var(--background-raised-grey-hover);
}

.audit-name {
  background-image: none;
  z-index: 1;
}

.audit-name:focus {
  outline: none;
}
.audit-name:focus-visible::before {
  outline: 2px solid var(--dsfr-outline);
}

.audit-name::before {
  content: "";
  position: absolute;
  inset: 0;
}

.audit-status,
.audit-date,
.audit-type {
  pointer-events: none;
  z-index: 1;
}

.audit-compliance-level-tooltip {
  position: relative;
  z-index: 1;
}

/* Make button take full column width */
.audit-main-action {
  justify-content: center;
  width: initial;
  z-index: 1;
}

.delete-button {
  color: var(--error-425-625);
}
</style>

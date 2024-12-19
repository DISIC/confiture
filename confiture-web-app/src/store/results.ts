import ky from "ky";
import { has, sample, setWith, unset } from "lodash-es";
import { defineStore } from "pinia";

import {
  AuditFile,
  CriterionResultUserImpact,
  CriteriumResult,
  CriteriumResultStatus,
  FileDisplay
} from "../types";
import { useAuditStore } from "./audit";
import { useFiltersStore } from "./filters";

type PageId = number;
type TopicNumber = number;
type CriteriumNumber = number;

const getLastRequestTimestampStorageKey = (auditId: string) =>
  `confiture:lastRequestTimestamp:${auditId}`;

interface ResultsStoreState {
  auditId: string | null;

  data: {
    [key: PageId]: {
      [key: TopicNumber]: {
        [key: CriteriumNumber]: CriteriumResult;
      };
    };
  } | null;

  /**
   * Store the statuses history when using the "Topic not applicable"
   * switch in case of a misclick.
   */
  previousStatuses: {
    [key: PageId]: {
      [key: TopicNumber]: {
        [key: CriteriumNumber]: CriteriumResultStatus;
      };
    };
  };

  /**
   * Number of update requests actually loading.
   *
   * When 0, nothing is loading.
   * When 1 or more, there's something loading.
   */
  currentRequestCount: number;

  /**
   * Timestamp of the last moment `currentRequestCount` changed from a non-zero value to zero.
   */
  lastRequestSuccessEnd: number | null;
}

export const useResultsStore = defineStore("results", {
  state: (): ResultsStoreState => {
    return {
      auditId: null,
      data: null,
      previousStatuses: {},
      currentRequestCount: 0,
      lastRequestSuccessEnd: null
    };
  },

  getters: {
    /**
     * @returns A single criterium result if it is available, undefined otherwise.
     */
    getCriteriumResult() {
      return (pageId: number, topicNumber: number, criteriumNumber: number) => {
        if (
          !this.data ||
          !this.data[pageId] ||
          !this.data[pageId][topicNumber] ||
          !this.data[pageId][topicNumber][criteriumNumber]
        ) {
          return;
        }

        return this.data[pageId][topicNumber][criteriumNumber];
      };
    },

    /**
     * @returns A getter returning all the results concerning a particular topic on a particular audited page.
     */
    getTopicResults() {
      return (pageId: number, topicNumber: number) => {
        if (
          !this.data ||
          !this.data[pageId] ||
          !this.data[pageId][topicNumber]
        ) {
          return [];
        }

        return Object.values(this.data[pageId][topicNumber]);
      };
    },

    /**
     * @returns Every results in a list. Or undefined if the data is not fetched yet.
     */
    allResults(): CriteriumResult[] | undefined {
      if (!this.data) {
        return;
      }
      return Object.values(this.data)
        .map((page) => Object.values(page).map((topic) => Object.values(topic)))
        .flat(2);
    },

    /**
     * @returns True when every criterium (transverse excluded) in the audit have been tested (status is different from NOT_TESTED)
     */
    everyCriteriumAreTested(): boolean {
      const auditStore = useAuditStore();
      const transversePageId =
        auditStore.currentAudit?.transverseElementsPage.id;

      return !(
        this.allResults
          ?.filter((r) => r.pageId !== transversePageId)
          .some((r) => r.status === CriteriumResultStatus.NOT_TESTED) ?? true
      );
    },

    testedCriteriumCount(): number | undefined {
      return this.allResults?.filter(
        (r) => r.status !== CriteriumResultStatus.NOT_TESTED
      ).length;
    },

    /**
     * @returns Number of pages in the audit
     */
    pagesCount(): number {
      return this.data ? Object.keys(this.data).length : 0;
    },

    isLoading(): boolean {
      return this.currentRequestCount > 0;
    },

    /**
     * Ratio of tested criteria over total number of criteria.
     * Transverse criteria are excluded.
     *
     * `0.5` means half of the audit criteria have been tested.
     */
    auditProgress(): number {
      if (!this.data) {
        return 0;
      }

      const auditStore = useAuditStore();
      const transversePageId =
        auditStore.currentAudit?.transverseElementsPage.id;

      const r = Object.values(this.data)
        .flatMap(Object.values)
        .flatMap(Object.values)
        .filter((cr) => cr.pageId !== transversePageId) as CriteriumResult[];

      const total = r.length;

      const testedCriteria = r.filter(
        (t) => t.status !== CriteriumResultStatus.NOT_TESTED
      ).length;

      return testedCriteria / total;
    }
  },

  actions: {
    async fetchResults(uniqueId: string) {
      const response = (await ky
        .get(`/api/audits/${uniqueId}/results`)
        .json()) as CriteriumResult[];

      const data: ResultsStoreState["data"] = {};

      response.forEach((r) => {
        if (!(r.pageId in data)) {
          data[r.pageId] = {};
        }

        if (!(r.topic in data[r.pageId])) {
          data[r.pageId][r.topic] = {};
        }

        data[r.pageId][r.topic][r.criterium] = r;
      });

      const storageKey = getLastRequestTimestampStorageKey(uniqueId);
      this.lastRequestSuccessEnd =
        Number(localStorage.getItem(storageKey)) || null;

      this.auditId = uniqueId;
      this.data = data;
    },

    async updateResults(uniqueId: string, updates: CriteriumResult[]) {
      if (!this.data) {
        return;
      }

      const previousResults: CriteriumResult[] = [];

      updates.forEach((update) => {
        if (!this.data) {
          return;
        }

        previousResults.push(
          this.data[update.pageId][update.topic][update.criterium]
        );

        // Update UI immediately, rollbacks later if update fails.
        this.data[update.pageId][update.topic][update.criterium] = update;
      });

      // update the edition date of the local audit. It will not be the same
      // value as the one stored in the DB but it is close enough in our case
      const auditStore = useAuditStore();
      if (auditStore.currentAudit) {
        auditStore.currentAudit.editionDate = new Date().toISOString();
      }

      // update filter store to record evaluated criteria
      const filterStore = useFiltersStore();
      if (filterStore.hideEvaluatedCriteria) {
        filterStore.newEvaluatedCriteria = [
          ...new Set([
            ...filterStore.newEvaluatedCriteria,
            ...updates.map((u) => {
              return `${u.pageId}.${u.topic}.${u.criterium}`;
            })
          ])
        ];
      }

      // Called when update fails, and UI must rollback to the previous result states
      const rollbackResults = () => {
        previousResults.forEach((result) => {
          if (!this.data) {
            return;
          }
          this.data[result.pageId][result.topic][result.criterium] = result;
        });
      };

      this.increaseCurrentRequestCount();

      await ky
        .patch(`/api/audits/${uniqueId}/results`, {
          json: {
            data: updates
          }
        })
        .catch((err) => {
          rollbackResults();
          throw err;
        })
        .finally(() => {
          this.decreaseCurrentRequestCount();
        });
    },

    /**
     * Send a batch of updates to the API setting the status of every
     * criterium of a particular topic in a particular audited page to the
     * given value.
     *
     * Also save the current status values in order to revert the change if needed.
     */
    async setTopicStatus(
      uniqueId: string,
      pageId: number,
      topicNumber: number,
      status: CriteriumResultStatus
    ) {
      const results = this.getTopicResults(pageId, topicNumber);

      if (status === CriteriumResultStatus.NOT_APPLICABLE) {
        results.forEach((r) => {
          setWith(
            this.previousStatuses,
            [r.pageId, r.topic, r.criterium],
            r.status,
            Object
          );
        });
      }

      const updates = results.map((r) => ({
        ...r,
        status
      }));

      await this.updateResults(uniqueId, updates);
    },

    /**
     * Send a batch of updates to the API setting the status of every
     * criterium of a particular topic in a particular audited page to the
     * values they had at the time of calling setTopicStatus().
     *
     * If there are no previous values saved, all statuses are set to NOT_TESTED.
     */
    async revertTopicStatus(
      uniqueId: string,
      pageId: number,
      topicNumber: number
    ) {
      if (has(this.previousStatuses, [pageId, topicNumber])) {
        const updates = Object.entries(
          this.previousStatuses[pageId][topicNumber]
        ).map(([criterium, status]) => {
          return {
            ...this.getCriteriumResult(pageId, topicNumber, Number(criterium))!,
            status
          };
        });
        await this.updateResults(uniqueId, updates);
        unset(this.previousStatuses, [pageId, topicNumber]);
      } else {
        await this.setTopicStatus(
          uniqueId,
          pageId,
          topicNumber,
          CriteriumResultStatus.NOT_TESTED
        );
      }
    },

    async uploadExampleImage(
      uniqueId: string,
      pageId: number,
      topic: number,
      criterium: number,
      file: File,
      display?: FileDisplay
    ) {
      const formData = new FormData();
      formData.set("pageId", pageId.toString());
      formData.set("topic", topic.toString());
      formData.set("criterium", criterium.toString());
      // To handle non-ascii characters, we encode the filename here and decode it on the back
      formData.set("image", file, encodeURI(file.name));
      if (display) {
        formData.set("display", display.toString());
      }

      this.increaseCurrentRequestCount();

      const exampleImage = (await ky
        .post(`/api/audits/${uniqueId}/results/examples`, {
          body: formData
        })
        .json()
        .finally(() => {
          this.decreaseCurrentRequestCount();
        })) as AuditFile;

      const result = this.data![pageId][topic][criterium];

      if (result) {
        result.exampleImages.push(exampleImage);
      }
    },

    async deleteExampleImage(
      uniqueId: string,
      pageId: number,
      topic: number,
      criterium: number,
      exampleId: number
    ) {
      this.increaseCurrentRequestCount();

      await ky
        .delete(`/api/audits/${uniqueId}/results/examples/${exampleId}`)
        .finally(() => {
          this.decreaseCurrentRequestCount();
        });

      const result = this.data![pageId][topic][criterium];

      if (result) {
        const exampleIndex = result.exampleImages.findIndex(
          (ex) => ex.id === exampleId
        );

        result.exampleImages.splice(exampleIndex, 1);
      }
    },

    increaseCurrentRequestCount() {
      this.currentRequestCount++;
    },

    /**
     * When `currentRequestCount` changes from a non-zero value to zero, save a timestamp to the store and localstorage
     */
    decreaseCurrentRequestCount() {
      this.currentRequestCount--;

      if (this.currentRequestCount === 0) {
        this.lastRequestSuccessEnd = Date.now();
        const key = getLastRequestTimestampStorageKey(this.auditId!);
        localStorage.setItem(key, this.lastRequestSuccessEnd.toString());
      }
    },

    /**
     * Fill the entire audit with random values for debugging purpose.
     */
    async DEV_fillResults(uniqueId: string) {
      const auditStore = useAuditStore();
      const updates =
        this.allResults?.map((r) => ({
          ...r,
          /* eslint-disable @typescript-eslint/no-non-null-assertion */
          status: sample([
            CriteriumResultStatus.COMPLIANT,
            CriteriumResultStatus.NOT_COMPLIANT,
            CriteriumResultStatus.NOT_APPLICABLE
          ])!,
          compliantComment: sample(["Commentaire conforme", "Rien"])!,
          notCompliantComment: sample(["Commentaire non conforme", "Rien"])!,
          notApplicableComment: sample(["Commentaire non-applicable", "Rien"])!,
          userImpact: sample(CriterionResultUserImpact)!
          /* eslint-enable @typescript-eslint/no-non-null-assertion */
        })) ?? [];

      await this.updateResults(uniqueId, updates);
      await auditStore.publishAudit(uniqueId);
    }
  }
});

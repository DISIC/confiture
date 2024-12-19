import ky from "ky";
import { sortBy } from "lodash-es";
import { defineStore } from "pinia";

import {
  Audit,
  AuditFile,
  CreateAuditRequestData,
  FileDisplay,
  UpdateAuditRequestData
} from "../types";
import { AccountAudit } from "../types/account";
import { useAccountStore } from "./account";

const getLastRequestTimestampStorageKey = (auditId: string) =>
  `confiture:lastNotesRequestTimestamp:${auditId}`;

interface AuditStoreState {
  currentPageId: number | null;
  showAuditEmailAlert: boolean;

  currentAuditId: string | null;
  entities: Record<string, Audit>;
  listing: AccountAudit[];

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

export const useAuditStore = defineStore("audit", {
  state: (): AuditStoreState => ({
    currentPageId: null,
    showAuditEmailAlert: false,

    currentAuditId: null,
    entities: {},
    listing: [],
    currentRequestCount: 0,
    lastRequestSuccessEnd: null
  }),
  actions: {
    async createAudit(data: CreateAuditRequestData): Promise<Audit> {
      const accountStore = useAccountStore();
      const response = (await ky
        .post("/api/audits", {
          json: data,
          headers: accountStore.authToken
            ? { Authorization: `Bearer ${accountStore.authToken}` }
            : undefined
        })
        .json()) as Audit;
      return response;
    },

    setAudit(id: string, audit: Audit) {
      this.entities[id] = {
        ...audit,
        pages: sortBy(audit.pages, "order")
      };
    },

    async fetchAudit(editUniqueId: string) {
      this.currentAuditId = editUniqueId;
      const data = (await ky
        .get(`/api/audits/${editUniqueId}`)
        .json()) as Audit;

      this.setAudit(editUniqueId, data);
    },

    async fetchAuditIfNeeded(editUniqueId: string) {
      this.currentAuditId = editUniqueId;
      if (this.entities[editUniqueId]) {
        return;
      }
      await this.fetchAudit(editUniqueId);
    },

    async updateAudit(
      uniqueId: string,
      data: UpdateAuditRequestData
    ): Promise<Audit> {
      const response = (await ky
        .put(`/api/audits/${uniqueId}`, {
          json: data
        })
        .json()) as Audit;
      this.setAudit(uniqueId, response);
      return response;
    },

    async updateAuditNotes(uniqueId: string, data: { notes?: string }) {
      const previousNotes = this.entities[uniqueId]?.notes;

      if (this.entities[uniqueId]) {
        this.entities[uniqueId].notes = data.notes ?? null;
      }

      this.increaseCurrentRequestCount();

      await ky
        .patch(`/api/audits/${uniqueId}`, {
          json: data
        })
        .json()
        .catch((error) => {
          if (this.entities[uniqueId] && previousNotes) {
            this.entities[uniqueId].notes = previousNotes;
          }
          throw error;
        })
        .finally(() => {
          this.decreaseCurrentRequestCount();
        });
    },

    async deleteAudit(uniqueId: string): Promise<void> {
      await ky.delete(`/api/audits/${uniqueId}`);
      delete this.entities[uniqueId];
      this.listing = this.listing.filter(
        (audit) => audit.editUniqueId !== uniqueId
      );
      if (this.currentAuditId === uniqueId) {
        this.currentAuditId = null;
      }
    },

    async uploadAuditFile(
      uniqueId: string,
      file: File,
      display?: FileDisplay
    ): Promise<AuditFile> {
      const formData = new FormData();
      // To handle non-ascii characters, we encode the filename here and decode it on the back
      formData.set("file", file, encodeURI(file.name));
      if (display) {
        formData.set("display", display.toString());
      }

      this.increaseCurrentRequestCount();
      const notesFile = (await ky
        .post(`/api/audits/${uniqueId}/notes/files`, {
          body: formData
        })
        .json()
        .finally(() => {
          this.decreaseCurrentRequestCount();
        })) as AuditFile;

      const notesFiles = this.entities[uniqueId].notesFiles || [];
      notesFiles.push(notesFile);
      return notesFile;
    },

    async deleteAuditFile(uniqueId: string, fileId: number) {
      this.increaseCurrentRequestCount();
      await ky
        .delete(`/api/audits/${uniqueId}/notes/files/${fileId}`)
        .finally(() => {
          this.decreaseCurrentRequestCount();
        });

      const notesFiles = this.entities[uniqueId].notesFiles || [];
      const fileIndex = notesFiles.findIndex((f) => f.id === fileId);

      notesFiles.splice(fileIndex, 1);
    },

    async publishAudit(uniqueId: string): Promise<Audit> {
      const response = (await ky
        .put(`/api/audits/${uniqueId}/publish`)
        .json()) as Audit;
      this.setAudit(uniqueId, response);
      return response;
    },

    /**
     * @param uniqueId Id of the audit to duplicate
     * @returns A promise to the unique id of the copy
     */
    async duplicateAudit(uniqueId: string, copyName: string): Promise<string> {
      const accountStore = useAccountStore();

      const newAudit = (await ky
        .post(`/api/audits/${uniqueId}/duplicate`, {
          json: {
            procedureName: copyName
          },
          headers: accountStore.authToken
            ? { Authorization: `Bearer ${accountStore.authToken}` }
            : undefined,
          // Duplicating an audit can be a pretty long process
          timeout: false
        })
        .json()) as Audit;

      const originalAuditListingItem = this.listing.find(
        (audit) => audit.editUniqueId === uniqueId
      );

      // If audit is duplicated from the audit list, add a new item to the list
      if (originalAuditListingItem) {
        const newAuditListItem: AccountAudit = {
          auditType: newAudit.auditType,
          complianceLevel: originalAuditListingItem.complianceLevel,
          consultUniqueId: newAudit.consultUniqueId,
          creationDate: newAudit.creationDate!,
          editUniqueId: newAudit.editUniqueId,
          procedureName: newAudit.procedureName,
          status: originalAuditListingItem.status,
          estimatedCsvSize: originalAuditListingItem.estimatedCsvSize,
          statementIsPublished: originalAuditListingItem.statementIsPublished
        };
        this.listing.push(newAuditListItem);
      }

      return newAudit.editUniqueId;
    },

    // FIXME: move this to filter store?
    async updateCurrentPageId(id: number | null) {
      this.currentPageId = id;
    },

    async fetchAudits() {
      const accountStore = useAccountStore();
      const audits = (await ky
        .get("/api/audits", {
          headers: { Authorization: `Bearer ${accountStore.authToken}` }
        })
        .json()) as AccountAudit[];

      this.listing = audits;
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
        const key = getLastRequestTimestampStorageKey(this.currentAuditId!);
        localStorage.setItem(key, this.lastRequestSuccessEnd.toString());
      }
    }
  },
  getters: {
    currentAudit(state) {
      if (!state.currentAuditId) {
        return null;
      }
      return state.entities[state.currentAuditId];
    },

    isLoading(): boolean {
      return this.currentRequestCount > 0;
    }
  }
});

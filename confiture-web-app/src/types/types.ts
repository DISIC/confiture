import { components } from "./confiture-api";

export interface AuditRecipent {
  id: number;
  name: string;
  email: string;
}

export interface AuditEnvironment {
  id: number;
  platform: string;
  operatingSystem: string;
  assistiveTechnology: string;
  browser: string;
}

export interface AuditPage {
  id: number;
  order: number;
  name: string;
  url: string;
}

export enum AuditType {
  FAST = "FAST",
  COMPLEMENTARY = "COMPLEMENTARY",
  FULL = "FULL"
}

export type AuditTypeString = `${AuditType}`;

export enum AuditStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  PUBLISHABLE = "PUBLISHABLE"
}

/** An audit object as returned by the API. */
export interface Audit {
  id: number;
  editUniqueId: string;
  consultUniqueId: string;

  creationDate: string | null;
  publicationDate: string | null;
  editionDate: string | null;

  // Audit creation
  auditType: AuditType;
  procedureName: string;
  transverseElementsPage: AuditPage;
  pages: AuditPage[];
  auditorEmail: string;
  auditorName: string | null;

  // A11y declaration edition
  technologies: string[];
  procedureUrl: string | null;
  initiator: string | null;
  auditorOrganisation: string;
  tools: string[];
  environments: AuditEnvironment[];
  contactName: string | null;
  contactEmail: string | null;
  contactFormUrl: string | null;
  notCompliantContent: string | null;
  derogatedContent: string | null;
  notInScopeContent: string | null;
  notes: string | null;
  notesFiles: AuditFile[];
}

/** Audit type fields needed to create an audit */
export interface CreateAuditRequestData {
  auditType: AuditType | null;
  procedureName: string;
  pages: Omit<AuditPage, "id" | "order">[];
  auditorEmail: string;
  auditorName: string | null;
}

/** Creation data type plus step 2 fields. */
export type UpdateAuditRequestData = Omit<Audit, "environments" | "pages"> & {
  environments: Omit<AuditEnvironment, "id">[];
  pages: Omit<AuditPage, "id" | "order">[];
};

export interface CreateFeedbackRequestData {
  easyToUse: string;
  easyToUnderstand: string;

  feedback: string;
  suggestions: string;

  name?: string;
  email?: string;
  occupations?: string[];
}

export enum CriteriumResultStatus {
  NOT_TESTED = "NOT_TESTED",
  COMPLIANT = "COMPLIANT",
  NOT_COMPLIANT = "NOT_COMPLIANT",
  NOT_APPLICABLE = "NOT_APPLICABLE"
}

export enum CriterionResultUserImpact {
  MINOR = "MINOR",
  MAJOR = "MAJOR",
  BLOCKING = "BLOCKING"
}

export type AuditFile = components["schemas"]["AuditFile"];

export type NotesFile = components["schemas"]["NotesFile"];

export interface CriteriumResult {
  // ID
  topic: number;
  criterium: number;
  pageId: number;

  // DATA
  status: CriteriumResultStatus;

  compliantComment: string | null;
  notCompliantComment: string | null;
  userImpact: CriterionResultUserImpact | null;
  notApplicableComment: string | null;
  exampleImages: AuditFile[];
  quickWin: boolean;
}

export enum StoreName {
  AUDIT_STORE = "AUDIT_STORE",
  RESULTS_STORE = "RESULTS_STORE"
}

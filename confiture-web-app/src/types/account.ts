import { AuditStatus, AuditType } from "./types";

export interface Account {
  id: string;
  email: string;
  name?: string;
  orgName?: string;
}

export interface UpdateProfileRequestData {
  /** John Doe */
  name: string | null;
  /** ACME */
  orgName?: string | null;
}

export interface AccountDeletionResponse {
  feedbackToken: string;
}

export interface AccountAudit {
  procedureName: string;
  status:
    | AuditStatus.NOT_STARTED
    | AuditStatus.IN_PROGRESS
    | AuditStatus.COMPLETED;
  progress: number;
  creationDate: string;
  auditType: AuditType;
  complianceLevel: number;
  editUniqueId: string;
  consultUniqueId: string;
  estimatedCsvSize: number;
  statementIsPublished: boolean;
}

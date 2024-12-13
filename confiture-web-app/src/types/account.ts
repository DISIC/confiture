import { components, paths } from "./confiture-api";

export type UpdateProfileRequestData =
  paths["/profile"]["patch"]["requestBody"]["content"]["application/json"];

export type AccountDeletionResponse =
  paths["/auth/account"]["delete"]["responses"]["200"]["content"]["application/json"];

export type AccountAudit = components["schemas"]["AuditListingItemDto"];

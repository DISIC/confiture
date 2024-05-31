import { CriteriumResult } from "../types";
import { paths } from "./confiture-api";

export type AuditReport =
  paths["/reports/{consultUniqueId}"]["get"]["responses"]["200"]["content"]["application/json"];

export type ReportCriteriumResult = Omit<CriteriumResult, "exampleImages"> & {
  exampleImages: {
    key: string;
    thumbnailKey: string;
    filename: string;
  }[];
};

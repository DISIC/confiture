import { components, paths } from "./confiture-api";

export type AuditReport =
  paths["/reports/{consultUniqueId}"]["get"]["responses"]["200"]["content"]["application/json"];

export type ReportCriteriumResult =
  components["schemas"]["ReportCriterionResult"];

export type ReportUserImpact =
  components["schemas"]["ReportCriterionResult"]["userImpact"];

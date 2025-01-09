import { groupBy, mapValues, sortBy } from "lodash-es";

import rgaa from "../../criteres.json";
import { ReportStoreState } from "../../store";
import {
  AuditReport,
  CriteriumResultStatus,
  ReportCriteriumResult
} from "../../types";

export type ReportImprovement = {
  id: number;
  url: string;
  order: number;
  name: string;
  topics: {
    number: number;
    name?: string;
    improvements: {
      criterium: number;
      comment: string | null;
      status: CriteriumResultStatus;
    }[];
  }[];
};

export function getReportImprovements(
  report: ReportStoreState
): ReportImprovement[] {
  const resultsGroupedByPage = {
    // include pages with no errors
    ...report.data?.context.samples.reduce<Record<string, []>>((acc, val) => {
      acc[val.id] = [];
      return acc;
    }, {}),

    ...groupBy(
      report.data?.results.filter((r) => {
        return (
          (r.status === CriteriumResultStatus.COMPLIANT &&
            r.compliantComment) ||
          (r.status === CriteriumResultStatus.NOT_APPLICABLE &&
            r.notApplicableComment)
        );
      }),
      "pageId"
    )
  } as Record<number, AuditReport["results"]>;

  return sortBy(
    Object.entries(resultsGroupedByPage).map(([pageId, results]) => {
      return {
        id: Number(pageId),
        order: getPage(report, pageId).order,
        name: getPage(report, pageId).name,
        url: getPage(report, pageId).url,
        topics: sortBy(
          Object.values(
            mapValues(groupBy(results, "topic"), (results, topicNumber) => {
              return {
                number: Number(topicNumber),
                name: getTopicName(Number(topicNumber)),
                improvements: sortBy(
                  results.filter(hasImprovement).map(getImprovementObject),
                  "criterium"
                ) as ReportImprovement["topics"][0]["improvements"]
              };
            })
          ),
          "topic"
        )
      };
    }),
    (el) => el.order
  );
}

function getPage(report: ReportStoreState, pageId: number | string) {
  return report.data!.context.samples.find((p) => p.id === Number(pageId))!;
}

function getTopicName(topicNumber: number) {
  return rgaa.topics.find((t) => t.number === topicNumber)?.topic;
}

const hasImprovement = (r: ReportCriteriumResult) =>
  (r.status === CriteriumResultStatus.COMPLIANT && r.compliantComment) ||
  (r.status === CriteriumResultStatus.NOT_APPLICABLE && r.notApplicableComment);

const getImprovementObject = (r: ReportCriteriumResult) => {
  return {
    criterium: r.criterium,
    status: r.status,
    comment:
      r.status === CriteriumResultStatus.COMPLIANT
        ? r.compliantComment
        : r.notApplicableComment
  };
};

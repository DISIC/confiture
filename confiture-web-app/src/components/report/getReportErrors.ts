import { groupBy, mapValues, sortBy } from "lodash-es";

import rgaa from "../../criteres.json";
import { ReportStoreState } from "../../store";
import {
  AuditReport,
  CriteriumResultStatus,
  ReportCriteriumResult,
  ReportUserImpact
} from "../../types";

export type ReportError = {
  id: number;
  name?: string;
  order: number;
  url: string;
  topics: {
    topic: number;
    name?: string;
    errors: ReportCriteriumResult[];
  }[];
};

export function getReportErrors(
  report: ReportStoreState,
  quickWinFilter: boolean,
  userImpactFilters: Array<ReportUserImpact>
): ReportError[] {
  const resultsGroupedByPage = {
    // include pages with no errors
    ...report.data?.context.samples.reduce<Record<string, []>>((acc, val) => {
      acc[val.id] = [];
      return acc;
    }, {}),

    ...groupBy(
      report.data?.results
        .filter((r) => {
          return (
            r.status === CriteriumResultStatus.NOT_COMPLIANT &&
            userImpactFilters.includes(r.userImpact)
          );
        })
        .filter((r) => {
          return quickWinFilter ? r.quickWin : r;
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
                topic: Number(topicNumber),
                name: getTopicName(Number(topicNumber)),
                errors: sortBy(results, "criterium")
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

import { ApiProperty } from "@nestjs/swagger";
import {
  AuditType,
  CriterionResultStatus,
  CriterionResultUserImpact
} from "@prisma/client";

export class AuditReportDto {
  /** Unique ID used to construct the report URL. */
  consultUniqueId: string;

  contactEmail?: string;
  contactFormUrl?: string;

  procedureInitiator?: string;
  procedureName: string;
  procedureUrl?: string;

  creationDate?: Date;
  publishDate?: Date;
  updateDate?: Date;

  notCompliantContent?: string;
  derogatedContent?: string;
  notInScopeContent?: string;
  notes?: string;
  notesFiles: NotesFile[];

  @ApiProperty({ enum: AuditType })
  auditType: AuditType;

  context: ReportContext;

  /**
   * Rate out of 100%.
   * @example 86
   */
  accessibilityRate: number;

  criteriaCount: CriteriaCount;

  /** Global distribution of criteria by result */
  resultDistribution: ResultDistribution;

  /** Distribution of criteria by page */
  pageDistributions: PageResultDistribution[];

  /** Distribution of criteria by topic */
  topicDistributions: TopicResultDistribution[];

  results: ReportCriterionResult[];
}

class CriteriaCount {
  /** @example 106 */
  total: number;
  /** @example 30 */
  compliant: number;
  /** @example 46 */
  notCompliant: number;
  /** @example 12 */
  blocking: number;
  /** @example 76 */
  applicable: number;
  /** @example 30 */
  notApplicable: number;
}

class RawAndPercentage {
  /**
   * @example 47
   */
  raw: number;
  /**
   * @example 44.34
   */
  percentage: number;
}

class ResultDistribution {
  compliant: RawAndPercentage;
  notCompliant: RawAndPercentage;
  notApplicable: RawAndPercentage;
}

class PageResultDistribution extends ResultDistribution {
  /**
   * @example "Accueil"
   */
  name: string;
}

class TopicResultDistribution extends ResultDistribution {
  /**
   * @example "Éléments obligatoires"
   */
  name: string;
}

class ReportContext {
  /**
   * @example "RGAA Version 4.1"
   */
  referencial: string;

  /**
   * @example "Pierre Poljak"
   */
  auditorName: string;
  /**
   * @example "john-doe@example.com"
   */
  auditorEmail: string | null;
  /**
   * @example "Web Audit Services Corp."
   */
  auditorOrganisation: string;

  technologies: string[];

  samples: PageSample[];

  // TODO: derogated content
  // derogatedContent: any

  tools: string[];

  environments: Environment[];
}

class PageSample {
  id: number;
  number: number;
  order: number;
  name: string;
  url: string;
}

class Environment {
  /**
   * @example "Mobile"
   */
  platform: string;
  /**
   * @example "Windows"
   */
  operatingSystem: string;

  /**
   * @example "JAWS"
   */
  assistiveTechnology: string;

  /**
   * @example "Firefox"
   */
  browser: string;
}

class ReportCriterionResult {
  /** @example 2 */
  topic: number;
  /** @example 3 */
  criterium: number;
  /** @example 234 */
  pageId: number;

  /**
   * @example "NOT_COMPLIANT"
   */
  @ApiProperty({ enum: CriterionResultStatus })
  status: CriterionResultStatus;

  compliantComment: string | null;

  /**
   * @example "There is an accessibility error there. You should do this and that."
   */
  notCompliantComment: string | null;
  exampleImages: ExampleImage[];
  /**
   * @example "MAJOR"
   */
  @ApiProperty({ enum: CriterionResultUserImpact })
  userImpact: CriterionResultUserImpact | null;

  notApplicableComment: string | null;

  quickWin: boolean;
}

class ExampleImage {
  /** @example "mon-image.jpg" */
  filename: string;
  /** @example "audit/xxxx/my-image.jpg" */
  key: string;
  /** @example "audit/xxxx/my-image_thumbnail.jpg" */
  thumbnailKey: string;
}

class NotesFile {
  originalFilename: string;
  key: string;
  thumbnailKey: string;
  size: number;
  mimetype: string;
}

import { ApiProperty } from "@nestjs/swagger";
import {
  AuditType,
  CriterionResultStatus,
  CriterionResultUserImpact,
  FileDisplay
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

  /**
   * @example {
   *  total: 106;
   *  compliant: 30;
   *  notCompliant: 46;
   *  blocking: 12;
   *  applicable: 76;
   *  notApplicable: 30;
   * }
   */
  criteriaCount: {
    total: number;
    compliant: number;
    notCompliant: number;
    blocking: number;
    applicable: number;
    notApplicable: number;
  };

  /** Global distribution of criteria by result */
  resultDistribution: ResultDistribution;

  /** Distribution of criteria by page */
  pageDistributions: PageResultDistribution[];

  /** Distribution of criteria by topic */
  topicDistributions: TopicResultDistribution[];

  results: ReportCriterionResult[];
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
}

class ExampleImage {
  /** @example "my-image.jpg" */
  filename: string;
  /** @example "audit/EWIsM6sYI2cC0lI7Ok2PE/3gnCTQ5ztOdEnKRraIMYG/my-image.jpg" */
  key: string;
  /** @example "audit/EWIsM6sYI2cC0lI7Ok2PE/3gnCTQ5ztOdEnKRraIMYG/my-image_thumbnail.jpg" */
  thumbnailKey: string;
  /** @example "ATTACHMENT" */
  display: FileDisplay;
}

class NotesFile {
  /** @example "screenshot_001.png" */
  originalFilename: string;
  /** @example "audits/EWIsM6sYI2cC0lI7Ok2PE/uqoOes4QqhFyKV8v0s2AQ/screenshot_001.png" */
  key: string;
  /** @example "audits/EWIsM6sYI2cC0lI7Ok2PE/uqoOes4QqhFyKV8v0s2AQ/thumbnail_screenshot_001.png" */
  thumbnailKey: string;
  /** @example 4631 */
  size: number;
  /** @example "image/png" */
  mimetype: string;
  /** @example "ATTACHMENT" */
  display: FileDisplay;
}

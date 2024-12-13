import { ApiProperty } from "@nestjs/swagger";
import { AuditType } from "@prisma/client";

export class AuditListingItemDto {
  procedureName: string;
  editUniqueId: string;
  consultUniqueId: string;
  creationDate: Date;
  @ApiProperty({ enum: AuditType })
  auditType: AuditType;
  complianceLevel: number;
  @ApiProperty({ enum: ["NOT_STARTED", "COMPLETED", "IN_PROGRESS"] })
  status: "NOT_STARTED" | "COMPLETED" | "IN_PROGRESS";
  estimatedCsvSize: number;
  statementIsPublished: boolean;
}

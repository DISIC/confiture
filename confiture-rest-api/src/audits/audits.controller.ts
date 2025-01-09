import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  GoneException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiCreatedResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags
} from "@nestjs/swagger";

import { Audit } from "src/generated/nestjs-dto/audit.entity";
import { CriterionResult } from "src/generated/nestjs-dto/criterionResult.entity";
import { MailService } from "../mail/mail.service";
import { AuditExportService } from "./audit-export.service";
import { AuditService } from "./audit.service";
import { CreateAuditDto } from "./dto/create-audit.dto";
import { DuplicateAuditDto } from "./dto/duplicate-audit.dto";
import { UpdateAuditDto } from "./dto/update-audit.dto";
import { PatchAuditDto } from "./dto/patch-audit.dto";
import { UpdateResultsDto } from "./dto/update-results.dto";
import { UploadImageDto } from "./dto/upload-image.dto";
import { AuthRequired } from "src/auth/auth-required.decorator";
import { User } from "src/auth/user.decorator";
import { AuthenticationJwtPayload } from "src/auth/jwt-payloads";
import { AuditListingItemDto } from "./dto/audit-listing-item.dto";
import { StoredFile } from "src/generated/nestjs-dto/storedFile.entity";

@Controller("audits")
@ApiTags("Audits")
export class AuditsController {
  constructor(
    private readonly auditService: AuditService,
    private readonly mailer: MailService,
    private readonly auditExportService: AuditExportService
  ) {}

  /** Save a new audit into the database. */
  @Post()
  @ApiCreatedResponse({
    description: "The audit has been successfully created.",
    type: Audit
  })
  async createAudit(
    @Body() body: CreateAuditDto,
    @User() user: AuthenticationJwtPayload
  ) {
    const audit = await this.auditService.createAudit(body);

    if (!user) {
      this.mailer.sendAuditCreatedMail(audit).catch((err) => {
        console.error(`Failed to send email for audit ${audit.editUniqueId}`);
        console.error(err);
      });
    }

    return audit;
  }

  /**
   * Retrieve list of audits to be displayed on user's dashboard.
   */
  @Get()
  @AuthRequired()
  @ApiOkResponse({ type: AuditListingItemDto, isArray: true })
  async getAuditList(@User() user: AuthenticationJwtPayload) {
    return this.auditService.getAuditsByAuditorEmail(user.email);
  }

  /** Retrieve an audit from the database. */
  @Get("/:uniqueId")
  @ApiOkResponse({ description: "The audit was found.", type: Audit })
  @ApiNotFoundResponse({ description: "The audit does not exist." })
  @ApiGoneResponse({ description: "The audit has been previously deleted." })
  async getAudit(@Param("uniqueId") uniqueId: string) {
    const audit = await this.auditService.findAuditWithEditUniqueId(uniqueId, {
      environments: true,
      transverseElementsPage: true,
      pages: true,
      sourceAudit: {
        select: {
          procedureName: true
        }
      },
      notesFiles: true
    });

    if (!audit) {
      return this.sendAuditNotFoundStatus(uniqueId);
    }

    return audit;
  }

  /** Update an audit data in the database. */
  @Put("/:uniqueId")
  @ApiOkResponse({
    description: "The audit has been successfully updated",
    type: Audit
  })
  @ApiNotFoundResponse({ description: "The audit does not exist." })
  @ApiGoneResponse({ description: "The audit has been previously deleted." })
  async updateAudit(
    @Param("uniqueId") uniqueId: string,
    @Body() body: UpdateAuditDto
  ) {
    const audit = await this.auditService.updateAudit(uniqueId, body);

    if (!audit) {
      return this.sendAuditNotFoundStatus(uniqueId);
    }

    return audit;
  }

  /** Update specific fields of an audit in the database. */
  @Patch("/:uniqueId")
  @ApiOkResponse({
    description: "The audit has been successfully patched"
  })
  @ApiNotFoundResponse({ description: "The audit does not exist." })
  @ApiGoneResponse({ description: "The audit has been previously deleted." })
  async patchAudit(
    @Param("uniqueId") uniqueId: string,
    @Body() body: PatchAuditDto
  ) {
    const audit = await this.auditService.patchAudit(uniqueId, body);

    if (!audit) {
      return this.sendAuditNotFoundStatus(uniqueId);
    }
  }

  @Post("/:uniqueId/results/examples")
  @UseInterceptors(FileInterceptor("image"))
  @ApiCreatedResponse({ type: StoredFile })
  async uploadExampleImage(
    @Param("uniqueId") uniqueId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: "image"
        })
        .addMaxSizeValidator({
          maxSize: 2000000
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
        })
    )
    file: Express.Multer.File,
    @Body() body: UploadImageDto
  ) {
    const audit = await this.auditService.findAuditWithEditUniqueId(uniqueId);

    if (!audit) {
      return this.sendAuditNotFoundStatus(uniqueId);
    }

    return await this.auditService.saveExampleImage(
      uniqueId,
      body.pageId,
      body.topic,
      body.criterium,
      file
    );
  }

  @Post("/:uniqueId/notes/files")
  @UseInterceptors(FileInterceptor("file"))
  async uploadNotesFile(
    @Param("uniqueId") uniqueId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 2000000
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
        })
    )
    file: Express.Multer.File
  ) {
    const audit = await this.auditService.getAuditWithEditUniqueId(uniqueId);

    if (!audit) {
      return this.sendAuditNotFoundStatus(uniqueId);
    }

    return await this.auditService.saveNotesFile(uniqueId, file);
  }

  @Delete("/:uniqueId/results/examples/:exampleId")
  async deleteExampleImage(
    @Param("uniqueId") uniqueId: string,
    @Param("exampleId", new ParseIntPipe()) exampleId: number
  ) {
    const deleted = await this.auditService.deleteExampleImage(
      uniqueId,
      Number(exampleId)
    );

    if (!deleted) {
      throw new NotFoundException();
    }
  }

  @Delete("/:uniqueId/notes/files/:fileId")
  async deleteAuditFile(
    @Param("uniqueId") uniqueId: string,
    @Param("fileId", new ParseIntPipe()) fileId: number
  ) {
    const deleted = await this.auditService.deleteAuditFile(
      uniqueId,
      Number(fileId)
    );

    if (!deleted) {
      throw new NotFoundException();
    }
  }

  /** Retrieve the results of an audit (compliance data) from the database. */
  @Get("/:uniqueId/results")
  @ApiOkResponse({ type: [CriterionResult] })
  @ApiNotFoundResponse({ description: "The audit does not exist." })
  @ApiGoneResponse({ description: "The audit has been previously deleted." })
  async getAuditResults(@Param("uniqueId") uniqueId: string) {
    const results =
      await this.auditService.getResultsWithEditUniqueId(uniqueId);

    if (!results) {
      return this.sendAuditNotFoundStatus(uniqueId);
    }

    return results;
  }

  /** Update the compliance data of an audit. */
  @Patch("/:uniqueId/results")
  @ApiOkResponse({
    description: "The audit results have been successfully updated."
  })
  @ApiNotFoundResponse({ description: "The audit does not exist." })
  @ApiGoneResponse({ description: "The audit has been previously deleted." })
  async updateAuditResults(
    @Param("uniqueId") uniqueId: string,
    @Body() body: UpdateResultsDto
  ) {
    const audit = await this.auditService.findAuditWithEditUniqueId(uniqueId);

    if (!audit) {
      return this.sendAuditNotFoundStatus(uniqueId);
    }

    await this.auditService.updateResults(uniqueId, body);
  }

  /** Flag an audit as "published", completed. */
  @Put("/:uniqueId/publish")
  @ApiOkResponse({ type: Audit })
  @ApiNotFoundResponse({ description: "The audit does not exist." })
  @ApiGoneResponse({ description: "The audit has been previously deleted." })
  async publishAudit(@Param("uniqueId") uniqueId: string) {
    const auditIsComplete = await this.auditService.isAuditComplete(uniqueId);
    if (!auditIsComplete) {
      throw new ConflictException(
        "Cannot publish audit if it is not complete."
      );
    }

    const audit = await this.auditService.publishAudit(uniqueId);

    if (!audit) {
      return this.sendAuditNotFoundStatus(uniqueId);
    }

    return audit;
  }

  /** Delete an audit from the database. */
  @Delete("/:uniqueId")
  @ApiOkResponse({ description: "The audit has been successfully deleted." })
  @ApiNotFoundResponse({ description: "The audit does not exist." })
  @ApiGoneResponse({ description: "The audit has been previously deleted." })
  async deleteAudit(@Param("uniqueId") uniqueId: string) {
    const deleted = await this.auditService.softDeleteAudit(uniqueId);

    if (!deleted) {
      return this.sendAuditNotFoundStatus(uniqueId);
    }
  }

  /** Fully duplicate an audit. This includes
   * - the audit metadata (procedure name, auditor name, etc)
   * - the audited pages
   * - the RGAA results (status, comment, user impact)
   *   - the example images
   */
  @Post("/:uniqueId/duplicate")
  @ApiCreatedResponse({
    description: "The audit has been successfully duplicated."
  })
  @ApiNotFoundResponse({ description: "The audit does not exist." })
  @ApiGoneResponse({ description: "The audit has been previously deleted." })
  async duplicateAudit(
    @Param("uniqueId") uniqueId: string,
    @Body() body: DuplicateAuditDto,
    @User() user: AuthenticationJwtPayload
  ) {
    const newAudit = await this.auditService.duplicateAudit(
      uniqueId,
      body.procedureName
    );

    if (!newAudit) {
      return this.sendAuditNotFoundStatus(uniqueId);
    }

    if (!user) {
      this.mailer.sendAuditCreatedMail(newAudit).catch((err) => {
        console.error(
          `Failed to send email for audit ${newAudit.editUniqueId}`
        );
        console.error(err);
      });
    }

    return newAudit;
  }

  @Get("/:uniqueId/exports/csv")
  @ApiOkResponse({
    description: "An export of the audit results using the CSV format."
  })
  @ApiNotFoundResponse({ description: "The audit does not exist." })
  @ApiGoneResponse({ description: "The audit has been previously deleted." })
  async getCsvExport(@Param("uniqueId") uniqueId: string) {
    const file = await this.auditExportService.getCsvExport(uniqueId);

    if (!file) {
      return this.sendAuditNotFoundStatus(uniqueId);
    }

    return file;
  }

  /**
   * Send 404 (Not Found) status for audits that never existed
   * and 410 (Gone) for audits that existed but were deleted.
   */
  private async sendAuditNotFoundStatus(editUniqueId: string) {
    if (await this.auditService.checkIfAuditWasDeleted(editUniqueId)) {
      throw new GoneException();
    } else {
      throw new NotFoundException();
    }
  }
}

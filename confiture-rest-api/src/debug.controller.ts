import { Body, Controller, Post } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { AuthService } from "./auth/auth.service";
import {
  CriterionResultStatus,
  CriterionResultUserImpact
} from "@prisma/client";
import { nanoid } from "nanoid";
import { CRITERIA } from "./audits/criteria";

@Controller("debug")
export class DebugController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService
  ) {}

  @Post("verification-token")
  async getAccountVerificationToken(@Body() body: { username: string }) {
    const token = this.auth.regenerateVerificationToken(body.username);
    return token;
  }

  @Post("password-reset-verification-token")
  async getPasswordResetVerificationToken(@Body() body: { username: string }) {
    const token = this.auth.generatePasswordResetVerificationToken(
      body.username
    );

    return token;
  }

  @Post("email-update-verification-token")
  async getEmailUpdateVerificationToken(@Body() body: { uid: string }) {
    const token = this.auth.regenerateEmailUpdateVerificationToken(body.uid);

    return token;
  }

  @Post("create-verified-user")
  async createVerifiedUser() {
    const email = `john-doe${Math.random()}@example.com`;
    const password = "pouetpouetpouet";

    await this.auth.createUnverifiedUser(email, password);
    const user = await this.prisma.user.update({
      data: {
        isVerified: true,
        verificationJti: null
      },
      where: {
        username: email
      }
    });

    const authToken = await this.auth.signin(email, password);

    return {
      username: email,
      password,
      authToken,
      uid: user.uid
    };
  }

  @Post("create-audit")
  async createAudit(
    @Body()
    body: {
      isComplete: boolean;
      isPristine: boolean;
      noImprovements: boolean;
      auditorEmail?: string;
    }
  ) {
    const editUniqueId = `edit-${nanoid()}`;
    const reportUniqueId = `report-${nanoid()}`;

    const completedAudit = await this.prisma.audit.create({
      data: {
        editUniqueId: editUniqueId,
        consultUniqueId: reportUniqueId,
        creationDate: new Date(),
        publicationDate: body.isComplete ? new Date() : null,
        auditTrace: {
          create: {
            auditConsultUniqueId: editUniqueId,
            auditEditUniqueId: reportUniqueId
          }
        },
        auditType: "FULL",
        procedureName: "Audit de mon petit site",
        auditorEmail: body.auditorEmail || "etienne.durand@example.com",
        auditorName: "Étienne Durand",
        transverseElementsPage: {
          create: {
            name: "Éléments transverses",
            url: ""
          }
        },
        pages: {
          createMany: {
            data: [
              {
                name: "Accueil",
                url: "https://example.com"
              },
              {
                name: "Contact",
                url: "https://example.com/contact"
              },
              {
                name: "À propos",
                url: "https://example.com/a-propos"
              },
              {
                name: "Blog",
                url: "https://example.com/blog"
              },
              {
                name: "Article",
                url: "https://example.com/blog/article"
              },
              {
                name: "Connexion",
                url: "https://example.com/connexion"
              },
              {
                name: "Documentation",
                url: "https://example.com/documentation"
              },
              {
                name: "FAQ",
                url: "https://example.com/faq"
              }
            ]
          }
        }
      },
      include: {
        transverseElementsPage: true
      }
    });

    const auditPages = await this.prisma.auditedPage.findMany({
      where: {
        auditUniqueId: editUniqueId
      }
    });

    if (!body.isPristine) {
      await Promise.all(
        [completedAudit.transverseElementsPage, ...auditPages].map(async (p) =>
          this.prisma.criterionResult.createMany({
            data: CRITERIA.map((c, i) => ({
              status: [
                CriterionResultStatus.COMPLIANT,
                CriterionResultStatus.NOT_APPLICABLE,
                CriterionResultStatus.NOT_COMPLIANT
              ][i % 3],
              notCompliantComment: "Une erreur ici",
              notApplicableComment: body.noImprovements
                ? null
                : "Attention quand même si ça devient applicable",
              compliantComment: body.noImprovements ? null : "Peut mieux faire",
              quickWin: i % 7 === 0,
              userImpact: [
                CriterionResultUserImpact.MINOR,
                CriterionResultUserImpact.MAJOR,
                CriterionResultUserImpact.BLOCKING,
                null
              ][i % 4],
              topic: c.topic,
              criterium: c.criterium,
              pageId: p.id
            }))
          })
        )
      );
    }

    if (!body.isComplete && !body.isPristine) {
      await this.prisma.criterionResult.delete({
        where: {
          pageId_topic_criterium: {
            topic: 1,
            criterium: 1,
            pageId: auditPages[0].id
          }
        }
      });
    }

    return {
      editId: editUniqueId,
      reportId: reportUniqueId
    };
  }
}

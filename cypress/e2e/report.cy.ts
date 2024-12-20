import * as auditJson from "../fixtures/audit.json";
import * as statementJson from "../fixtures/statement.json";

// FIXME: weird behaviour with page reloads (caused by "fake tabs"?)
describe("Report", () => {
  it("User can see audit in progress banner for in progress audit", () => {
    cy.createTestAudit().then(({ reportId }) => {
      cy.visit(`http://localhost:3000/rapport/${reportId}`);
      cy.contains(
        "Les résultats de ce rapport sont provisoires tant que l’audit n'est pas terminé.",
      );
    });
  });

  it("User can't see audit in progress banner for completed audit", () => {
    cy.createTestAudit({ isComplete: true }).then(({ reportId }) => {
      cy.visit(`http://localhost:3000/rapport/${reportId}`);
      cy.get(".header").contains(auditJson.procedureName);
      cy.contains(
        "Les résultats de ce rapport sont provisoires tant que l’audit n'est pas terminé.",
      ).should("not.exist");
    });
  });

  it("User can see audit header infos", () => {
    cy.createTestAudit({ isComplete: true }).then(({ reportId }) => {
      cy.visit(`http://localhost:3000/rapport/${reportId}`);
      cy.get(".header").contains(auditJson.procedureName);
      cy.get(".header").contains(`URL du site : ${statementJson.procedureUrl}`);
      cy.get(".header").contains("Type d’audit : 106 critères");
      cy.get(".header").contains(
        `Auditeur ou auditrice : ${auditJson.auditorName}`,
      );
    });
  });

  it("User can copy report URL", () => {
    cy.createTestAudit({ isComplete: true }).then(({ reportId }) => {
      cy.visit(`http://localhost:3000/rapport/${reportId}`);
      cy.contains("button", "Copier le lien du rapport").click();
      cy.assertClipboardValue(`http://localhost:3000/rapport/${reportId}`);
      cy.contains(
        "Le lien vers le rapport a bien été copié dans le presse-papier.",
      );
    });
  });

  it("User can download results", () => {
    cy.createTestAudit({ isComplete: true }).then(({ reportId }) => {
      cy.visit(`http://localhost:3000/rapport/${reportId}`);
      cy.contains("button", "Télécharger").click();
      cy.contains("a", "Télécharger l'audit").click();

      cy.readFile("cypress/downloads/audit.csv");
    });
  });

  it("User can see correct pages count and transverse criteria count", () => {
    cy.createTestAudit({ isComplete: true }).then(({ reportId }) => {
      cy.visit(`http://localhost:3000/rapport/${reportId}`);
      cy.get("#repartition-des-criteres-par-pages + .fr-table tbody tr").then(
        (els) => {
          expect(els).to.have.length(8);
        },
      );

      cy.contains(
        "35 critères non conformes concernent des éléments transverses à toutes les pages de l’échantillon.",
      );
    });
  });

  it("User can’t see improvements tab if there are no improvements with comment", () => {
    cy.createTestAudit({
      isComplete: true,
      hasNoImprovementsComments: true,
    }).then(({ reportId }) => {
      cy.visit(`http://localhost:3000/rapport/${reportId}`);
      cy.get(".header").contains(auditJson.procedureName);
      cy.contains("button", "Points d’amélioration").should("not.exist");
    });
  });

  it("User can see pages anchors in improvements tab", () => {
    cy.createTestAudit({ isComplete: true }).then(({ reportId }) => {
      cy.visit(`http://localhost:3000/rapport/${reportId}`);
      cy.contains("button", "Détails des non-conformités").click();
      cy.get("#tabpanel-points-damelioration-panel .fr-sidemenu__item").then(
        (els) => {
          expect(els).to.have.length(9);
        },
      );
    });
  });

  it("User can see pages anchors in errors tab", () => {
    cy.createTestAudit({ isComplete: true }).then(({ reportId }) => {
      cy.visit(`http://localhost:3000/rapport/${reportId}`);
      cy.contains("button", "Détails des non-conformités").click();
      cy.get(
        "#tabpanel-details-des-non-conformites-panel .fr-sidemenu__item",
      ).then((els) => {
        expect(els).to.have.length(9);
      });
    });
  });

  it("User can filter errors", () => {
    cy.createTestAudit({ isComplete: true }).then(({ reportId }) => {
      cy.visit(`http://localhost:3000/rapport/${reportId}`);
      cy.contains("button", "Détails des non-conformités").click();
      cy.contains("315 résultats");
      cy.get(
        "#tabpanel-details-des-non-conformites-panel .criterium-title",
      ).then((els) => {
        expect(els).to.have.length(315);
      });

      // Check & uncheck easy to fix
      cy.contains("Uniquement les erreurs faciles à corriger").click();
      cy.contains("45 résultats");
      cy.get(
        "#tabpanel-details-des-non-conformites-panel .criterium-title",
      ).then((els) => {
        expect(els).to.have.length(45);
      });
      cy.contains("Uniquement les erreurs faciles à corriger").click();

      // Uncheck minor impact
      cy.contains("Mineur (81)").click();
      cy.contains("234 résultats");
      cy.get(
        "#tabpanel-details-des-non-conformites-panel .criterium-title",
      ).then((els) => {
        expect(els).to.have.length(234);
      });

      // Uncheck major impact
      cy.contains("Majeur (81)").click();
      cy.contains("153 résultats");
      cy.get(
        "#tabpanel-details-des-non-conformites-panel .criterium-title",
      ).then((els) => {
        expect(els).to.have.length(153);
      });

      // Uncheck blocking impact
      cy.contains("Bloquant (81)").click();
      cy.contains("72 résultats");
      cy.get(
        "#tabpanel-details-des-non-conformites-panel .criterium-title",
      ).then((els) => {
        expect(els).to.have.length(72);
      });

      // Uncheck not specified impact
      cy.contains("Impact non renseigné (72)").click();
      cy.contains("0 résultats");
      cy.get(
        "#tabpanel-details-des-non-conformites-panel .criterium-title",
      ).should("not.exist");

      // Reset filters
      cy.contains("button", "Réinitialiser les filtres").click();
      cy.contains("315 résultats");
      cy.get(
        "#tabpanel-details-des-non-conformites-panel .criterium-title",
      ).then((els) => {
        expect(els).to.have.length(315);
      });
    });
  });
});

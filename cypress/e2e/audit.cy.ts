import * as auditJson from "../fixtures/audit.json";
import * as statementJson from "../fixtures/statement.json";

describe("Audit", () => {
  it("User can create an audit", () => {
    function fillPageField(pageIndex: number, field: string, content: string) {
      cy.contains("Page " + pageIndex)
        .parent()
        .parent()
        .contains(field)
        .parent()
        .find("input")
        .clear()
        .type(content);
    }

    cy.visit("http://localhost:3000");

    // Navigate to new audit page
    cy.contains("a", "Je réalise un audit").click();

    // Fill fields
    cy.contains("106 critères").click();

    cy.contains("Nom du site à auditer")
      .parent()
      .find("input")
      .type(auditJson.procedureName);

    cy.contains("button", "Étape suivante").click();
    cy.contains("button", "Ajouter une page").click();

    fillPageField(1, "Nom de la page", auditJson.pages[0].name);
    fillPageField(1, "URL de la page", auditJson.pages[0].url);
    fillPageField(2, "Nom de la page", auditJson.pages[1].name);
    fillPageField(2, "URL de la page", auditJson.pages[1].url);
    fillPageField(3, "Nom de la page", auditJson.pages[2].name);
    fillPageField(3, "URL de la page", auditJson.pages[2].url);
    fillPageField(4, "Nom de la page", auditJson.pages[3].name);
    fillPageField(4, "URL de la page", auditJson.pages[3].url);
    fillPageField(5, "Nom de la page", auditJson.pages[4].name);
    fillPageField(5, "URL de la page", auditJson.pages[4].url);
    fillPageField(6, "Nom de la page", auditJson.pages[5].name);
    fillPageField(6, "URL de la page", auditJson.pages[5].url);
    fillPageField(7, "Nom de la page", auditJson.pages[6].name);
    fillPageField(7, "URL de la page", auditJson.pages[6].url);
    fillPageField(8, "Nom de la page", auditJson.pages[7].name);
    fillPageField(8, "URL de la page", auditJson.pages[7].url);

    cy.contains("button", "Étape suivante").click();

    // Fill auditor informations
    cy.contains("Adresse e-mail")
      .parent()
      .find("input")
      .type(auditJson.auditorEmail);

    cy.contains("Prénom et nom (optionnel)")
      .parent()
      .find("input")
      .type(auditJson.auditorName);

    // Submit new audit form
    cy.contains("Valider les paramètres").click();

    // Check user is redirect to audit overview page
    cy.get("h1").contains(auditJson.procedureName);
  });

  it("User can go to settings page from audit (small viewport)", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);
      cy.contains("Actions").click();
      cy.contains("Accéder aux paramètres").click();
      cy.get("h1").contains("Paramètres de l’audit");
      cy.url().should(
        "eq",
        `http://localhost:3000/audits/${editId}/parametres`,
      );
    });
  });

  it("User can go to settings page from audit (large viewport)", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.viewport(1400, 800);
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);
      cy.contains("a", "Paramètres").click();
      cy.get("h1").contains("Paramètres de l’audit");
      cy.url().should(
        "eq",
        `http://localhost:3000/audits/${editId}/parametres`,
      );
    });
  });

  it("User can edit procedure name", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/parametres`);

      cy.getByLabel("Nom du site audité").should(
        "have.value",
        "Audit de mon petit site",
      );

      cy.getByLabel("Nom du site audité")
        .clear()
        .type("Audit de mon gros site");

      cy.contains("Enregistrer les modifications").click();

      cy.url().should(
        "eq",
        `http://localhost:3000/audits/${editId}/generation`,
      );
      cy.get("h1").contains("Audit de mon gros site");
    });
  });

  it("User can edit pages", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/parametres`);

      cy.get("fieldset .fr-input-group .fr-input[id^='page-name']").then(
        (els) => {
          expect(els).to.have.length(8);
          const expectedPages = [
            "Accueil",
            "Contact",
            "À propos",
            "Blog",
            "Article",
            "Connexion",
            "Documentation",
            "FAQ",
          ];
          expectedPages.forEach((expectedPageName, i) => {
            cy.wrap(els[i]).should("have.value", expectedPageName);
          });
        },
      );

      cy.contains("button", "Supprimer").click();
      cy.contains("button", "Supprimer").click();
      cy.contains("button", "Supprimer").click();

      cy.getByLabel("Nom de la page").clear().type("Accueil du blog");
      cy.getByLabel("URL de la page")
        .clear()
        .type("https://example.com/blog/accueil");

      cy.get("#page-order-1").select("0");

      cy.get("#page-order-4").select("1");

      cy.contains("Ajouter une page").click();
      cy.get("fieldset .fr-input-group .fr-input[id^='page-name']")
        .last()
        .type("Paramètres");
      cy.get("fieldset .fr-input-group .fr-input[id^='page-url']")
        .last()
        .type("https://example.com/parametres");

      cy.contains("Enregistrer les modifications").click();
      cy.url().should(
        "eq",
        `http://localhost:3000/audits/${editId}/generation`,
      );

      cy.get("[role='tablist'] button").then((els) => {
        expect(els).to.have.length(7);
        const expectedPages = [
          "Éléments transverses",
          "Article",
          "FAQ",
          "Accueil du blog",
          "Connexion",
          "Documentation",
          "Paramètres",
        ];
        expectedPages.forEach((expectedPageName, i) => {
          cy.wrap(els[i]).should("have.text", expectedPageName);
        });
      });
    });
  });

  it("User can delete an audit", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);

      cy.contains("Actions").click();
      cy.contains("Supprimer l’audit").click();

      cy.contains("Vous allez supprimer l’audit");
      cy.get("dialog").contains("button", "Supprimer l’audit").click();

      cy.url().should("eq", "http://localhost:3000/");
      cy.contains("L’audit a correctement été supprimé.");
    });
  });

  it("User can update notes", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);

      cy.contains("Annoter l’audit").click();
      cy.getByLabel("Remarques et recommandations générales")
        .clear()
        .type("Annotations de l’audit");
      cy.get("dialog#notes-modal").contains("button", "Fermer").click();
      cy.contains("Annoter l’audit").click();
      cy.contains("Annotations de l’audit");
    });
  });

  it("User can fill a11y statement", () => {
    cy.createTestAudit().then(({ editId, reportId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/synthese`);
      cy.contains("Compléter").invoke("removeAttr", "target").click();

      // General infos
      cy.getByLabel("Entité qui a demandé l’audit")
        .clear()
        .type(statementJson.auditInitiator);
      cy.getByLabel("Entité qui a réalisé l’audit")
        .clear()
        .type(statementJson.auditorOrganisation);
      cy.getByLabel("URL de la page d’accueil du site audité")
        .clear()
        .type(statementJson.procedureUrl);

      // Contact
      cy.getByLabel("Nom et prénom du contact (optionnel)")
        .clear()
        .type(statementJson.contactName);
      cy.getByLabel("Adresse e-mail").clear().type(statementJson.contactEmail);
      cy.getByLabel("Formulaire de contact en ligne")
        .clear()
        .type(statementJson.contactFormUrl);

      // Technologies
      cy.getByLabel("Ajouter des technologies")
        .clear()
        .type(statementJson.technologies);

      cy.contains("button", "Valider les technologies").click();

      // Tools
      cy.contains("Web Developer Toolbar").click();
      cy.contains("WCAG Contrast checker").click();
      cy.getByLabel("Ajouter des outils d’assistance")
        .clear()
        .type(statementJson.tools);

      cy.contains("button", "Valider les outils").click();

      // Environments
      cy.contains("Combinaison 1").click();
      cy.getByLabel("Appareil").clear().type("Ordinateur");
      cy.getByLabel("Logiciel d’exploitation").clear().type("Windows");
      cy.getByLabel("Technologie d’assistance").clear().type("JAWS");
      cy.getByLabel("Navigateur").clear().type("Edge");

      // Not accessible content
      cy.getByLabel("Non-conformités (optionnel)")
        .clear()
        .type(statementJson.notCompliantContent);
      cy.getByLabel("Dérogations pour charge disproportionnée (optionnel)")
        .clear()
        .type(statementJson.derogatedContent);
      cy.getByLabel(
        "Contenus non soumis à l’obligation d’accessibilité, contenus tiers (optionnel)",
      )
        .clear()
        .type(statementJson.notInScopeContent);

      cy.contains("button", "Valider la déclaration").click();
      cy.contains(`http://localhost:3000/declaration/${reportId}`);
    });
  });

  it("User can copy an audit", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);
      cy.contains("button", "Actions").click();
      cy.contains("button", "Dupliquer l’audit").click();

      cy.getByLabel("Nom de la copie").type("Audit de mon petit site (2)");
      cy.get("dialog").contains("button", "Dupliquer l’audit").click();

      cy.contains("Audit dupliqué avec succès", { timeout: 50_000 });
      cy.contains("Audit de mon petit site (2)");
    });
  });

  it("User can search in criteria title", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);
      cy.getByLabel("Rechercher par mots clés")
        .clear()
        .type("alternative")
        .type("{enter}");

      cy.contains("9 résultats");
      cy.get("li.criterium-container").then((els) => {
        expect(els).to.have.length(9);
      });
    });
  });

  it("User can hide tests and references", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);
      cy.contains("Masquer les tests et références").click();
      cy.contains("Tests et références du critère 1.1").should("not.exist");
    });
  });

  it("User can filter criteria", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);

      // Check total length
      cy.get("li.criterium-container").then((els) => {
        expect(els).to.have.length(106);
      });

      // Check C criteria
      cy.contains("Conforme (323)").click();
      cy.get("li.criterium-container").then((els) => {
        expect(els).to.have.length(36);
      });
      cy.get("li.criterium-container").each((el) => {
        cy.wrap(el)
          .find("fieldset > div label")
          .first()
          .should("have.class", "green");
      });

      // Add NA criteria
      cy.contains("Non applicable (315)").click();
      cy.get("li.criterium-container").then((els) => {
        expect(els).to.have.length(71);
      });
      cy.get("li.criterium-container").each((el) => {
        cy.wrap(el)
          .find("fieldset > div label")
          .should(
            "satisfy",
            (el) =>
              el[0].classList.contains("green") || el.at(-1).contains("grey"),
          );
      });

      // Add NC criteria
      cy.contains("Non conforme (315)").click();
      cy.get("li.criterium-container").then((els) => {
        expect(els).to.have.length(106);
      });
      cy.get("li.criterium-container").each((el) => {
        cy.wrap(el)
          .find("fieldset > div label")
          .should(
            "satisfy",
            (el) =>
              el[0].classList.contains("green") ||
              el[1].contains("red") ||
              el.at(-1).contains("grey"),
          );
      });
    });
  });

  it("User can filter evaluated criteria", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);

      cy.contains("Masquer critères évalués").click();
      cy.contains("Tous les critères évalués ont été masqués");

      cy.contains("Masquer critères évalués").click();

      cy.get("li.criterium-container fieldset input:checked")
        .first()
        .click({ force: true });

      cy.get("li.criterium-container fieldset input:checked")
        .eq(0)
        .click({ force: true });

      cy.contains('button[role="tab"]', "Article").click();

      cy.get("li.criterium-container fieldset input:checked")
        .first()
        .click({ force: true });

      cy.contains("Masquer critères évalués").click();
      cy.get("li.criterium-container").should("have.length", 1);

      cy.contains('button[role="tab"]', "Éléments transverses").click();
      cy.get("li.criterium-container").should("have.length", 2);

      cy.get("li.criterium-container fieldset input")
        .first()
        .click({ force: true });

      cy.contains("Mettre à jour critères masqués").click();

      cy.get("li.criterium-container").should("have.length", 1);
    });
  });

  it("User can finish the audit", () => {
    cy.createTestAudit().then(({ editId, reportId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);

      cy.contains('button[role="tab"]', "Accueil").click();

      cy.get("li.criterium-container fieldset input")
        .first()
        .click({ force: true });

      cy.contains(/Audit terminé le \d{2}\/\d{2}\/\d{4}/);
      cy.contains("Bravo ! Il semblerait que vous ayez terminé votre audit 💪");

      cy.visit(`http://localhost:3000/audits/${editId}/synthese`);

      cy.contains(/Terminé le \d{1,2} [A-zÀ-ú]{3,9} \d{4}/);
      cy.contains("a", "Accéder");

      cy.contains("a", `http://localhost:3000/rapport/${reportId}`);

      cy.contains("button", "Copier le lien").click();
      cy.contains(
        "Le lien vers le rapport d’audit a bien été copié dans le presse-papier.",
      );
      cy.assertClipboardValue(`http://localhost:3000/rapport/${reportId}`);
    });
  });

  it("User can set a topic as NA", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);
      cy.contains('button[role="tab"]', "Connexion").click();
      cy.contains(" Non applicable sur la page").click();

      cy.get(".page-url + section fieldset input:checked + label").should(
        "have.class",
        "grey",
      );
    });
  });

  it("User can edit a criterium content", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);

      cy.contains('button[role="tab"]', "FAQ").click();
      cy.get(".criterium-container").contains("Non conforme").click();

      cy.focused().should("have.attr", "rows");

      cy.getByLabel(/^Erreur et recommandation$/)
        .clear({ force: true })
        .type("Il n’y a pas de alt sur l’image du hero");

      cy.get(".criterium-container").contains("majeur").click();
      cy.get(".criterium-container").contains("Facile à corriger").click();
    });
  });

  it("User can see transverse status and comment from other pages", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);

      cy.contains('button[role="tab"]', "Documentation").click();
      cy.get(".criterium-container")
        .eq(2)
        .find(".criterium-transverse-notice")
        .contains(
          "Vous avez évalué ce critère Non conforme pour les éléments transverses.",
        );

      cy.get(".criterium-container")
        .eq(2)
        .contains("button", "Voir les erreurs")
        .click();

      cy.get(".criterium-container").eq(2).contains("Une erreur ici");

      cy.get(".criterium-container")
        .eq(2)
        .contains("button", "Masquer les erreurs")
        .click();

      cy.get(".criterium-container")
        .eq(2)
        .contains("Une erreur ici")
        .should("not.exist");
    });
  });

  it("User can download an audit", () => {
    cy.exec("rm -rf cypress/downloads");

    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);

      cy.contains("Actions").click();
      cy.contains("Exporter l’audit").click();

      cy.readFile("cypress/downloads/audit-audit-de-mon-petit-site.csv");
    });
  });

  it("User can reset filters", () => {
    cy.createTestAudit().then(({ editId }) => {
      cy.visit(`http://localhost:3000/audits/${editId}/generation`);

      cy.contains("Conforme (323)").click();
      cy.contains("Non applicable (315)").click();
      cy.contains("Masquer les tests et références").click();
      cy.getByLabel(" Rechercher par mots clés")
        .clear()
        .type("alternative")
        .type("{enter}");

      cy.get("li.criterium-container").then((els) => {
        expect(els).to.have.length(6);
      });

      cy.contains("button", "Réinitialiser").click();

      cy.get("li.criterium-container").then((els) => {
        expect(els).to.have.length(106);
      });

      cy.focused().should("have.attr", "placeholder", "Rechercher");
      cy.contains("button", "Réinitialiser").should("not.exist");
    });
  });
});

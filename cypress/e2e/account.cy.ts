import * as auditJson from "../fixtures/audit.json";

describe("Account", () => {
  describe("Account management", () => {
    describe("User can create a new account", () => {
      beforeEach(() => {
        const email = `john-doe-${Math.random()}@example.com`;
        cy.wrap(email).as("email");

        cy.visit("http://localhost:3000");
        cy.contains("a", "Créer un compte").click();
        cy.getByLabel("Adresse e-mail").type(email);
        cy.getByLabel("Mot de passe").type("pouetpouetpouet");
        cy.contains("button", "Valider").click();
        cy.contains("h1", "Consulter votre boite de réception");
        cy.contains(
          `Un mail contenant un lien pour vérifier votre e-mail vient de vous être envoyé à l’adresse : ${email}`
        );
      });

      it("(verification link)", () => {
        cy.get("@email").then((email) => {
          // Simulate receiving the verification link by email.
          cy.request(
            "POST",
            "http://localhost:3000/api/debug/verification-token",
            {
              username: email,
            }
          )
            .its("body")
            .then((verificationToken) => {
              const verificationLink = `http://localhost:3000/compte/validation?token=${verificationToken}`;
              cy.visit(verificationLink);
            });

          cy.contains("Votre compte a été créé avec succès");
          cy.getByLabel("Adresse e-mail").should("have.value", email);
        });
      });

      it("(same tab, account verified elsewhere)", () => {
        cy.get("@email").then((email) => {
          // Simulate the account being verified in another tab
          cy.request(
            "POST",
            "http://localhost:3000/api/debug/verification-token",
            {
              username: email,
            }
          )
            .its("body")
            .then((verificationToken) => {
              cy.request("POST", "/api/auth/verify", {
                token: verificationToken,
              });
            });

          cy.contains("h1", "Votre compte a été créé avec succès", {
            timeout: 8000,
          });

          cy.contains("a", "Aller à la page de connexion").click();
          cy.contains("Votre compte a été créé avec succès");
          cy.getByLabel("Adresse e-mail").should("have.value", email);
        });
      });
    });

    it("User can not create account with already taken email", () => {
      cy.createTestAccount().then(({ username }) => {
        cy.visit("http://localhost:3000");
        cy.contains("a", "Créer un compte").click();
        cy.getByLabel("Adresse e-mail").type(username);
        cy.getByLabel("Mot de passe").type("blablablablablabla");
        cy.contains("button", "Valider").click();
        cy.contains(
          "Un compte est déjà associé à cette adresse e-mail. Veuillez choisir une autre adresse e-mail. Si vous êtes le propriétaire de cette adresse e-mail vous pouvez vous connecter."
        );
        cy.getByLabel("Adresse e-mail").should("have.focus");
      });
    });

    it("User can not create account with expired verification token", () => {
      cy.visit("http://localhost:3000/compte/validation?token=pouet");
      cy.contains("h1", "Désolé, votre lien n’est plus valide");
    });

    it("User can sign in with their account", () => {
      cy.createTestAccount().then(({ username, password }) => {
        cy.visit("http://localhost:3000/compte/connexion");
        cy.getByLabel("Adresse e-mail").type(username);
        cy.getByLabel("Mot de passe").type(password);
        cy.contains("button", "Se connecter").click();
        cy.contains("h1", "Mes audits");
        cy.contains(
          `Vous trouverez ici tous les audits associés à votre adresse e-mail : ${username}`
        );
      });
    });

    it("User can update their user profile infos", () => {
      cy.createTestAccount({ login: true }).then(({ username, password }) => {
        cy.visit("http://localhost:3000/compte");
        cy.contains("button", username).click();
        cy.contains("a", "Mon compte").click();

        cy.getByLabel("Prénom et nom").type("John Doe");
        cy.getByLabel("Nom de la structure").type("ACME");
        cy.contains("Mettre à jour").click();

        cy.contains("Profil mis à jour avec succès");
      });
    });

    it("User can update their password", () => {
      cy.createTestAccount({ login: true }).then(({ username, password }) => {
        cy.visit("http://localhost:3000/compte/parametres");

        const newPassword = "totototototo";

        cy.contains("button", "Changer de mot de passe").click();
        cy.getByLabel("Mot de passe actuel").type(password);
        cy.getByLabel("Nouveau mot de passe").type(newPassword);
        cy.contains("button", "Changer de mot de passe").click();

        cy.contains("Votre mot de passe a été mis à jour avec succès");

        cy.contains("button", username).click();
        cy.contains("button", "Me déconnecter").click();

        cy.contains("Vous avez été deconnecté avec succès.");

        cy.getByLabel("Adresse e-mail").type(username);
        cy.getByLabel("Mot de passe").type(password);
        cy.contains("button", "Se connecter").click();

        cy.contains("Le mot de passe saisi est incorrect.");

        cy.getByLabel("Adresse e-mail").clear().type(username);
        cy.getByLabel("Mot de passe").clear().type(newPassword);
        cy.contains("button", "Se connecter").click();

        cy.contains("h1", "Mes audits");
      });
    });

    it("User can reset their password", () => {
      cy.createTestAccount().then(({ username, password }) => {
        cy.visit("http://localhost:3000/compte/connexion");
        cy.contains("a", "Mot de passe oublié").click();
        cy.getByLabel("Adresse e-mail").type(username);
        cy.contains("button", "Valider").click();
        cy.contains(
          `Un lien de réinitialisation vient de vous être envoyé à l’adresse e-mail suivante : ${username}`
        );

        cy.request(
          "POST",
          "http://localhost:3000/api/debug/password-reset-verification-token",
          { username }
        ).then((resp) => {
          const verificationLink = `http://localhost:3000/compte/reinitialiser-mot-de-passe?token=${resp.body}`;
          cy.visit(verificationLink);

          const newPassword = "blablablabla";

          cy.contains("h1", "Changer de mot de passe");
          cy.getByLabel("Mot de passe").type(newPassword);
          cy.contains("button", "Changer de mot de passe").click();

          cy.contains("Votre mot de passe a été mis à jour avec succès");

          // Try login with old password
          cy.getByLabel("Mot de passe").type(password);
          cy.contains("button", "Se connecter").click();
          cy.contains("Le mot de passe saisi est incorrect.");

          // Login with new password
          cy.getByLabel("Mot de passe").clear().type(newPassword);
          cy.contains("button", "Se connecter").click();
          cy.contains("h1", "Mes audits");
        });
      });
    });

    it.only("User can reset their password (logged in)", () => {
      cy.createTestAccount({ login: true }).then(({ username, password }) => {
        cy.visit("http://localhost:3000/compte/parametres");
        cy.contains("Changer de mot de passe").click();
        cy.contains("Mot de passe oublié ?").click();
        // cy.getByLabel("Adresse e-mail").type(username);
        // cy.contains("button", "Valider").click();
        cy.contains(
          `Un lien de réinitialisation vient de vous être envoyé à l’adresse e-mail suivante : ${username}`
        );

        cy.request(
          "POST",
          "http://localhost:3000/api/debug/password-reset-verification-token",
          { username }
        ).then((resp) => {
          const verificationLink = `http://localhost:3000/compte/reinitialiser-mot-de-passe?token=${resp.body}`;
          cy.visit(verificationLink);

          const newPassword = "blablablabla";

          cy.contains("h1", "Changer de mot de passe");
          cy.getByLabel("Mot de passe").type(newPassword);
          cy.contains("button", "Changer de mot de passe").click();

          cy.location("pathname").should("eq", "/compte");
          cy.contains("Votre mot de passe a été mis à jour avec succès");
        });
      });
    });

    it("User can update their email address", () => {
      cy.createTestAccount({ login: true }).then(({ password, uid }) => {
        cy.visit("http://localhost:3000/compte/parametres");

        const newEmail = `john-smith${Math.random()}@example.com`;
        cy.contains("button", "Changer d’adresse e-mail").click();
        cy.getByLabel("Mot de passe").type(password);
        cy.getByLabel("Nouvelle adresse e-mail").type(newEmail);
        cy.contains("button", "Changer d’adresse e-mail").click();

        cy.contains(
          `Un lien pour confirmer votre nouvelle adresse e-mail vient de vous être envoyé à l’adresse suivante : ${newEmail}`
        );

        // Simulate receiving the verification link by email.
        cy.request(
          "POST",
          "http://localhost:3000/api/debug/email-update-verification-token",
          { uid }
        ).then((resp) => {
          const verificationLink = `http://localhost:3000/compte/email-update-validation?token=${resp.body.token}`;
          cy.visit(verificationLink);

          cy.contains(`Votre adresse email : ${newEmail}`);
          cy.contains("Votre adresse e-mail a été mise à jour avec succès.");
        });
      });
    });

    it("User can delete their account", () => {
      cy.createTestAccount({ login: true }).then(({ password }) => {
        cy.visit("http://localhost:3000/compte/parametres");

        // Delete account form
        cy.contains("button", "Supprimer mon compte").click();
        cy.getByLabel(
          "Pour confirmer la suppression de votre compte veuillez saisir : je confirme vouloir supprimer mon compte"
        ).type("je confirme vouloir supprimer mon compte");
        cy.getByLabel("Mot de passe").type(password);
        cy.contains("button", "Supprimer mon compte").click();
        cy.contains(
          "Vous avez été déconnecté et votre compte a été supprimé avec succès"
        );

        // Submit feedback form
        cy.getByLabel(
          "Pourriez-vous nous donner la raison de votre départ ?"
        ).type("Quoi ? Ça n’est pas un outil d’audit automatique ?!");
        cy.contains("button", "Envoyer mon avis").click();
        cy.contains("Votre avis a bien été envoyé");
      });
    });
  });

  describe("Audits list", () => {
    // Create an logged in account and 4 associated audits (1 completed, 1 pristine and 2 in progress)
    beforeEach(() => {
      cy.createTestAccount({ login: true }).then(({ username }) => {
        cy.createTestAudit({ auditorEmail: username, isComplete: true });
        cy.createTestAudit({ auditorEmail: username, isPristine: true });
        cy.createTestAudit({ auditorEmail: username });
        cy.createTestAudit({ auditorEmail: username }).as("audit");
        cy.visit("http://localhost:3000/compte");
      });
    });
    it("User can access all their audits", () => {
      cy.contains("En cours (3)");
      cy.contains("Terminé (1)");

      const expectedLabels = [
        "Continuer l’audit",
        "Continuer l’audit",
        "Commencer l’audit",
        "Voir le rapport pour l’audit",
      ];

      cy.get(".audit-main-action").each(($el, i) => {
        expect($el.text()).to.contain(expectedLabels[i]);
      });
    });

    it("User can start audit with prefilled infos", () => {
      // FIXME: export function?
      function fillPageField(
        pageIndex: number,
        field: string,
        content: string
      ) {
        cy.contains("Page " + pageIndex)
          .parent()
          .parent()
          .contains(field)
          .parent()
          .find("input")
          .clear()
          .type(content);
      }

      // Create a new audit but auditor email field should not be present
      cy.contains("a", "Démarrer un nouvel audit").click();

      cy.contains("106 critères").click();

      cy.contains("Nom du site ou du service à auditer")
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

      cy.getByLabel("Prénom et nom (optionnel)").type(auditJson.auditorName);

      cy.contains("button", "Valider les paramètres").click();

      cy.contains("h1", "Audit de mon petit site");

      // Create new audit but in only 2 steps (step 3 auto-filled)
      cy.contains("a", "Mes audits").click();

      cy.contains("a", "Démarrer un nouvel audit").click();

      cy.contains("106 critères").click();

      cy.contains("Nom du site ou du service à auditer")
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

      cy.contains("button", "Valider les paramètres").click();

      cy.contains("h1", "Audit de mon petit site");
    });

    it("User can duplicate audit", () => {
      cy.contains("button", "Options").click();
      cy.contains("button", "Dupliquer l’audit").click();

      cy.getByLabel("Nom de la copie").type("Audit de mon petit site (2)");
      cy.get("dialog").contains("button", "Dupliquer l’audit").click();

      cy.contains("Audit Audit de mon petit site (2) dupliqué avec succès", {
        timeout: 50_000,
      });
    });

    it("User can copy audit link", () => {
      cy.contains("button", "Options").click();
      cy.contains("button", "Copier le lien de l’audit").click();
      cy.get("@audit").then((audit) => {
        cy.assertClipboardValue(
          `http://localhost:3000/audits/${audit.editId}/generation`
        );
        cy.contains(
          "Le lien vers l’audit a bien été copié dans le presse-papier."
        );
      });
    });

    it("User can copy report link", () => {
      cy.contains("button", "Options").click();
      cy.contains("button", "Copier le lien du rapport").click();
      cy.get("@audit").then((audit) => {
        cy.assertClipboardValue(
          `http://localhost:3000/rapport/${audit.reportId}`
        );
        cy.contains(
          "Le lien vers le rapport a bien été copié dans le presse-papier."
        );
      });
    });

    it("User can download audit", () => {
      cy.exec("rm -rf cypress/downloads");

      cy.contains("Options").click();
      cy.contains("Télécharger l’audit").click();

      cy.readFile("cypress/downloads/audit-audit-de-mon-petit-site.csv");
    });

    it("User can delete audit", () => {
      cy.contains("Options").click();
      cy.contains("Supprimer l’audit").click();

      cy.get("dialog").contains("Supprimer l’audit").click();

      cy.contains("Audit Audit de mon petit site supprimé avec succès");
    });
  });
});

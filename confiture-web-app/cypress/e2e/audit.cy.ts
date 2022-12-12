describe("Ara application", () => {
  it("Parcours de création d'audit complet ", () => {
    cy.visit("http://localhost:3000");
    cy.contains("Je démarre un audit").click();

    cy.location("pathname").should("equal", "/audits/nouveau");

    cy.contains("Complet").click();

    cy.getByLabel("Nom du site à auditer").type("Mon super site");

    function getPageFieldset(title: string) {
      return cy.contains(title).parent().parent().parent();
    }

    getPageFieldset("Page 1")
      .contains("URL de la page")
      .type("https://example.com");

    getPageFieldset("Page 2")
      .contains("Nom de la page")
      .type("Formulaire de contact");

    getPageFieldset("Page 2")
      .contains("URL de la page")
      .type("https://example.com/contact");

    getPageFieldset("Page 3").contains("Supprimer").click();
    getPageFieldset("Page 3").contains("Supprimer").click();
    getPageFieldset("Page 3").contains("Supprimer").click();
    getPageFieldset("Page 3").contains("Supprimer").click();
    getPageFieldset("Page 3").contains("Supprimer").click();

    cy.getByLabel("Nom de la structure qui réalise l'audit").type(
      "Ma structure"
    );

    cy.getByLabel("Nom et prénom de l’auditeur").type("Jean Biche");

    cy.getByLabel("Adresse e-mail de la structure ou de l’auditeur").type(
      "jean.biche@ma-structure.fr"
    );

    cy.get("[type='submit']").click();

    // Generation step
    cy.location("pathname").should("match", /^\/audits\/[\w-_]+\/generation$/);
  });
});

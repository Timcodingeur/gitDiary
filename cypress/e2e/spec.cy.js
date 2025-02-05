import "cypress-downloadfile/lib/downloadFileCommand";

describe("Login test", () => {
  beforeEach(() => {
    // Intercepte l'appel pour récupérer les infos utilisateur depuis GitHub
    cy.intercept("GET", "https://api.github.com/user", {
      statusCode: 200,
      body: {
        login: "testuser",
        avatar_url: "http://example.com/avatar.png",
      },
    }).as("getUser");

    // Intercepte l'appel pour récupérer les repos de l'utilisateur
    cy.intercept(
      "GET",
      "https://api.github.com/user/repos?per_page=100&page=1",
      {
        statusCode: 200,
        body: [
          {
            name: "repo1",
            owner: { login: "testuser" },
          },
        ],
      }
    ).as("getRepos");

    // Intercepte l'appel pour récupérer les commits du repo
    cy.intercept(
      "GET",
      /\/repos\/testuser\/repo1\/commits\?per_page=100&page=1/,
      {
        statusCode: 200,
        body: [
          {
            sha: "abc123",
            commit: {
              author: { name: "Author", date: "2023-01-01T00:00:00Z" },
              message: "Test commit",
            },
          },
        ],
      }
    ).as("getCommits");

    // Intercepte l'appel pour récupérer les issues du repo
    cy.intercept(
      "GET",
      /\/repos\/testuser\/repo1\/issues\?state=all&per_page=100&page=1/,
      {
        statusCode: 200,
        body: [
          {
            number: 1,
            title: "Test issue",
            user: { login: "testuser" },
            state: "open",
            created_at: "2023-01-01T00:00:00Z",
            closed_at: null,
          },
        ],
      }
    ).as("getIssues");

    // Avant de charger l'app, on place un jeton factice dans le sessionStorage
    cy.visit("http://localhost:8000", {
      onBeforeLoad(win) {
        win.sessionStorage.setItem("token", "fake_token");
      },
    });
  });

  it("Should create commit table and can export the table with different extension", () => {
    cy.get('button[id="create-table-commit"]').click();

    cy.get("div.container").should("be.visible");

    // Vérifie que le titre (date) contient "January 1, 2023" (selon le formatage appliqué dans votre code)
    cy.get("h2").invoke("text").should("contain", "January 1, 2023");

    cy.get('th[id="hash"]').invoke("text").should("eq", "Hash");
    cy.get('th[id="author"]').invoke("text").should("eq", "Author");
    cy.get('th[id="date"]').invoke("text").should("eq", "Date");
    cy.get('th[id="message"]').invoke("text").should("eq", "Message");
    cy.get('th[id="duration"]').invoke("text").should("eq", "Duration");

    cy.get('tr[id="commit-content"]').children().its("length").should("eq", 5);
    cy.get('tr[id="commit-content"] td[id="commit-hash"]')
      .invoke("text")
      .should("not.eq", "");
    cy.get('tr[id="commit-content"] td[id="commit-author"]')
      .invoke("text")
      .should("not.eq", "");
    cy.get('tr[id="commit-content"] td[id="commit-date"]')
      .invoke("text")
      .should("not.eq", "");
    cy.get('tr[id="commit-content"] td[id="commit-message"]')
      .invoke("text")
      .should("not.eq", "");
    cy.get('tr[id="commit-content"] td[id="commit-duration"]')
      .invoke("text")
      .should("not.eq", "");

    cy.get('tr[id="day-total-time"]').children().its("length").should("eq", 5);
    cy.get('tr[id="day-total-time"] td[id="day-total"]')
      .invoke("text")
      .should("not.eq", "");
    cy.get('tr[id="day-total-time"] td[id="day-total-duration"]')
      .invoke("text")
      .should("not.eq", "");

    const downloadsFolder = Cypress.config("downloadsFolder");

    cy.get('button[id="export-pdf"]').click();
    cy.readFile(`${downloadsFolder}/commits.pdf`).should("exist");

    cy.get('button[id="export-csv"]').click();
    cy.readFile(`${downloadsFolder}/commits.csv`).should("exist");

    cy.get('button[id="export-md"]').click();
    cy.readFile(`${downloadsFolder}/commits.md`).should("exist");
  });

  it("Should create issues table and can export it with diferent extension", () => {
    cy.get('button[id="create-table-issue"]').click();

    cy.get("div.container").should("be.visible");

    cy.get('th[id="number"]').invoke("text").should("eq", "Issue Number");
    cy.get('th[id="title"]').invoke("text").should("eq", "Title");
    cy.get('th[id="author"]').invoke("text").should("eq", "Author");
    cy.get('th[id="state"]').invoke("text").should("eq", "State");
    cy.get('th[id="start-date"]').invoke("text").should("eq", "Start Date");
    cy.get('th[id="end-date"]').invoke("text").should("eq", "End Date");
    cy.get('th[id="duration"]').invoke("text").should("eq", "Duration");

    cy.get('tr[id="issue-content"]').children().its("length").should("eq", 7);
    cy.get('tr[id="issue-content"] td[id="issue-number"]')
      .invoke("text")
      .should("not.eq", "");
    cy.get('tr[id="issue-content"] td[id="issue-title"]')
      .invoke("text")
      .should("not.eq", "");
    cy.get('tr[id="issue-content"] td[id="issue-author"]')
      .invoke("text")
      .should("not.eq", "");
    cy.get('tr[id="issue-content"] td[id="issue-state"]')
      .invoke("text")
      .should("not.eq", "");
    cy.get('tr[id="issue-content"] td[id="issue-start-date"]')
      .invoke("text")
      .should("not.eq", "");
    cy.get('tr[id="issue-content"] td[id="issue-end-date"]')
      .invoke("text")
      .should("not.eq", "");
    cy.get('tr[id="issue-content"] td[id="issue-duration"]')
      .invoke("text")
      .should("not.eq", "");

    const downloadsFolder = Cypress.config("downloadsFolder");

    cy.get('button[id="export-pdf"]').click();
    cy.readFile(`${downloadsFolder}/issues.pdf`).should("exist");

    cy.get('button[id="export-csv"]').click();
    cy.readFile(`${downloadsFolder}/issues.csv`).should("exist");

    cy.get('button[id="export-md"]').click();
    cy.readFile(`${downloadsFolder}/issues.md`).should("exist");
  });
});

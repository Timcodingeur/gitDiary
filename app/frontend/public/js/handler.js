// script/handlers.js
import { exportToPdf, exportToMarkdown, exportToCsv } from "./export.js";
import { createIssuesTable, createTable, groupCommitsByDate } from "./table.js";
import { getSumCommitsTime, handleClickCommit } from "./time.js";
import { getCommits } from "./github.js";

export function handleClickCommits(repos, token) {
  return async function () {
    try {
      console.log('handleClickCommits called');
      const container = document.querySelector(".container");
      const profileContainer = document.querySelector(".profile-container");
      if (!container) {
        console.error('Container not found');
        return;
      }

      console.log('Nettoyage des anciens éléments...');
      // Nettoyage des anciens tableaux et boutons export
      document.querySelectorAll("table").forEach((table) => table.remove());
      document.querySelectorAll(".day-commits").forEach((dayDiv) => dayDiv.remove());
      document.querySelectorAll("button").forEach((button) => {
        if (button.textContent !== "Create table commits" && 
            button.textContent !== "Create table issues") {
          button.remove();
        }
      });
      
      // Sélection du repo
      const select = document.querySelector("select");
      if (!select) {
        console.error('Select element not found');
        return;
      }
      const repoName = select.value;
      console.log('Selected repo:', repoName);
      
      const repo = repos.find((r) => r.name === repoName);
      if (!repo) {
        console.error('Repository not found');
        return;
      }

      console.log('Fetching commits...');
      const commits = await getCommits(token, repo.owner.login, repo.name);
      console.log('Commits fetched:', commits.length);

      console.log('Création du tableau...');
      // Création du tableau avec les commits
      try {
        await createTable(
          commits,
          groupCommitsByDate,
          getSumCommitsTime,
          handleClickCommit
        );
        console.log('Tableau créé avec succès');
      } catch (error) {
        console.error('Erreur lors de la création du tableau:', error);
      }

      console.log('Ajout des boutons d\'export...');
      // Ajout des boutons d'export
      const exportButtonPdf = document.createElement("button");
      exportButtonPdf.textContent = "Export to PDF";
      exportButtonPdf.id = "export-pdf";
      exportButtonPdf.addEventListener("click", exportToPdf);
      profileContainer.appendChild(exportButtonPdf);

      const exportButtonMd = document.createElement("button");
      exportButtonMd.textContent = "Export to Markdown";
      exportButtonMd.id = "export-md";
      exportButtonMd.addEventListener("click", exportToMarkdown);
      profileContainer.appendChild(exportButtonMd);

      const exportButtonCsv = document.createElement("button");
      exportButtonCsv.textContent = "Export to CSV";
      exportButtonCsv.id = "export-csv";
      exportButtonCsv.addEventListener("click", exportToCsv);
      profileContainer.appendChild(exportButtonCsv);

      console.log('Initialisation terminée');

    } catch (error) {
      console.error('Error in handleClickCommits:', error);
    }
  };
}

export function handleClickIssues(repos, token) {
  return async function () {
    const container = document.querySelector(".container");
    const profileContainer = document.querySelector(".profile-container");
    if (!container) return;
    // Nettoyage des anciens tableaux et boutons export
    document.querySelectorAll("table").forEach((table) => table.remove());
    document
      .querySelectorAll(".day-commits")
      .forEach((dayDiv) => dayDiv.remove());
    document.querySelectorAll("button").forEach((button) => {
      if (
        button.textContent !== "Create table commits" &&
        button.textContent !== "Create table issues"
      ) {
        button.remove();
      }
    });
    // Création des boutons d'export
    const exportButtonPdf = document.createElement("button");
    exportButtonPdf.textContent = "Export to PDF";
    exportButtonPdf.id = "export-pdf";
    exportButtonPdf.addEventListener("click", exportToPdf);
    profileContainer.appendChild(exportButtonPdf);

    const exportButtonMd = document.createElement("button");
    exportButtonMd.textContent = "Export to Markdown";
    exportButtonMd.id = "export-md";
    exportButtonMd.addEventListener("click", exportToMarkdown);
    profileContainer.appendChild(exportButtonMd);

    const exportButtonCsv = document.createElement("button");
    exportButtonCsv.textContent = "Export to CSV";
    exportButtonCsv.id = "export-csv";
    exportButtonCsv.addEventListener("click", exportToCsv);
    profileContainer.appendChild(exportButtonCsv);

    // Récupération des issues
    const select = document.querySelector("select");
    const repoName = select.value;
    const repo = repos.find((r) => r.name === repoName);
    const { getIssues } = await import("./github.js");
    const issues = await getIssues(token, repo.owner.login, repo.name);
    createIssuesTable(issues);
  };
}

export function logout() {
  sessionStorage.removeItem("token");
  window.location.reload();
}

// script/handlers.js
import { exportToPdf, exportToMarkdown, exportToCsv } from "./export.js";
import { createIssuesTable, createTable, groupCommitsByDate } from "./table.js";
import { getSumCommitsTime, handleClickCommit } from "./time.js";
import { getCommits } from "./github.js";

export function handleClickCommits(repos, token) {
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

    // Récupération des commits
    const select = document.querySelector("select");
    const repoName = select.value;
    const repo = repos.find((r) => r.name === repoName);
    const commits = await getCommits(token, repo.owner.login, repo.name);
    // Création du tableau avec les commits
    await createTable(
      commits,
      groupCommitsByDate,
      getSumCommitsTime,
      handleClickCommit
    );
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

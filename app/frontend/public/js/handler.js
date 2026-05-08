// script/handlers.js
import { exportToPdf, exportToMarkdown, exportToCsv, exportUserStoriesZip } from "./export.js";
import { createIssuesTable, createTable, groupCommitsByDate } from "./table.js";  // Fix import path
import { getSumCommitsTime, handleClickCommit } from "./time.js";  // Fix import path
import { getCommits } from "./github.js";
import { createIssuesCards, createKanban, exportKanbanPng } from "./issues-view.js";
import { createGantt, exportGanttPng } from "./gantt.js";

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

function cleanupViews() {
  document.querySelectorAll("table").forEach((t) => t.remove());
  document.querySelectorAll(".day-commits").forEach((d) => d.remove());
  document.querySelectorAll(".issues-cards-wrap").forEach((d) => d.remove());
  document.querySelectorAll(".kanban-board").forEach((d) => d.remove());
  document.querySelectorAll(".gantt-wrap").forEach((d) => d.remove());
  const persistent = new Set([
    "Create table commits",
    "Create table issues",
    "User stories",
    "Kanban",
    "Gantt",
  ]);
  document.querySelectorAll("button").forEach((b) => {
    if (!persistent.has(b.textContent)) b.remove();
  });
}

async function fetchIssuesForSelected(repos, token) {
  const select = document.querySelector("#repo-select") || document.querySelector("select");
  const repoName = select.value;
  const repo = repos.find((r) => r.name === repoName);
  const { getIssues } = await import("./github.js");
  return await getIssues(token, repo.owner.login, repo.name);
}

// Récupère les schedules selon la sélection du dropdown projet (auto = tous les projets de l'owner).
async function fetchSchedulesForSelected(repos, token) {
  const repoSelect = document.querySelector("#repo-select") || document.querySelector("select");
  const projectSelect = document.querySelector("#project-select");
  const repo = repos.find((r) => r.name === repoSelect.value);
  if (!repo) return new Map();
  const { getProjectSchedules, getSchedulesFromProject } = await import("./github.js");
  const projectVal = projectSelect?.value || "auto";
  if (projectVal === "auto") {
    return await getProjectSchedules(token, repo.owner.login, repo.name);
  }
  return await getSchedulesFromProject(token, projectVal, repo.name);
}

function addStandardExportButtons(profileContainer) {
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
}

export function handleClickIssues(repos, token) {
  return async function () {
    const container = document.querySelector(".container");
    const profileContainer = document.querySelector(".profile-container");
    if (!container) return;
    cleanupViews();
    addStandardExportButtons(profileContainer);
    const issues = await fetchIssuesForSelected(repos, token);
    createIssuesTable(issues);
  };
}

export function handleClickIssuesCards(repos, token) {
  return async function () {
    const container = document.querySelector(".container");
    const profileContainer = document.querySelector(".profile-container");
    if (!container) return;
    cleanupViews();
    addStandardExportButtons(profileContainer);

    const exportZipBtn = document.createElement("button");
    exportZipBtn.textContent = "📦 Export ZIP (PNG)";
    exportZipBtn.id = "export-us-zip";
    exportZipBtn.addEventListener("click", exportUserStoriesZip);
    profileContainer.appendChild(exportZipBtn);

    const [issues, schedules] = await Promise.all([
      fetchIssuesForSelected(repos, token),
      fetchSchedulesForSelected(repos, token),
    ]);
    createIssuesCards(issues, schedules);
  };
}

export function handleClickKanban(repos, token) {
  return async function () {
    const container = document.querySelector(".container");
    const profileContainer = document.querySelector(".profile-container");
    if (!container) return;
    cleanupViews();

    const exportPng = document.createElement("button");
    exportPng.textContent = "📥 Export Kanban PNG";
    exportPng.id = "export-kanban-png";
    exportPng.addEventListener("click", exportKanbanPng);
    profileContainer.appendChild(exportPng);

    const issues = await fetchIssuesForSelected(repos, token);
    createKanban(issues);
  };
}

export function handleClickGantt(repos, token) {
  return async function () {
    const container = document.querySelector(".container");
    const profileContainer = document.querySelector(".profile-container");
    if (!container) return;
    cleanupViews();

    const exportPng = document.createElement("button");
    exportPng.textContent = "📥 Export Gantt PNG";
    exportPng.id = "export-gantt-png";
    exportPng.addEventListener("click", exportGanttPng);
    profileContainer.appendChild(exportPng);

    const [issues, schedules] = await Promise.all([
      fetchIssuesForSelected(repos, token),
      fetchSchedulesForSelected(repos, token),
    ]);
    createGantt(issues, schedules);
  };
}

export function logout() {
  // Le token est stocké dans localStorage.github_token (cf. auth.js login())
  localStorage.removeItem("github_token");
  sessionStorage.removeItem("token");
  // On nettoie aussi un éventuel ?code=... dans l'URL pour ne pas relancer l'OAuth en boucle
  window.location.href = window.location.pathname;
}

// script/export.js
import { createTableFactice } from "./table.js";
import { currentIssues } from "./issues-view.js";

function isCardsView() {
  return !!document.querySelector(".issues-cards-wrap");
}

function stripMd(s) {
  return String(s ?? "")
    .replace(/```[\s\S]*?```/g, " [code] ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_>~]/g, "")
    .replace(/\r/g, "")
    .trim();
}

// ─── PDF ────────────────────────────────────────────
export async function exportToPdf() {
  try {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      console.error("jsPDF not found");
      return;
    }

    if (isCardsView() && currentIssues.length) {
      return exportCardsToPdf(jsPDF);
    }

    const pdf = new jsPDF();
    const divs = document.querySelectorAll(".day-commits");
    const table =
      divs.length === 0 ? document.querySelector("table") : await createTableFactice();

    if (!table) {
      console.error("No table found to export");
      return;
    }
    pdf.autoTable({ html: table });
    saveBlob(pdf.output("blob"), divs.length === 0 ? "issues.pdf" : "commits.pdf");
  } catch (error) {
    console.error("Error in exportToPdf:", error);
  }
}

function exportCardsToPdf(jsPDF) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const maxW = pageW - margin * 2;
  let y = margin;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("User stories", margin, y);
  y += 24;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(110);
  pdf.text(`Exporté le ${new Date().toLocaleString("fr-FR")} — ${currentIssues.filter(i => !i.pull_request).length} issues`, margin, y);
  pdf.setTextColor(0);
  y += 24;

  const issues = currentIssues.filter((i) => !i.pull_request);

  for (const issue of issues) {
    const titleLines = pdf.splitTextToSize(`#${issue.number} — ${issue.title}`, maxW);
    const meta = [
      issue.user?.login ? `Auteur : ${issue.user.login}` : null,
      `État : ${issue.state === "open" ? "Ouverte" : "Fermée"}`,
      `Créée : ${new Date(issue.created_at).toLocaleDateString("fr-FR")}`,
      issue.closed_at ? `Fermée : ${new Date(issue.closed_at).toLocaleDateString("fr-FR")}` : null,
      (issue.assignees || []).length ? `Assigné : ${issue.assignees.map((a) => a.login).join(", ")}` : null,
    ].filter(Boolean).join("  ·  ");
    const labels = (issue.labels || []).map((l) => (typeof l === "string" ? l : l.name)).join(", ");
    const body = stripMd(issue.body || "Pas de description.");
    const bodyLines = pdf.splitTextToSize(body, maxW);

    const blockH =
      titleLines.length * 18 +
      14 +
      (labels ? 14 : 0) +
      bodyLines.length * 13 +
      24;

    if (y + blockH > pageH - margin) {
      pdf.addPage();
      y = margin;
    }

    // Title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(issue.state === "closed" ? 130 : 26, issue.state === "closed" ? 80 : 127, issue.state === "closed" ? 223 : 55);
    pdf.text(titleLines, margin, y);
    y += titleLines.length * 16;

    // Meta
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(110);
    pdf.text(meta, margin, y);
    y += 12;

    if (labels) {
      pdf.setTextColor(80);
      pdf.text(`Labels : ${labels}`, margin, y);
      y += 12;
    }

    // Body
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(30);
    pdf.text(bodyLines, margin, y);
    y += bodyLines.length * 12;

    // Separator
    y += 10;
    pdf.setDrawColor(220);
    pdf.line(margin, y, pageW - margin, y);
    y += 14;
  }

  saveBlob(pdf.output("blob"), "user_stories.pdf");
}

// ─── Markdown ───────────────────────────────────────
export async function exportToMarkdown() {
  if (isCardsView() && currentIssues.length) {
    let md = `# User stories\n\n_Exporté le ${new Date().toLocaleString("fr-FR")}_\n\n`;
    for (const issue of currentIssues.filter((i) => !i.pull_request)) {
      md += `## #${issue.number} — ${issue.title}\n\n`;
      md += `- **État** : ${issue.state}\n`;
      md += `- **Auteur** : ${issue.user?.login || "?"}\n`;
      md += `- **Créée** : ${new Date(issue.created_at).toLocaleDateString("fr-FR")}\n`;
      if (issue.closed_at) md += `- **Fermée** : ${new Date(issue.closed_at).toLocaleDateString("fr-FR")}\n`;
      const labels = (issue.labels || []).map((l) => (typeof l === "string" ? l : l.name));
      if (labels.length) md += `- **Labels** : ${labels.join(", ")}\n`;
      md += `\n${issue.body || "_Pas de description._"}\n\n---\n\n`;
    }
    saveBlob(new Blob([md], { type: "text/markdown" }), "user_stories.md");
    return;
  }

  const divs = document.querySelectorAll(".day-commits");
  const table =
    divs.length === 0 ? document.querySelector("table") : await createTableFactice();
  if (!table) return;
  const heads = table.querySelectorAll("thead");
  const rows = table.querySelectorAll("tr");
  let markdown = "";
  for (const head of heads) {
    markdown += "| ";
    head.querySelectorAll("th").forEach((th) => { markdown += `${th.textContent} | `; });
    markdown = markdown.slice(0, -3) + "\n";
  }
  for (const head of heads) {
    markdown += "| ";
    head.querySelectorAll("th").forEach(() => { markdown += `--- | `; });
    markdown = markdown.slice(0, -3) + "\n";
  }
  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    markdown += "| ";
    for (const cell of cells) markdown += `${cell.textContent} | `;
    markdown = markdown.slice(0, -3) + "\n";
  }
  saveBlob(new Blob([markdown], { type: "text/markdown" }), divs.length === 0 ? "issues.md" : "commits.md");
}

// ─── CSV ────────────────────────────────────────────
export async function exportToCsv() {
  if (isCardsView() && currentIssues.length) {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    let csv = "Number,Title,State,Author,Created,Closed,Labels,Description\n";
    for (const i of currentIssues.filter((i) => !i.pull_request)) {
      csv += [
        i.number,
        esc(i.title),
        i.state,
        esc(i.user?.login || ""),
        i.created_at?.slice(0, 10) || "",
        i.closed_at?.slice(0, 10) || "",
        esc((i.labels || []).map((l) => (typeof l === "string" ? l : l.name)).join("; ")),
        esc(stripMd(i.body || "")),
      ].join(",") + "\n";
    }
    saveBlob(new Blob([csv], { type: "text/csv" }), "user_stories.csv");
    return;
  }

  const divs = document.querySelectorAll(".day-commits");
  const table =
    divs.length === 0 ? document.querySelector("table") : await createTableFactice();
  if (!table) return;
  const heads = table.querySelectorAll("thead");
  const rows = table.querySelectorAll("tr");
  let csv = "";
  for (const head of heads) {
    head.querySelectorAll("th").forEach((th) => { csv += `${th.textContent},`; });
    csv = csv.slice(0, -1) + "\n";
  }
  for (const row of rows) {
    row.querySelectorAll("td").forEach((cell) => { csv += `${cell.textContent},`; });
    csv = csv.slice(0, -1) + "\n";
  }
  saveBlob(new Blob([csv], { type: "text/csv" }), divs.length === 0 ? "issues.csv" : "commits.csv");
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

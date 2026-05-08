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
      return await exportCardsToPdf(jsPDF);
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

async function exportCardsToPdf(jsPDF) {
  const issues = currentIssues.filter((i) => !i.pull_request);
  if (!issues.length) return;
  if (typeof html2canvas !== "function") {
    alert("html2canvas non chargé.");
    return;
  }

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const maxW = pageW - margin * 2;

  // Page de garde
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text("User stories", margin, margin + 20);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(110);
  pdf.text(
    `Exporté le ${new Date().toLocaleString("fr-FR")} — ${issues.length} issues`,
    margin,
    margin + 42
  );
  pdf.setTextColor(0);

  let y = margin + 70;

  for (const issue of issues) {
    const node = buildPrintableCard(issue, 720);
    document.body.appendChild(node);
    let canvas;
    try {
      canvas = await html2canvas(node, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
    } finally {
      document.body.removeChild(node);
    }

    const imgW = maxW;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (y + imgH > pageH - margin) {
      pdf.addPage();
      y = margin;
    }

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, imgW, imgH);
    y += imgH + 18;
  }

  saveBlob(pdf.output("blob"), "user_stories.pdf");
}

// ─── Export ZIP de PNG par user story ─────────────
export async function exportUserStoriesZip() {
  if (!isCardsView() || !currentIssues.length) {
    alert("Affiche la vue 'User stories' avant d'exporter.");
    return;
  }
  if (typeof JSZip !== "function") {
    alert("JSZip non chargé.");
    return;
  }
  if (typeof html2canvas !== "function") {
    alert("html2canvas non chargé.");
    return;
  }

  const btn = document.getElementById("export-us-zip");
  const original = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Génération...";
  }

  try {
    const zip = new JSZip();
    const folder = zip.folder("user_stories");
    const issues = currentIssues.filter((i) => !i.pull_request);

    let i = 0;
    for (const issue of issues) {
      i++;
      if (btn) btn.textContent = `⏳ ${i}/${issues.length}`;
      const node = buildPrintableCard(issue, 900);
      document.body.appendChild(node);
      let blob;
      try {
        const canvas = await html2canvas(node, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
          logging: false,
        });
        blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      } finally {
        document.body.removeChild(node);
      }
      const safeTitle = (issue.title || "untitled")
        .replace(/[^a-z0-9àâäéèêëîïôöùûüç \-_]/gi, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
      folder.file(`US_${String(issue.number).padStart(3, "0")}_${safeTitle}.png`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveBlob(zipBlob, `user_stories_${new Date().toISOString().slice(0, 10)}.zip`);
  } catch (err) {
    console.error(err);
    alert("Erreur export ZIP : " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = original;
    }
  }
}

// ─── Construit une "carte imprimable" hors-écran ───
function buildPrintableCard(issue, width = 800) {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position: absolute;
    left: -99999px;
    top: 0;
    width: ${width}px;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #24292e;
    padding: 24px 28px;
    border-radius: 12px;
    border: 1px solid #e1e4e8;
    border-left: 5px solid ${issue.state === "open" ? "#1a7f37" : "#8250df"};
    box-sizing: border-box;
  `;

  const stateBadge = issue.state === "open"
    ? `<span style="background:#dafbe1;color:#1a7f37;font-size:11px;font-weight:700;padding:4px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:.4px;">○ Ouverte</span>`
    : `<span style="background:#fbefff;color:#8250df;font-size:11px;font-weight:700;padding:4px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:.4px;">✓ Fermée</span>`;

  const labels = (issue.labels || []).map((l) => {
    const name = typeof l === "string" ? l : l.name;
    const color = typeof l === "string" ? "8b949e" : (l.color || "8b949e");
    return `<span style="display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;background:#${color}22;color:#${color === "ffffff" ? "555" : color};border:1px solid #${color}66;margin:0 4px 4px 0;">${escHtml(name)}</span>`;
  }).join("");

  const created = new Date(issue.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const closed = issue.closed_at
    ? new Date(issue.closed_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;
  const assignees = (issue.assignees || []).map((a) => a.login).join(", ");

  const bodyHtml = renderMarkdownForPrint(issue.body || "");

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
      ${stateBadge}
      <span style="font-family:'SF Mono',Menlo,monospace;font-size:13px;color:#586069;">#${issue.number}</span>
      <h2 style="margin:0;font-size:20px;font-weight:700;color:#24292e;flex:1;line-height:1.3;">${escHtml(issue.title)}</h2>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:12px;color:#586069;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #eaecef;">
      ${issue.user?.login ? `<span><strong style="color:#24292e;">Auteur :</strong> ${escHtml(issue.user.login)}</span>` : ""}
      <span><strong style="color:#24292e;">Créée :</strong> ${created}</span>
      ${closed ? `<span><strong style="color:#24292e;">Fermée :</strong> ${closed}</span>` : ""}
      ${assignees ? `<span><strong style="color:#24292e;">Assigné :</strong> ${escHtml(assignees)}</span>` : ""}
      ${issue.milestone ? `<span><strong style="color:#24292e;">Milestone :</strong> ${escHtml(issue.milestone.title)}</span>` : ""}
    </div>
    ${labels ? `<div style="margin-bottom:12px;">${labels}</div>` : ""}
    <div style="font-size:14px;line-height:1.6;color:#24292e;">${bodyHtml}</div>
  `;
  return wrap;
}

function renderMarkdownForPrint(md) {
  if (!md.trim()) return `<em style="color:#959da5;">Pas de description.</em>`;
  let html;
  if (window.marked) {
    try {
      html = window.marked.parse(md, { breaks: true, gfm: true });
    } catch (_) {
      html = escHtml(md).replace(/\n/g, "<br>");
    }
  } else {
    html = escHtml(md).replace(/\n/g, "<br>");
  }
  // Style inline pour html2canvas (pas d'accès aux .markdown-body classes)
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  wrap.querySelectorAll("h1,h2,h3,h4").forEach((h) => {
    h.style.cssText = "margin:14px 0 6px;font-size:16px;font-weight:700;color:#24292e;";
  });
  wrap.querySelectorAll("p").forEach((p) => {
    p.style.cssText = "margin:0 0 10px;";
  });
  wrap.querySelectorAll("ul,ol").forEach((l) => {
    l.style.cssText = "margin:6px 0 10px;padding-left:24px;";
  });
  wrap.querySelectorAll("li").forEach((li) => {
    li.style.cssText = "margin:3px 0;";
  });
  wrap.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    const span = document.createElement("span");
    span.textContent = cb.checked ? "☑ " : "☐ ";
    span.style.cssText = "color:#0969da;font-weight:700;";
    cb.replaceWith(span);
  });
  wrap.querySelectorAll("code").forEach((c) => {
    if (c.parentElement.tagName !== "PRE") {
      c.style.cssText = "background:#f6f8fa;padding:2px 6px;border-radius:4px;font-family:'SF Mono',Menlo,monospace;font-size:12px;";
    }
  });
  wrap.querySelectorAll("pre").forEach((p) => {
    p.style.cssText = "background:#0d1117;color:#e6edf3;padding:12px;border-radius:6px;overflow-x:auto;font-family:'SF Mono',Menlo,monospace;font-size:12px;margin:8px 0;";
  });
  wrap.querySelectorAll("blockquote").forEach((b) => {
    b.style.cssText = "border-left:3px solid #d0d7de;padding-left:12px;color:#586069;margin:8px 0;";
  });
  return wrap.innerHTML;
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

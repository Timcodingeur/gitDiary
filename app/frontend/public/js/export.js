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
// Clone la vraie .issue-card du DOM (style identique) et l'embellit pour l'export.
function buildPrintableCard(issue, width = 800) {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position: absolute;
    left: -99999px;
    top: 0;
    width: ${width}px;
    padding: 16px;
    background: #ffffff;
    box-sizing: border-box;
    overflow: visible;
  `;

  // Trouver la carte affichée et la cloner (les CSS de style.css s'appliquent au clone)
  const original = document.querySelector(
    `.issue-card[data-issue-number="${issue.number}"]`
  );
  let card;
  if (original) {
    card = original.cloneNode(true);
    card.style.cssText += `
      width: 100%;
      max-width: none;
      min-width: 0;
      box-sizing: border-box;
      margin: 0;
    `;
  } else {
    card = document.createElement("div");
    card.className = `issue-card issue-card-${issue.state}`;
    card.textContent = issue.title || "(sans titre)";
  }

  // Remplace les <input type=checkbox> par de vraies cases visuelles dessinées en CSS.
  card.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    const checked = cb.checked;
    const box = document.createElement("span");
    box.style.cssText = `
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid ${checked ? "#1a7f37" : "#8c959f"};
      border-radius: 3px;
      background: ${checked ? "#1a7f37" : "#ffffff"};
      vertical-align: -3px;
      margin-right: 8px;
      box-sizing: border-box;
      text-align: center;
      line-height: 10px;
      font-size: 11px;
      font-weight: 900;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    if (checked) box.textContent = "✓";
    cb.replaceWith(box);
  });

  // Empêche tout débordement horizontal du contenu markdown (pre/code/img)
  card.querySelectorAll("pre, code").forEach((el) => {
    el.style.whiteSpace = "pre-wrap";
    el.style.wordBreak = "break-word";
    el.style.overflow = "visible";
  });
  card.querySelectorAll("img").forEach((img) => {
    img.style.maxWidth = "100%";
    img.style.height = "auto";
  });

  // Pour l'export, on enlève la limite de hauteur du body markdown
  card.querySelectorAll(".issue-body").forEach((b) => {
    b.style.maxHeight = "none";
    b.style.overflow = "visible";
  });

  // Sanitize : supprime les valeurs CSS modernes que html2canvas v1 ne sait pas parser
  // (color-mix, oklch, color(), lab(), lch(), etc.)
  const offending = /(color-mix|oklch|oklab|color\(|lab\(|lch\()/i;
  card.querySelectorAll("*").forEach((el) => {
    const inline = el.getAttribute("style");
    if (inline && offending.test(inline)) {
      el.setAttribute("style", inline.replace(/[a-z-]+\s*:\s*[^;]*?(color-mix|oklch|oklab|color\(|lab\(|lch\()[^;]*;?/gi, ""));
    }
  });

  // Petit footer discret avec date d'export
  const footer = document.createElement("div");
  footer.style.cssText = `
    margin-top: 10px;
    font-size: 10px;
    color: #959da5;
    text-align: right;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `;
  footer.textContent = `Exporté le ${new Date().toLocaleDateString("fr-FR")}`;
  card.appendChild(footer);

  wrap.appendChild(card);
  return wrap;
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

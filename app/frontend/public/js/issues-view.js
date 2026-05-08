// Vues "user stories" (cartes) et Kanban pour les issues GitHub.

// Stocke les issues actuellement affichées (pour les exports).
export let currentIssues = [];
export function setCurrentIssues(list) { currentIssues = list || []; }

const STATE_COLUMNS = [
  { key: "open", label: "À faire / Ouvertes", match: (i) => i.state === "open" && !hasLabel(i, ["in progress", "doing", "wip"]) },
  { key: "progress", label: "En cours", match: (i) => i.state === "open" && hasLabel(i, ["in progress", "doing", "wip"]) },
  { key: "closed", label: "Terminées", match: (i) => i.state === "closed" },
];

function hasLabel(issue, names) {
  if (!issue.labels) return false;
  const lower = names.map((n) => n.toLowerCase());
  return issue.labels.some((l) => {
    const n = (typeof l === "string" ? l : l.name || "").toLowerCase();
    return lower.some((needle) => n.includes(needle));
  });
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarkdown(md) {
  if (!md) return '<em class="empty-desc">Pas de description.</em>';
  if (window.marked) {
    try {
      return window.marked.parse(md, { breaks: true, gfm: true });
    } catch (_) {
      /* fallthrough */
    }
  }
  return escHtml(md).replace(/\n/g, "<br>");
}

function labelChip(label) {
  const name = typeof label === "string" ? label : label.name;
  const color = typeof label === "string" ? "8b949e" : (label.color || "8b949e");
  return `<span class="issue-chip" style="--chip:#${color}">${escHtml(name)}</span>`;
}

function avatar(user, size = 24) {
  if (!user) return "";
  const url = user.avatar_url ? `${user.avatar_url}&s=${size * 2}` : "";
  return url
    ? `<img class="issue-avatar" src="${url}" alt="${escHtml(user.login)}" title="${escHtml(user.login)}" style="width:${size}px;height:${size}px">`
    : "";
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

// ─────────────────────────────────────────────
// Vue cartes (user stories)
// ─────────────────────────────────────────────
export function createIssuesCards(issues) {
  const container = document.querySelector(".container");
  if (!container) return;
  setCurrentIssues(issues);

  const wrap = document.createElement("div");
  wrap.className = "issues-cards-wrap";

  const stats = document.createElement("div");
  stats.className = "issues-stats";
  const open = issues.filter((i) => i.state === "open" && !i.pull_request).length;
  const closed = issues.filter((i) => i.state === "closed" && !i.pull_request).length;
  const prs = issues.filter((i) => i.pull_request).length;
  stats.innerHTML = `
    <span class="stat-pill stat-open">● ${open} ouvertes</span>
    <span class="stat-pill stat-closed">● ${closed} fermées</span>
    ${prs ? `<span class="stat-pill stat-pr">● ${prs} PR</span>` : ""}
    <span class="stat-pill">${issues.length} au total</span>
  `;
  wrap.appendChild(stats);

  const grid = document.createElement("div");
  grid.className = "issues-grid";

  issues
    .filter((i) => !i.pull_request)
    .forEach((issue) => grid.appendChild(buildIssueCard(issue)));

  wrap.appendChild(grid);
  container.appendChild(wrap);
}

function buildIssueCard(issue) {
  const card = document.createElement("article");
  card.className = `issue-card issue-card-${issue.state}`;

  const labels = (issue.labels || []).map(labelChip).join("");
  const assignees = (issue.assignees || []).map((a) => avatar(a, 22)).join("");

  card.innerHTML = `
    <header class="issue-card-head">
      <span class="issue-state-badge issue-state-${issue.state}">
        ${issue.state === "open" ? "○" : "✓"} ${issue.state === "open" ? "Ouverte" : "Fermée"}
      </span>
      <span class="issue-num">#${issue.number}</span>
      <a class="issue-title-link" href="${issue.html_url}" target="_blank" rel="noopener">${escHtml(issue.title)}</a>
    </header>
    <div class="issue-meta">
      ${avatar(issue.user, 28)}
      <span class="issue-author">${escHtml(issue.user?.login || "?")}</span>
      <span class="issue-dot">·</span>
      <span class="issue-date">Ouverte le ${fmtDate(issue.created_at)}</span>
      ${issue.closed_at ? `<span class="issue-dot">·</span><span class="issue-date">Fermée le ${fmtDate(issue.closed_at)}</span>` : ""}
      ${assignees ? `<span class="issue-assignees">${assignees}</span>` : ""}
    </div>
    ${labels ? `<div class="issue-labels">${labels}</div>` : ""}
    <div class="issue-body markdown-body">${renderMarkdown(issue.body)}</div>
    ${issue.milestone ? `<div class="issue-milestone">🎯 ${escHtml(issue.milestone.title)}</div>` : ""}
  `;

  return card;
}

// ─────────────────────────────────────────────
// Vue Kanban
// ─────────────────────────────────────────────
export function createKanban(issues) {
  const container = document.querySelector(".container");
  if (!container) return;
  setCurrentIssues(issues);

  const board = document.createElement("div");
  board.className = "kanban-board";
  board.id = "kanban-board";

  const realIssues = issues.filter((i) => !i.pull_request);

  STATE_COLUMNS.forEach((col) => {
    const items = realIssues.filter(col.match);
    const column = document.createElement("div");
    column.className = `kanban-col kanban-col-${col.key}`;
    column.innerHTML = `
      <header class="kanban-col-head">
        <span class="kanban-col-title">${col.label}</span>
        <span class="kanban-col-count">${items.length}</span>
      </header>
      <div class="kanban-col-body"></div>
    `;
    const body = column.querySelector(".kanban-col-body");

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "kanban-empty";
      empty.textContent = "Aucune issue";
      body.appendChild(empty);
    } else {
      items.forEach((issue) => body.appendChild(buildKanbanCard(issue)));
    }
    board.appendChild(column);
  });

  container.appendChild(board);
}

function buildKanbanCard(issue) {
  const card = document.createElement("div");
  card.className = "kanban-card";
  const labels = (issue.labels || []).slice(0, 4).map(labelChip).join("");
  const assignees = (issue.assignees || []).slice(0, 3).map((a) => avatar(a, 22)).join("");
  const body = (issue.body || "").trim();
  const excerpt = body
    ? escHtml(body.replace(/[#*_`>~\-]+/g, " ").replace(/\s+/g, " ")).slice(0, 140) + (body.length > 140 ? "…" : "")
    : "";

  card.innerHTML = `
    <div class="kanban-card-head">
      <span class="kanban-num">#${issue.number}</span>
      <a href="${issue.html_url}" target="_blank" rel="noopener" class="kanban-title">${escHtml(issue.title)}</a>
    </div>
    ${excerpt ? `<p class="kanban-excerpt">${excerpt}</p>` : ""}
    ${labels ? `<div class="kanban-labels">${labels}</div>` : ""}
    <footer class="kanban-card-foot">
      <span class="kanban-date">${fmtDate(issue.created_at)}</span>
      ${assignees ? `<span class="kanban-assignees">${assignees}</span>` : ""}
    </footer>
  `;
  return card;
}

// ─────────────────────────────────────────────
// Export Kanban PNG (html2canvas)
// ─────────────────────────────────────────────
export async function exportKanbanPng() {
  const board = document.getElementById("kanban-board");
  if (!board) {
    alert("Aucun Kanban affiché à exporter.");
    return;
  }
  if (typeof html2canvas !== "function") {
    alert("Librairie d'export non chargée (problème réseau).");
    return;
  }

  const btn = document.getElementById("export-kanban-png");
  const original = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Export en cours...";
  }

  try {
    // Forcer le rendu complet hors viewport pour capturer toute la largeur
    const cloneWrap = document.createElement("div");
    cloneWrap.style.cssText =
      "position:absolute;left:-99999px;top:0;background:#f6f8fa;padding:32px;display:inline-block;";
    const clone = board.cloneNode(true);
    clone.style.maxHeight = "none";
    cloneWrap.appendChild(clone);
    document.body.appendChild(cloneWrap);

    const canvas = await html2canvas(cloneWrap, {
      backgroundColor: "#f6f8fa",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    document.body.removeChild(cloneWrap);

    const link = document.createElement("a");
    link.download = `kanban_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error(err);
    alert("Erreur lors de l'export : " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = original;
    }
  }
}

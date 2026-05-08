// Vue Gantt / timeline pour issues GitHub.
// Inspiré du script Python : barres horizontales positionnées par date.

const DAY_MS = 86400000;

function parseISO(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(d) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTasks(issues) {
  const tasks = [];
  const today = startOfDay(new Date());
  for (const issue of issues) {
    if (issue.pull_request) continue;
    const start = parseISO(issue.created_at);
    if (!start) continue;
    // Pour une issue ouverte → barre jusqu'à aujourd'hui (pour bien voir la durée).
    // Pour une issue fermée → start → closed_at, mais minimum 2 jours visibles.
    let end;
    if (issue.state === "open") {
      end = today;
    } else {
      end = parseISO(issue.closed_at) || parseISO(issue.updated_at) || today;
    }
    if (end < start) end = start;
    let s = startOfDay(start);
    let e = startOfDay(end);
    // Durée minimale de 2 jours pour rester visible quand tout se passe le même jour.
    if (daysBetween(s, e) < 2) e = addDays(s, 2);
    tasks.push({
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      state: issue.state,
      start: s,
      end: e,
      sameDay: !issue.closed_at || daysBetween(startOfDay(start), startOfDay(end)) < 1,
      author: issue.user?.login || "",
      assignees: (issue.assignees || []).map((a) => a.login),
      labels: (issue.labels || []).map((l) => (typeof l === "string" ? l : l.name)),
    });
  }
  // Tri : par état (ouvertes d'abord), puis par date de création (asc)
  tasks.sort((a, b) => {
    if (a.state !== b.state) return a.state === "open" ? -1 : 1;
    return a.start - b.start;
  });
  return tasks;
}

function computeRange(tasks) {
  if (!tasks.length) {
    const today = startOfDay(new Date());
    return { min: addDays(today, -7), days: 30 };
  }
  let min = tasks[0].start;
  let max = tasks[0].end;
  for (const t of tasks) {
    if (t.start < min) min = t.start;
    if (t.end > max) max = t.end;
  }
  min = addDays(min, -3);
  max = addDays(max, 5);
  return { min, days: daysBetween(min, max) + 1 };
}

export function createGantt(issues) {
  const container = document.querySelector(".container");
  if (!container) return;

  const tasks = buildTasks(issues);
  const wrap = document.createElement("div");
  wrap.className = "gantt-wrap";
  wrap.id = "gantt-view";

  if (tasks.length === 0) {
    wrap.innerHTML = `<div class="gantt-empty">Aucune issue à afficher sur le Gantt.</div>`;
    container.appendChild(wrap);
    return;
  }

  const { min, days } = computeRange(tasks);
  const cellW = 38;
  const rowH = 38;
  const labelW = 320;
  const totalW = days * cellW;
  const today = startOfDay(new Date());

  // Header
  let monthsHtml = "";
  let curMonth = null;
  let monthStart = 0;
  for (let i = 0; i <= days; i++) {
    const d = addDays(min, i);
    const m = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    if (m !== curMonth) {
      if (curMonth !== null) {
        monthsHtml += `<div class="gantt-month" style="left:${monthStart * cellW}px;width:${(i - monthStart) * cellW}px;">${escHtml(curMonth)}</div>`;
      }
      curMonth = m;
      monthStart = i;
    }
  }
  monthsHtml += `<div class="gantt-month" style="left:${monthStart * cellW}px;width:${(days - monthStart) * cellW}px;">${escHtml(curMonth)}</div>`;

  let daysHtml = "";
  for (let i = 0; i < days; i++) {
    const d = addDays(min, i);
    const dow = d.getDay();
    const cls =
      "gantt-day" +
      (dow === 0 || dow === 6 ? " gantt-weekend" : "") +
      (daysBetween(today, d) === 0 ? " gantt-today" : "");
    daysHtml += `<div class="${cls}" style="left:${i * cellW}px;width:${cellW}px;">${d.getDate()}</div>`;
  }

  // Rows
  let labelsHtml = "";
  let rowsHtml = "";
  const todayX = daysBetween(min, today) * cellW;
  const todayLine =
    todayX >= 0 && todayX <= totalW
      ? `<div class="gantt-today-line" style="left:${todayX}px;"></div>`
      : "";

  for (const t of tasks) {
    const startX = daysBetween(min, t.start) * cellW;
    const barDays = Math.max(daysBetween(t.start, t.end), 1);
    const barW = Math.max(barDays * cellW - 4, cellW - 4);
    const barCls = `gantt-bar gantt-bar-${t.state}`;
    const titleAttr = `${t.title.replace(/"/g, "&quot;")} — ${fmtDate(t.start)} → ${fmtDate(t.end)}`;
    labelsHtml += `
      <div class="gantt-label-row">
        <span class="gantt-state-dot gantt-dot-${t.state}"></span>
        <span class="gantt-num">#${t.number}</span>
        <a href="${t.url}" target="_blank" rel="noopener" class="gantt-title" title="${escHtml(t.title)}">${escHtml(t.title)}</a>
      </div>`;
    rowsHtml += `
      <div class="gantt-row">
        <a href="${t.url}" target="_blank" rel="noopener" class="${barCls}"
           style="left:${startX + 2}px;width:${barW}px;"
           title="${titleAttr}">
          <span class="gantt-bar-label">${escHtml(t.title)}</span>
        </a>
      </div>`;
  }

  wrap.innerHTML = `
    <div class="gantt-toolbar">
      <span class="stat-pill">${tasks.length} issues</span>
      <span class="stat-pill stat-open">● ${tasks.filter((t) => t.state === "open").length} ouvertes</span>
      <span class="stat-pill stat-closed">● ${tasks.filter((t) => t.state === "closed").length} fermées</span>
    </div>
    <div class="gantt-board" style="--gantt-row-h:${rowH}px;">
      <div class="gantt-left" style="width:${labelW}px;">
        <div class="gantt-left-header">Issue</div>
        <div class="gantt-left-body">${labelsHtml}</div>
      </div>
      <div class="gantt-right">
        <div class="gantt-header" style="width:${totalW}px;">
          <div class="gantt-months">${monthsHtml}</div>
          <div class="gantt-days">${daysHtml}</div>
        </div>
        <div class="gantt-body" style="width:${totalW}px;">
          ${todayLine}
          ${rowsHtml}
        </div>
      </div>
    </div>
  `;

  container.appendChild(wrap);
}

export async function exportGanttPng() {
  const board = document.getElementById("gantt-view");
  if (!board) {
    alert("Aucun Gantt à exporter.");
    return;
  }
  if (typeof html2canvas !== "function") {
    alert("Librairie d'export non chargée.");
    return;
  }
  const btn = document.getElementById("export-gantt-png");
  const original = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Export...";
  }

  try {
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:absolute;left:-99999px;top:0;background:#fff;padding:24px;display:inline-block;";
    const clone = board.cloneNode(true);
    // Désactiver scroll & limites pour capturer l'intégralité
    clone.querySelectorAll(".gantt-board, .gantt-right, .gantt-left-body, .gantt-body").forEach((n) => {
      n.style.maxHeight = "none";
      n.style.overflow = "visible";
    });
    wrap.appendChild(clone);
    document.body.appendChild(wrap);

    const canvas = await html2canvas(wrap, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    document.body.removeChild(wrap);

    const link = document.createElement("a");
    link.download = `gantt_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error(err);
    alert("Erreur export : " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = original;
    }
  }
}

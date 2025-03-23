export function createIssuesTable(issues) {
  const container = document.querySelector(".container");
  if (container) {
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    const tr = document.createElement("tr");

    const th1 = document.createElement("th");
    th1.id = "number";
    const th2 = document.createElement("th");
    th2.id = "title";
    const th3 = document.createElement("th");
    th3.id = "author";
    const th4 = document.createElement("th");
    th4.id = "state";
    const th5 = document.createElement("th");
    th5.id = "start-date";
    const th6 = document.createElement("th");
    th6.id = "end-date";
    const th7 = document.createElement("th");
    th7.id = "duration";

    th1.textContent = "Issue Number";
    th2.textContent = "Title";
    th3.textContent = "Author";
    th4.textContent = "State";
    th5.textContent = "Start Date";
    th6.textContent = "End Date";
    th7.textContent = "Duration";

    tr.appendChild(th1);
    tr.appendChild(th2);
    tr.appendChild(th3);
    tr.appendChild(th4);
    tr.appendChild(th5);
    tr.appendChild(th6);
    tr.appendChild(th7);
    thead.appendChild(tr);
    table.appendChild(thead);

    issues.forEach((issue) => {
      const tr = document.createElement("tr");
      tr.id = "issue-content";

      const td1 = document.createElement("td");
      td1.id = "issue-number";
      const td2 = document.createElement("td");
      td2.id = "issues-title";
      const td3 = document.createElement("td");
      td3.id = "issue-author";
      const td4 = document.createElement("td");
      td4.id = "issue-state";
      const td5 = document.createElement("td");
      td5.id = "issue-start-date";
      const td6 = document.createElement("td");
      td6.id = "issue-end-date";
      const td7 = document.createElement("td");
      td7.id = "issue-duration";

      td1.textContent = issue.number;
      td2.textContent = issue.title;
      td3.textContent = issue.user.login;
      td4.textContent = issue.state;
      td5.textContent = new Date(issue.created_at).toLocaleString();
      td6.textContent = issue.closed_at
        ? new Date(issue.closed_at).toLocaleString()
        : "N/A";
      // Pour le calcul de la durée, vous pourrez réutiliser la fonction formatDuration (voir module time.js)
      td7.textContent = issue.closed_at ? "Calculated duration" : "N/A";

      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tr.appendChild(td4);
      tr.appendChild(td5);
      tr.appendChild(td6);
      tr.appendChild(td7);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }
}

export async function createTableFactice() {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const tr = document.createElement("tr");

  const th1 = document.createElement("th");
  const th2 = document.createElement("th");
  const th3 = document.createElement("th");
  const th4 = document.createElement("th");
  const th5 = document.createElement("th");

  th1.textContent = "Hash";
  th2.textContent = "Author";
  th3.textContent = "Date";
  th4.textContent = "Message";
  th5.textContent = "Duration";

  tr.appendChild(th1);
  tr.appendChild(th2);
  tr.appendChild(th3);
  tr.appendChild(th4);
  tr.appendChild(th5);
  thead.appendChild(tr);
  table.appendChild(thead);

  const divs = document.querySelectorAll(".day-commits");
  divs.forEach((div, index) => {
    const rows = div.querySelectorAll("table tbody tr");
    rows.forEach((row) => {
      const trClone = document.createElement("tr");
      row.querySelectorAll("td").forEach((td) => {
        const tdClone = td.cloneNode(true);
        trClone.appendChild(tdClone);
      });
      tbody.appendChild(trClone);
    });
    if (index < divs.length - 1) {
      const emptyTr = document.createElement("tr");
      const emptyTd = document.createElement("td");
      emptyTd.colSpan = 5;
      emptyTd.innerHTML = "&nbsp;";
      emptyTr.appendChild(emptyTd);
      tbody.appendChild(emptyTr);
    }
  });

  table.appendChild(tbody);
  return table;
}

export function groupCommitsByDate(commits) {
  const grouped = {};
  commits.forEach((commit) => {
    const date = new Date(commit.commit.author.date).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(commit);
  });
  return grouped;
}

export async function createTable(
  commits,
  groupCommitsByDate,
  getSumCommitsTime,
  handleClickCommit
) {
  console.log('Début de createTable');
  const container = document.querySelector(".container");
  if (!container) {
    console.error('Container not found in createTable');
    return;
  }

  // Nettoyage du container
  container.innerHTML = '';

  console.log('Groupement des commits par date...');
  const grouped = groupCommitsByDate(commits);
  console.log('Nombre de jours:', Object.keys(grouped).length);

  for (const [date, dailyCommits] of Object.entries(grouped)) {
    try {
      console.log(`Création du tableau pour ${date} avec ${dailyCommits.length} commits`);
      const dayDiv = document.createElement("div");
      dayDiv.className = "day-commits";
      const dateHeader = document.createElement("h2");
      dateHeader.textContent = date;
      dayDiv.appendChild(dateHeader);

      // Création du tableau
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");
      const headerRow = document.createElement("tr");

      // En-têtes
      const headers = ["Hash", "Author", "Date", "Message", "Duration"];
      headers.forEach((text, index) => {
        const th = document.createElement("th");
        th.textContent = text;
        th.id = headers[index].toLowerCase();
        headerRow.appendChild(th);
      });

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Lignes de commits
      for (const commit of dailyCommits) {
        console.log(`Traitement du commit ${commit.sha}`);
        const row = document.createElement("tr");
        row.id = "commit-content";

        let timeStr = "";
        try {
          // Récupération du temps
          const response = await fetch(
            `https://api.gitdiary.ch/get-time/${commit.sha}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const minutes = data[0]?.time || 0;
            timeStr = minutes ? `${Math.floor(minutes / 60)}h ${minutes % 60} min` : "Click to add time";
          } else {
            console.warn(`Couldn't get time for commit ${commit.sha}`);
            timeStr = "Click to add time";
          }
        } catch (error) {
          console.error(`Error fetching time for commit ${commit.sha}:`, error);
          timeStr = "Click to add time";
        }

        // Création des cellules
        const cells = [
          { id: "commit-hash", content: commit.sha.substring(0, 7) },
          { id: "commit-author", content: commit.commit.author.name },
          { id: "commit-date", content: new Date(commit.commit.author.date).toLocaleString() },
          { id: "commit-message", content: commit.commit.message },
          { id: "commit-duration", content: timeStr }
        ];

        cells.forEach(({ id, content }) => {
          const td = document.createElement("td");
          td.id = id;
          td.textContent = content;
          if (id === "commit-duration") {
            td.style.cursor = "pointer";
            td.addEventListener("click", () => handleClickCommit(td));
          }
          row.appendChild(td);
        });

        tbody.appendChild(row);
      }

      // Ligne total
      const totalRow = await createTotalRow(dailyCommits, getSumCommitsTime);
      tbody.appendChild(totalRow);

      table.appendChild(tbody);
      dayDiv.appendChild(table);
      container.appendChild(dayDiv);

    } catch (error) {
      console.error('Erreur lors de la création du tableau:', error);
    }
  }
  console.log('Fin de createTable');
}

function createTotalRow(commits, getSumCommitsTime) {
  return new Promise(async (resolve) => {
    const totalRow = document.createElement("tr");
    totalRow.id = "day-total-time";
    
    const cells = [
      { content: "Total", id: "day-total" },
      { content: "", id: "" },
      { content: "", id: "" },
      { content: "", id: "" },
      { content: await getSumCommitsTime(commits), id: "day-total-duration" }
    ];

    cells.forEach(({ content, id }) => {
      const td = document.createElement("td");
      if (id) td.id = id;
      td.textContent = content;
      totalRow.appendChild(td);
    });

    resolve(totalRow);
  });
}

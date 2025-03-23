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
  const container = document.querySelector(".container");
  if (container) {
    const grouped = groupCommitsByDate(commits);
    for (const [date, dailyCommits] of Object.entries(grouped)) {
      const dayDiv = document.createElement("div");
      dayDiv.className = "day-commits";
      const dateHeader = document.createElement("h2");
      dateHeader.textContent = date;
      dayDiv.appendChild(dateHeader);

      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");
      const headerRow = document.createElement("tr");

      const th1 = document.createElement("th");
      th1.textContent = "Hash";
      th1.id = "hash";
      const th2 = document.createElement("th");
      th2.textContent = "Author";
      th2.id = "author";
      const th3 = document.createElement("th");
      th3.textContent = "Date";
      th3.id = "date";
      const th4 = document.createElement("th");
      th4.textContent = "Message";
      th4.id = "message";
      const th5 = document.createElement("th");
      th5.textContent = "Duration";
      th5.id = "duration";

      headerRow.appendChild(th1);
      headerRow.appendChild(th2);
      headerRow.appendChild(th3);
      headerRow.appendChild(th4);
      headerRow.appendChild(th5);
      thead.appendChild(headerRow);
      table.appendChild(thead);

      for (const commit of dailyCommits) {
        const response = await fetch(
          "https://api.gitdiary.ch/get-time/" + commit.sha,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const minutes = data[0]?.time || "";
        let timeStr = "";
        if (minutes !== "") {
          const hr = Math.floor(minutes / 60);
          const min = minutes % 60;
          timeStr = `${hr}h ${min} min`;
        }
        const row = document.createElement("tr");
        row.id = "commit-content";
        const td1 = document.createElement("td");
        td1.id = "commit-hash";
        const td2 = document.createElement("td");
        td2.id = "commit-author";
        const td3 = document.createElement("td");
        td3.id = "commit-date";
        const td4 = document.createElement("td");
        td4.id = "commit-message";
        const td5 = document.createElement("td");
        td5.id = "commit-duration";
        td5.addEventListener("click", () => handleClickCommit(td5));
        td1.textContent = commit.sha;
        td2.textContent = commit.commit.author.name;
        td3.textContent = new Date(commit.commit.author.date).toLocaleString();
        td4.textContent = commit.commit.message;
        td5.textContent = timeStr;
        row.appendChild(td1);
        row.appendChild(td2);
        row.appendChild(td3);
        row.appendChild(td4);
        row.appendChild(td5);
        tbody.appendChild(row);
      }

      const totalRow = document.createElement("tr");
      totalRow.id = "day-total-time";
      const tdTotal1 = document.createElement("td");
      tdTotal1.id = "day-total";
      const tdTotal2 = document.createElement("td");
      const tdTotal3 = document.createElement("td");
      const tdTotal4 = document.createElement("td");
      const tdTotal5 = document.createElement("td");
      tdTotal5.id = "day-total-duration";
      tdTotal1.textContent = "Total";
      tdTotal5.textContent = await getSumCommitsTime(dailyCommits);
      totalRow.appendChild(tdTotal1);
      totalRow.appendChild(tdTotal2);
      totalRow.appendChild(tdTotal3);
      totalRow.appendChild(tdTotal4);
      totalRow.appendChild(tdTotal5);
      tbody.appendChild(totalRow);

      table.appendChild(tbody);
      dayDiv.appendChild(table);
      container.appendChild(dayDiv);
    }
  }
}

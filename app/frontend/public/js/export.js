// script/export.js
import { createTableFactice } from "./table.js";  // Fix import path

export async function exportToPdf() {
  try {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      console.error('jsPDF not found');
      return;
    }

    const pdf = new jsPDF();
    const divs = document.querySelectorAll(".day-commits");
    const table = divs.length === 0
      ? document.querySelector("table")
      : await createTableFactice();

    if (!table) {
      console.error('No table found to export');
      return;
    }

    pdf.autoTable({ html: table });
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = divs.length === 0 ? "issues.pdf" : "commits.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error in exportToPdf:', error);
  }
}

export async function exportToMarkdown() {
  const divs = document.querySelectorAll(".day-commits");
  const table =
    divs.length === 0
      ? document.querySelector("table")
      : await createTableFactice();
  const heads = table.querySelectorAll("thead");
  const rows = table.querySelectorAll("tr");
  let markdown = "";
  for (const head of heads) {
    markdown += "| ";
    head.querySelectorAll("th").forEach((th) => {
      markdown += `${th.textContent} | `;
    });
    markdown = markdown.slice(0, -3);
    markdown += "\n";
  }
  for (const head of heads) {
    markdown += "| ";
    head.querySelectorAll("th").forEach((th) => {
      markdown += `--- | `;
    });
    markdown = markdown.slice(0, -3);
    markdown += "\n";
  }
  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    markdown += "| ";
    for (const cell of cells) {
      markdown += `${cell.textContent} | `;
    }
    markdown = markdown.slice(0, -3);
    markdown += "\n";
  }
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = divs.length === 0 ? "issues.md" : "commits.md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportToCsv() {
  const divs = document.querySelectorAll(".day-commits");
  const table =
    divs.length === 0
      ? document.querySelector("table")
      : await createTableFactice();
  const heads = table.querySelectorAll("thead");
  const rows = table.querySelectorAll("tr");
  let csv = "";
  for (const head of heads) {
    head.querySelectorAll("th").forEach((th) => {
      csv += `${th.textContent},`;
    });
    csv = csv.slice(0, -1);
    csv += "\n";
  }
  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    cells.forEach((cell) => {
      csv += `${cell.textContent},`;
    });
    csv = csv.slice(0, -1);
    csv += "\n";
  }
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = divs.length === 0 ? "issues.csv" : "commits.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

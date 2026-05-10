const STORAGE_KEY = "rupee-expense-tracker-state-v1";
const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const elements = {
  budgetForm: document.querySelector("#budgetForm"),
  budgetInput: document.querySelector("#budgetInput"),
  expenseForm: document.querySelector("#expenseForm"),
  descriptionInput: document.querySelector("#descriptionInput"),
  amountInput: document.querySelector("#amountInput"),
  dateInput: document.querySelector("#dateInput"),
  budgetValue: document.querySelector("#budgetValue"),
  spentValue: document.querySelector("#spentValue"),
  remainingValue: document.querySelector("#remainingValue"),
  expenseRows: document.querySelector("#expenseRows"),
  emptyState: document.querySelector("#emptyState"),
  viewAllButton: document.querySelector("#viewAllButton"),
  summaryButton: document.querySelector("#summaryButton"),
  summaryDialog: document.querySelector("#summaryDialog"),
  dialogBudget: document.querySelector("#dialogBudget"),
  dialogSpent: document.querySelector("#dialogSpent"),
  dialogRemaining: document.querySelector("#dialogRemaining"),
  dialogCount: document.querySelector("#dialogCount"),
  pdfButton: document.querySelector("#pdfButton"),
  docxButton: document.querySelector("#docxButton"),
  xlsxButton: document.querySelector("#xlsxButton"),
  installButton: document.querySelector("#installButton"),
  toast: document.querySelector("#toast"),
};

let state = loadState();
let deferredInstallPrompt = null;

function loadState() {
  const fallback = { budget: 0, expenses: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.expenses)) return fallback;
    return {
      budget: Number(saved.budget) || 0,
      expenses: saved.expenses
        .filter((expense) => expense.description && expense.purchaseDate && Number(expense.amount) > 0)
        .map((expense) => ({
          id: expense.id || crypto.randomUUID(),
          description: String(expense.description),
          amount: roundMoney(Number(expense.amount)),
          purchaseDate: String(expense.purchaseDate),
        }))
        .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)),
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setBudget(amount) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Enter a valid budget amount.");
  }
  state.budget = roundMoney(amount);
  saveState();
}

function addExpense(description, amount, purchaseDate) {
  const cleanDescription = description.trim();
  validateExpense(cleanDescription, amount, purchaseDate);
  const expense = {
    id: crypto.randomUUID(),
    description: cleanDescription,
    amount: roundMoney(amount),
    purchaseDate,
  };
  state.expenses.push(expense);
  state.expenses.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  saveState();
  return expense;
}

function validateExpense(description, amount, purchaseDate) {
  if (!description) throw new Error("Enter an item name or description.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than zero.");
  if (!purchaseDate || Number.isNaN(Date.parse(`${purchaseDate}T00:00:00`))) {
    throw new Error("Choose a valid purchase date.");
  }
}

function calculateTotalSpent(expenses = state.expenses) {
  return roundMoney(expenses.reduce((total, expense) => total + expense.amount, 0));
}

function calculateRemainingBalance(budget = state.budget, expenses = state.expenses) {
  return roundMoney(budget - calculateTotalSpent(expenses));
}

function getSummary() {
  const totalSpent = calculateTotalSpent();
  return {
    budget: state.budget,
    totalSpent,
    remaining: roundMoney(state.budget - totalSpent),
    count: state.expenses.length,
  };
}

function renderSummary() {
  const summary = getSummary();
  elements.budgetValue.textContent = formatINR(summary.budget);
  elements.spentValue.textContent = formatINR(summary.totalSpent);
  elements.remainingValue.textContent = formatINR(summary.remaining);
  elements.remainingValue.style.color = summary.remaining < 0 ? "var(--danger)" : "var(--ink)";
  elements.dialogBudget.textContent = formatINR(summary.budget);
  elements.dialogSpent.textContent = formatINR(summary.totalSpent);
  elements.dialogRemaining.textContent = formatINR(summary.remaining);
  elements.dialogCount.textContent = String(summary.count);
  elements.budgetInput.value = summary.budget ? String(summary.budget) : "";
}

function renderExpenses() {
  elements.expenseRows.replaceChildren();
  elements.emptyState.hidden = state.expenses.length > 0;

  for (const expense of state.expenses) {
    const row = document.createElement("tr");
    row.append(
      tableCell(formatDate(expense.purchaseDate)),
      tableCell(expense.description),
      tableCell(formatINR(expense.amount), "amount-column"),
    );
    elements.expenseRows.append(row);
  }
}

function renderApp() {
  renderSummary();
  renderExpenses();
}

function tableCell(text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatINR(amount) {
  return currency.format(amount);
}

function formatExportINR(amount) {
  return `INR ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function roundMoney(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

function parseAmount(value) {
  const cleaned = String(value).replace(/[₹,\s]/g, "");
  return Number(cleaned);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 2400);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function reportFilename(extension) {
  return `expense-report-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function getReportRows() {
  const summary = getSummary();
  const summaryRows = [
    ["Budget", formatExportINR(summary.budget)],
    ["Total Spent", formatExportINR(summary.totalSpent)],
    ["Remaining Balance", formatExportINR(summary.remaining)],
    ["Expense Count", String(summary.count)],
  ];
  const expenseRows = state.expenses.map((expense) => [
    expense.purchaseDate,
    expense.description,
    formatExportINR(expense.amount),
  ]);
  return { summaryRows, expenseRows };
}

function exportPdf() {
  const blob = new Blob([buildPdfBytes()], { type: "application/pdf" });
  downloadBlob(blob, reportFilename("pdf"));
  showToast("PDF exported");
}

function buildPdfBytes() {
  const { summaryRows, expenseRows } = getReportRows();
  const rows = expenseRows.length ? expenseRows : [["", "No expenses recorded yet", ""]];
  const pages = chunkRows(rows, 24).map((chunk, index, allPages) =>
    buildPdfPageContent(summaryRows, chunk, index + 1, allPages.length),
  );

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const kids = [];
  pages.forEach((content, index) => {
    const pageObjectNumber = 4 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    kids.push(`${pageObjectNumber} 0 R`);
    objects[pageObjectNumber - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber - 1] =
      `<< /Length ${latinBytes(content).length} >>\nstream\n${content}\nendstream`;
  });
  objects[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;

  const parts = ["%PDF-1.4\n"];
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(byteLength(parts.join("")));
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });
  const xrefOffset = byteLength(parts.join(""));
  parts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => parts.push(`${String(offset).padStart(10, "0")} 00000 n \n`));
  parts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return latinBytes(parts.join(""));
}

function buildPdfPageContent(summaryRows, expenseRows, pageNumber, pageCount) {
  const commands = [
    "0.95 0.98 0.97 rg 0 0 612 792 re f",
    "0.06 0.42 0.37 rg 48 724 516 34 re f",
    "BT /F1 18 Tf 1 1 1 rg 1 0 0 1 60 746 Tm (Rupee Expense Tracker) Tj ET",
    "BT /F1 9 Tf 0.35 0.42 0.4 rg 1 0 0 1 498 708 Tm " + pdfText(`Page ${pageNumber} of ${pageCount}`) + " Tj ET",
  ];

  let y = 688;
  commands.push("BT /F1 11 Tf 0 0 0 rg");
  summaryRows.forEach(([label, value]) => {
    commands.push(`1 0 0 1 60 ${y} Tm ${pdfText(`${label}: ${value}`)} Tj`);
    y -= 18;
  });
  commands.push("ET");

  y -= 12;
  commands.push("0.88 0.91 0.9 RG 60 " + (y - 4) + " 492 24 re S");
  commands.push("BT /F1 10 Tf 0.2 0.28 0.26 rg");
  commands.push(`1 0 0 1 70 ${y + 5} Tm (Date) Tj`);
  commands.push(`1 0 0 1 170 ${y + 5} Tm (Description) Tj`);
  commands.push(`1 0 0 1 448 ${y + 5} Tm (Amount) Tj`);
  commands.push("ET");
  y -= 28;

  expenseRows.forEach(([date, description, amount]) => {
    commands.push("0.88 0.91 0.9 RG 60 " + (y - 7) + " 492 24 re S");
    commands.push("BT /F1 9 Tf 0 0 0 rg");
    commands.push(`1 0 0 1 70 ${y} Tm ${pdfText(date)} Tj`);
    commands.push(`1 0 0 1 170 ${y} Tm ${pdfText(trimForPdf(description, 44))} Tj`);
    commands.push(`1 0 0 1 420 ${y} Tm ${pdfText(amount)} Tj`);
    commands.push("ET");
    y -= 24;
  });

  return commands.join("\n");
}

function chunkRows(rows, size) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
}

function trimForPdf(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function pdfText(value) {
  const escaped = String(value)
    .replace(/[₹]/g, "INR")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  return `(${escaped})`;
}

function latinBytes(value) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function byteLength(value) {
  return latinBytes(value).length;
}

function exportDocx() {
  const blob = new Blob([buildDocxBytes()], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  downloadBlob(blob, reportFilename("docx"));
  showToast("Word document exported");
}

function buildDocxBytes() {
  const { summaryRows, expenseRows } = getReportRows();
  const summaryTable = buildDocxTable([["Metric", "Value"], ...summaryRows]);
  const expenseTable = buildDocxTable([["Date", "Description", "Amount"], ...(expenseRows.length ? expenseRows : [["", "No expenses recorded yet", ""]])]);
  const documentXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    "<w:body>" +
    docxParagraph("Rupee Expense Tracker", true) +
    docxParagraph("Budget Summary", true) +
    summaryTable +
    docxParagraph("Expense Records", true) +
    expenseTable +
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900"/></w:sectPr>' +
    "</w:body></w:document>";

  return zipStore([
    ["[Content_Types].xml", DOCX_CONTENT_TYPES],
    ["_rels/.rels", DOCX_RELS],
    ["word/document.xml", documentXml],
  ]);
}

function docxParagraph(text, bold = false) {
  const boldTag = bold ? "<w:b/>" : "";
  return `<w:p><w:r><w:rPr>${boldTag}</w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
}

function buildDocxTable(rows) {
  const tableRows = rows
    .map((row) => {
      const cells = row
        .map((cell) => `<w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr>${docxParagraph(cell)}</w:tc>`)
        .join("");
      return `<w:tr>${cells}</w:tr>`;
    })
    .join("");
  return `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="6"/><w:left w:val="single" w:sz="6"/><w:bottom w:val="single" w:sz="6"/><w:right w:val="single" w:sz="6"/><w:insideH w:val="single" w:sz="6"/><w:insideV w:val="single" w:sz="6"/></w:tblBorders></w:tblPr>${tableRows}</w:tbl>`;
}

function exportXlsx() {
  const blob = new Blob([buildXlsxBytes()], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, reportFilename("xlsx"));
  showToast("Excel workbook exported");
}

function buildXlsxBytes() {
  const summary = getSummary();
  const rows = [
    ["Rupee Expense Tracker"],
    [],
    ["Budget", summary.budget],
    ["Total Spent", summary.totalSpent],
    ["Remaining Balance", summary.remaining],
    ["Expense Count", summary.count],
    [],
    ["Date", "Description", "Amount"],
    ...state.expenses.map((expense) => [expense.purchaseDate, expense.description, expense.amount]),
  ];

  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => xlsxCell(rowIndex + 1, colIndex + 1, value))
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  const sheetXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<cols><col min="1" max="1" width="18" customWidth="1"/><col min="2" max="2" width="38" customWidth="1"/><col min="3" max="3" width="18" customWidth="1"/></cols>' +
    `<sheetData>${sheetRows}</sheetData></worksheet>`;

  return zipStore([
    ["[Content_Types].xml", XLSX_CONTENT_TYPES],
    ["_rels/.rels", XLSX_RELS],
    ["xl/workbook.xml", XLSX_WORKBOOK],
    ["xl/_rels/workbook.xml.rels", XLSX_WORKBOOK_RELS],
    ["xl/worksheets/sheet1.xml", sheetXml],
  ]);
}

function xlsxCell(row, column, value) {
  const ref = `${columnName(column)}${row}`;
  if (typeof value === "number") {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
}

function columnName(index) {
  let name = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach(([name, data]) => {
    const nameBytes = encoder.encode(name);
    const dataBytes = typeof data === "string" ? encoder.encode(data) : data;
    const crc = crc32(dataBytes);
    const localHeader = concatBytes(
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(dataBytes.length),
      u32(dataBytes.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    );
    const centralHeader = concatBytes(
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(dataBytes.length),
      u32(dataBytes.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    );
    localParts.push(localHeader, dataBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  });

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = concatBytes(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralSize),
    u32(offset),
    u16(0),
  );
  return concatBytes(...localParts, ...centralParts, end);
}

function u16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function concatBytes(...parts) {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const DOCX_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const DOCX_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const XLSX_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

const XLSX_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const XLSX_WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Expenses" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

const XLSX_WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

elements.budgetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    setBudget(parseAmount(elements.budgetInput.value));
    renderApp();
    showToast("Budget updated");
  } catch (error) {
    showToast(error.message);
  }
});

elements.expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    addExpense(
      elements.descriptionInput.value,
      parseAmount(elements.amountInput.value),
      elements.dateInput.value,
    );
    elements.expenseForm.reset();
    elements.dateInput.value = new Date().toISOString().slice(0, 10);
    renderApp();
    showToast("Expense added");
  } catch (error) {
    showToast(error.message);
  }
});

elements.viewAllButton.addEventListener("click", renderExpenses);
elements.summaryButton.addEventListener("click", () => elements.summaryDialog.showModal());
elements.pdfButton.addEventListener("click", exportPdf);
elements.docxButton.addEventListener("click", exportDocx);
elements.xlsxButton.addEventListener("click", exportXlsx);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  elements.installButton.hidden = false;
});

elements.installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  elements.installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      showToast("Offline support could not be started");
    });
  });
}

elements.dateInput.value = new Date().toISOString().slice(0, 10);
renderApp();

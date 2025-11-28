// ================== TAB SWITCHING ==================
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-button");
  const sections = document.querySelectorAll(".tab-section");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      sections.forEach(s => s.classList.remove("active"));

      tab.classList.add("active");
      const targetId = tab.dataset.target;
      document.getElementById(targetId).classList.add("active");
    });
  });
});

// ================== WORKFLOW BUILDER ==================
let canvas = document.getElementById("canvas");
let selectedNode = null;

// Make tools draggable
document.querySelectorAll(".tool").forEach(t => {
  t.addEventListener("dragstart", e => {
    e.dataTransfer.setData("type", t.dataset.type);
  });
});

// Allow dropping on canvas
canvas.addEventListener("dragover", e => e.preventDefault());

canvas.addEventListener("drop", e => {
  e.preventDefault();
  const stepType = e.dataTransfer.getData("type");
  createNode(stepType, e.offsetX, e.offsetY);
});

// Hide / show hint text
function updateCanvasHint() {
  const hint = document.querySelector(".canvas-hint");
  if (!hint) return;
  const hasNodes = document.querySelectorAll(".node").length > 0;
  hint.style.display = hasNodes ? "none" : "block";
}

// Create a workflow node
function createNode(type, x, y, customTitle) {
  const node = document.createElement("div");
  node.className = "node " + type;

  node.style.left = x + "px";
  node.style.top = y + "px";

  node.dataset.type = type;
  node.dataset.title = customTitle || type.charAt(0).toUpperCase() + type.slice(1);
  node.dataset.desc = "";
  node.dataset.owner = "";
  node.dataset.time = "";

  node.innerText = node.dataset.title;
  node.onclick = () => selectNode(node);

  // Double-clicking a Start node runs the workflow
  if (type === "start") {
    node.ondblclick = () => runWorkflow();
  }

  canvas.appendChild(node);
  updateCanvasHint();
}

// Select node
function selectNode(node) {
  selectedNode = node;
  document.getElementById("prop-title").value = node.dataset.title;
  document.getElementById("prop-desc").value = node.dataset.desc;
  document.getElementById("prop-owner").value = node.dataset.owner;
  document.getElementById("prop-time").value = node.dataset.time;
}

// Save node edits
document.getElementById("saveButton").onclick = () => {
  if (!selectedNode) return;

  selectedNode.dataset.title = document.getElementById("prop-title").value;
  selectedNode.dataset.desc = document.getElementById("prop-desc").value;
  selectedNode.dataset.owner = document.getElementById("prop-owner").value;
  selectedNode.dataset.time = document.getElementById("prop-time").value;

  selectedNode.innerText = selectedNode.dataset.title;
};

// Delete node
document.getElementById("deleteButton").onclick = () => {
  if (!selectedNode) return;

  selectedNode.remove();
  selectedNode = null;

  document.getElementById("prop-title").value = "";
  document.getElementById("prop-desc").value = "";
  document.getElementById("prop-owner").value = "";
  document.getElementById("prop-time").value = "";
  updateCanvasHint();
};

// CSV Import (for workflow)
document.getElementById("csvUpload").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const rows = e.target.result.split("\n").map(r => r.trim()).filter(r => r);
    if (!rows.length) return;

    rows.shift(); // remove header

    let y = 40;

    rows.forEach(r => {
      const parts = r.split(",");
      if (parts.length < 2) return;

      const title = parts[0];
      const type = parts[1].trim().toLowerCase();

      createNode(type, 100, y, title);
      y += 80;
    });
  };

  reader.readAsText(file);
});

// Run workflow & export
document.getElementById("runButton").onclick = () => {
  runWorkflow();
};

function getOrderedNodes() {
  const nodes = Array.from(document.querySelectorAll(".node"));
  return nodes.sort((a, b) => parseInt(a.style.top) - parseInt(b.style.top));
}

function getWorkflowData() {
  const ordered = getOrderedNodes();
  return ordered.map((node, index) => ({
    step: index + 1,
    title: node.dataset.title,
    type: node.dataset.type,
    description: node.dataset.desc,
    owner: node.dataset.owner,
    estimatedTime: node.dataset.time
  }));
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportWorkflowFiles(steps) {
  // JSON
  const jsonContent = JSON.stringify(steps, null, 2);
  downloadFile("workflow.json", jsonContent, "application/json");

  // TXT
  let txt = "Workflow Steps\n\n";
  steps.forEach(s => {
    txt += `${s.step}. ${s.title} [${s.type}]\n`;
    if (s.owner) txt += `   Owner: ${s.owner}\n`;
    if (s.estimatedTime) txt += `   Time: ${s.estimatedTime}\n`;
    if (s.description) txt += `   ${s.description}\n`;
    txt += "\n";
  });
  downloadFile("workflow.txt", txt, "text/plain");

  // CSV
  let csv = "Step,Title,Type,Owner,EstimatedTime,Description\n";
  steps.forEach(s => {
    const row = [
      s.step,
      `"${s.title}"`,
      s.type,
      `"${s.owner || ""}"`,
      `"${s.estimatedTime || ""}"`,
      `"${(s.description || "").replace(/"/g, '""')}"`
    ];
    csv += row.join(",") + "\n";
  });
  downloadFile("workflow.csv", csv, "text/csv");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWorkflow() {
  const orderedNodes = getOrderedNodes();
  if (!orderedNodes.length) {
    alert("No steps in the workflow yet.");
    return;
  }

  const hasStart = orderedNodes.some(n => n.dataset.type === "start");
  if (!hasStart) {
    alert("Add a Start step before running the workflow.");
    return;
  }

  orderedNodes.forEach(n => {
    n.classList.remove("running", "completed");
  });

  for (const node of orderedNodes) {
    node.classList.add("running");
    await sleep(700);
    node.classList.remove("running");
    node.classList.add("completed");
  }

  const steps = getWorkflowData();
  exportWorkflowFiles(steps);
}

// ================== LOAN & RISK ANALYSIS ==================

// Currency symbols for international support
const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SGD: "S$",
  CNY: "¥",
  CAD: "C$",
  AUD: "A$",
  BRL: "R$"
};

function formatCurrency(amount, currency) {
  const symbol = currencySymbols[currency] || "";
  return symbol + Number(amount || 0).toLocaleString("en-US");
}

const fileInput = document.getElementById("dataFile");
const kpiSection = document.getElementById("kpiSection");
const summarySection = document.getElementById("summarySection");
const tableSection = document.getElementById("tableSection");

if (fileInput) {
  fileInput.addEventListener("change", handleFileUpload);
}

function handleFileUpload() {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const rows = parseCSV(text);
    const clients = rowsToObjects(rows);
    if (!clients.length) {
      alert("No valid rows found in the file.");
      return;
    }
    const analysis = analyzeClients(clients);
    renderKpis(analysis);
    renderSummary(analysis);
    renderTable(analysis.clientsWithRisk);
  };
  reader.readAsText(file);
}

// --- CSV PARSING ---
function parseCSV(text) {
  return text
    .split("\n")
    .map(r => r.trim())
    .filter(r => r.length > 0);
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const header = rows[0].split(",").map(h => h.trim());
  const dataRows = rows.slice(1);
  const objects = [];

  dataRows.forEach(row => {
    const parts = splitCsvRow(row);
    if (parts.length !== header.length) return;

    const obj = {};
    header.forEach((key, i) => {
      obj[key] = parts[i];
    });
    objects.push(obj);
  });

  return objects;
}

// handle simple quoted values
function splitCsvRow(row) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"' && row[i + 1] === '"') {
      current += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map(v => v.trim());
}

// --- ANALYSIS LOGIC ---
function analyzeClients(rows) {
  const today = new Date();
  let totalLoan = 0;
  let totalPaid = 0;

  const clientMap = new Map();
  const currencyCounts = {};

  rows.forEach(r => {
    const id = r.client_id || r.client_name || "";
    if (!id) return;

    const name = r.client_name || id;
    const country = r.country || "-";          // can be "USA, Texas"
    const currency = r.currency || "USD";

    const loanAmount = parseFloat(r.loan_amount || "0") || 0;
    const paid = parseFloat(r.amount_paid || "0") || 0;
    const dueDateStr = r.due_date || "";
    const lastPaymentStr = r.last_payment_date || "";

    const dueDate = dueDateStr ? new Date(dueDateStr) : null;
    const lastPaymentDate = lastPaymentStr ? new Date(lastPaymentStr) : null;

    const outstanding = Math.max(loanAmount - paid, 0);

    let daysOverdue = 0;
    let isOverdue = false;
    if (dueDate && outstanding > 0 && today > dueDate) {
      const diffMs = today - dueDate;
      daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (daysOverdue < 0) daysOverdue = 0;
      isOverdue = daysOverdue > 0;
    }

    // Risk categorization
    let risk = "low";
    if ((isOverdue && daysOverdue > 30) || outstanding > 25000) {
      risk = "high";
    } else if (outstanding > 0 || isOverdue) {
      risk = "medium";
    }

    totalLoan += loanAmount;
    totalPaid += paid;

    currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;

    if (!clientMap.has(id)) {
      clientMap.set(id, {
        clientId: id,
        clientName: name,
        country,
        currency,
        loanAmount: 0,
        paidAmount: 0,
        outstanding: 0,
        maxDaysOverdue: 0,
        isOverdue: false,
        risk: "low",
        latestDueDate: dueDate,
        lastPaymentDate
      });
    }

    const agg = clientMap.get(id);
    agg.loanAmount += loanAmount;
    agg.paidAmount += paid;
    agg.outstanding += outstanding;
    if (daysOverdue > agg.maxDaysOverdue) {
      agg.maxDaysOverdue = daysOverdue;
    }
    if (isOverdue) agg.isOverdue = true;

    const riskRank = { low: 1, medium: 2, high: 3 };
    if (riskRank[risk] > riskRank[agg.risk]) {
      agg.risk = risk;
    }

    if (!agg.latestDueDate || (dueDate && dueDate > agg.latestDueDate)) {
      agg.latestDueDate = dueDate;
    }
  });

  const clients = Array.from(clientMap.values());

  const totalClients = clients.length;
  const totalOutstanding = clients.reduce((sum, c) => sum + c.outstanding, 0);
  const overdueClients = clients.filter(c => c.isOverdue && c.outstanding > 0);
  const overdueAmount = overdueClients.reduce((sum, c) => sum + c.outstanding, 0);

  // Determine main currency (used in KPIs & top summary)
  const mainCurrency = Object.keys(currencyCounts)
    .sort((a, b) => (currencyCounts[b] || 0) - (currencyCounts[a] || 0))[0] || "USD";

  const clientsWithBalance = clients
    .filter(c => c.outstanding > 0 || c.isOverdue)
    .sort((a, b) => {
      const riskRank = { high: 3, medium: 2, low: 1 };
      const diff = riskRank[b.risk] - riskRank[a.risk];
      if (diff !== 0) return diff;
      return b.outstanding - a.outstanding;
    });

  return {
    totalClients,
    totalLoan,
    totalOutstanding,
    overdueClientsCount: overdueClients.length,
    overdueAmount,
    clientsWithRisk: clientsWithBalance,
    mainCurrency
  };
}

// --- RENDERING ---

function renderKpis(a) {
  kpiSection.hidden = false;
  document.getElementById("kpiClients").textContent = a.totalClients;
  document.getElementById("kpiTotalLoan").textContent = formatCurrency(a.totalLoan, a.mainCurrency);
  document.getElementById("kpiOutstanding").textContent = formatCurrency(a.totalOutstanding, a.mainCurrency);
  document.getElementById("kpiOverdueClients").textContent = a.overdueClientsCount;
  document.getElementById("kpiOverdueAmount").textContent = formatCurrency(a.overdueAmount, a.mainCurrency);
}

function renderSummary(a) {
  summarySection.hidden = false;

  const overduePct = a.totalClients
    ? Math.round((a.overdueClientsCount / a.totalClients) * 100)
    : 0;

  const lines = [];

  lines.push(
    `You uploaded data for <b>${a.totalClients}</b> clients with a total loan exposure of <b>${formatCurrency(
      a.totalLoan,
      a.mainCurrency
    )}</b>.`
  );

  lines.push(
    `Out of this, <b>${formatCurrency(
      a.totalOutstanding,
      a.mainCurrency
    )}</b> is still outstanding, and <b>${formatCurrency(
      a.overdueAmount,
      a.mainCurrency
    )}</b> is currently overdue.`
  );

  lines.push(
    `<b>${a.overdueClientsCount}</b> clients (${overduePct}% of the portfolio) are overdue on at least one loan.`
  );

  if (a.overdueClientsCount === 0 && a.totalOutstanding === 0) {
    lines.push(
      `All loans appear to be fully repaid. This portfolio looks <b>very low risk</b> at the moment.`
    );
  } else if (a.overdueAmount > 0 && overduePct >= 30) {
    lines.push(
      `The portfolio shows a <b>concentrated risk</b> with a significant share of overdue clients. Prioritize follow-ups, restructuring or collection strategies for high-risk accounts.`
    );
  } else if (a.overdueAmount > 0) {
    lines.push(
      `There is some overdue exposure, but it is not yet dominant. Suggest prioritizing <b>clients with high outstanding and over 30 days overdue</b> for immediate action.`
    );
  }

  document.getElementById("summaryText").innerHTML = lines.join("<br><br>");
}

function renderTable(clients) {
  tableSection.hidden = clients.length === 0;
  const tbody = document.querySelector("#clientTable tbody");
  tbody.innerHTML = "";

  clients.forEach(c => {
    const tr = document.createElement("tr");

    const dueDateStr = c.latestDueDate
      ? c.latestDueDate.toISOString().split("T")[0]
      : "-";

    const riskBadge = document.createElement("span");
    riskBadge.className = "badge " + c.risk;
    riskBadge.textContent =
      c.risk === "high" ? "High" : c.risk === "medium" ? "Medium" : "Low";

    const overdueDays = c.maxDaysOverdue || 0;

    tr.innerHTML = `
      <td>${c.clientName}</td>
      <td>${c.country}</td>
      <td>${c.currency}</td>
      <td>${formatCurrency(c.loanAmount, c.currency)}</td>
      <td>${formatCurrency(c.outstanding, c.currency)}</td>
      <td>${dueDateStr}</td>
      <td>${overdueDays}</td>
      <td></td>
    `;

    tr.lastElementChild.appendChild(riskBadge);
    tbody.appendChild(tr);
  });
}

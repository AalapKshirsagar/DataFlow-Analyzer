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

// CSV Import
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

document.getElementById("runButton").onclick = () => {
  runWorkflow();
};

function getOrderedNodes() {
  const nodes = Array.from(document.querySelectorAll(".node"));
  return nodes.sort((a, b) => parseInt(a.style.top) - parseInt(b.style.top));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== WORKFLOW → REPORT INTEGRATION ==========

// Read client CSV using existing analyzer logic
function loadClientCSVForWorkflow(callback) {
  const input = document.getElementById("dataFile");
  if (!input || !input.files.length) {
    alert("Upload client CSV in Loan & Risk Analysis first.");
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const text = e.target.result;
    const rows = parseCSV(text);
    const clients = rowsToObjects(rows);

    if (!clients.length) {
      alert("CSV contains no valid rows.");
      return;
    }

    callback(clients);
  };

  reader.readAsText(file);
}

async function runWorkflow() {
  const orderedNodes = getOrderedNodes();
  if (!orderedNodes.length) {
    alert("No steps in workflow.");
    return;
  }

  const wfOutput = document.getElementById("workflow-output");
  const finalReport = document.getElementById("final-report");

  wfOutput.innerHTML = "<h2>Workflow Execution</h2>";
  finalReport.innerHTML = "";

  // Animate workflow
  for (const node of orderedNodes) {
    node.classList.remove("completed", "running");
  }

  for (const node of orderedNodes) {
    node.classList.add("running");

    wfOutput.innerHTML += `
      <div class="wf-step">
        <h3>${node.dataset.title}</h3>
        <p>${node.dataset.desc}</p>
        <p><b>Owner:</b> ${node.dataset.owner}</p>
        <p><b>Time:</b> ${node.dataset.time}</p>
      </div>
    `;

    await sleep(650);
    node.classList.add("completed");
    node.classList.remove("running");
  }

  // After finishing → generate report
  loadClientCSVForWorkflow(clients => {
    const analysis = analyzeClients(clients);

    finalReport.innerHTML = `
      <h2>📊 Final Loan Risk Report</h2>
      <p><b>Total Clients:</b> ${analysis.totalClients}</p>
      <p><b>Total Loan Amount:</b> ${formatCurrency(analysis.totalLoan, analysis.mainCurrency)}</p>
      <p><b>Total Outstanding:</b> ${formatCurrency(analysis.totalOutstanding, analysis.mainCurrency)}</p>
      <p><b>Overdue Clients:</b> ${analysis.overdueClientsCount}</p>
      <p><b>Overdue Amount:</b> ${formatCurrency(analysis.overdueAmount, analysis.mainCurrency)}</p>
      <h3>High & Medium Risk Clients</h3>
    `;

    analysis.clientsWithRisk.forEach(c => {
      finalReport.innerHTML += `
        <div class="wf-report-item">
          <b>${c.clientName}</b><br>
          Country: ${c.country}<br>
          Outstanding: ${formatCurrency(c.outstanding, c.currency)}<br>
          Days Overdue: ${c.maxDaysOverdue}<br>
          Risk: <span class="badge ${c.risk}">${c.risk.toUpperCase()}</span>
        </div>
        <hr>
      `;
    });
  });
}

// ======== rest of your Loan Analysis Code (unchanged) ========
// parsing, analysis, rendering — everything remains the same

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

// (Your CSV parsing, analysis, rendering code continues unchanged…)

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

    // Double-clicking a Start node also runs the workflow
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

// CSV Import
document.getElementById("csvUpload").addEventListener("change", function () {
    let file = this.files[0];
    let reader = new FileReader();

    reader.onload = function (e) {
        const rows = e.target.result.split("\n");
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

// ========== RUN WORKFLOW & EXPORT FILES ==========

// Click "Start Process" button
document.getElementById("runButton").onclick = () => {
    runWorkflow();
};

function getOrderedNodes() {
    const nodes = Array.from(document.querySelectorAll(".node"));
    // order by vertical position (top → bottom)
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

function exportFiles(steps) {
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

    // Optional: require a start node somewhere in the flow
    const hasStart = orderedNodes.some(n => n.dataset.type === "start");
    if (!hasStart) {
        alert("Add a Start step before running the workflow.");
        return;
    }

    // Clear previous run classes
    orderedNodes.forEach(n => {
        n.classList.remove("running", "completed");
    });

    // Animate through steps
    for (const node of orderedNodes) {
        node.classList.add("running");
        await sleep(700);
        node.classList.remove("running");
        node.classList.add("completed");
    }

    // Collect data & export files
    const steps = getWorkflowData();
    exportFiles(steps);
}

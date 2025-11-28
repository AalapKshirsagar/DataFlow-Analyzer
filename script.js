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

// Create workflow node
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
}

// Select a node
function selectNode(node) {
    selectedNode = node;

    document.getElementById("prop-title").value = node.dataset.title;
    document.getElementById("prop-desc").value = node.dataset.desc;
    document.getElementById("prop-owner").value = node.dataset.owner;
    document.getElementById("prop-time").value = node.dataset.time;
}

// SAVE CHANGES
document.getElementById("saveButton").onclick = () => {
    if (!selectedNode) return;

    selectedNode.dataset.title = document.getElementById("prop-title").value;
    selectedNode.dataset.desc = document.getElementById("prop-desc").value;
    selectedNode.dataset.owner = document.getElementById("prop-owner").value;
    selectedNode.dataset.time = document.getElementById("prop-time").value;

    selectedNode.innerText = selectedNode.dataset.title;
};

// DELETE NODE
document.getElementById("deleteButton").onclick = () => {
    if (!selectedNode) return;

    selectedNode.remove();
    selectedNode = null;

    // Reset fields
    document.getElementById("prop-title").value = "";
    document.getElementById("prop-desc").value = "";
    document.getElementById("prop-owner").value = "";
    document.getElementById("prop-time").value = "";
};

// CSV IMPORT
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

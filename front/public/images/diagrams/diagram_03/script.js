(() => {
  "use strict";

  const svgNS = "http://www.w3.org/2000/svg";
  const layerEdges  = document.getElementById("layer-edges");
  const layerPhase  = document.getElementById("layer-phase-arrows");
  const layerNodes  = document.getElementById("layer-nodes");
  const layerLabels = document.getElementById("layer-labels");
  const layerOver   = document.getElementById("layer-overlays");

  /* ================================================================
   *  COLORS per phase
   * ================================================================ */
  const PC = {
    select: { fill: "#dbeafe", stroke: "#2563eb", text: "#1e40af" },
    expand: { fill: "#dcfce7", stroke: "#16a34a", text: "#166534" },
    eval:   { fill: "#ede9fe", stroke: "#7c3aed", text: "#5b21b6" },
    backup: { fill: "#fef3c7", stroke: "#d97706", text: "#92400e" },
    dim:    { fill: "#f1f5f9", stroke: "#cbd5e1", text: "#94a3b8" },
    normal: { fill: "#ffffff", stroke: "#475569", text: "#1e293b" },
    nn:     { fill: "#ede9fe", stroke: "#7c3aed", text: "#5b21b6" },
  };

  /* ================================================================
   *  TREE STRUCTURE
   *  A partial game tree:
   *
   *               root (N=100)
   *            /    |    \
   *         A(30)  B(45)  C(25)
   *        / \      |
   *     A1(10) A2(20) B1(0) ← leaf to expand
   *
   *  After expand, B1 gets children: B1a, B1b, B1c
   * ================================================================ */

  const R = 36; // node radius (bigger for readability in embedded docs)
  const TEXT_SCALE = 1.35; // scales all SVG labels/notes for doc readability

  const TREE = {
    root: { x: 480, y: 65,  N: 100, Q: 0.12,  label: "Root" },
    A:    { x: 220, y: 190, N: 30,  Q: 0.35,  label: "A" },
    B:    { x: 480, y: 190, N: 45,  Q: -0.20, label: "B" },
    C:    { x: 740, y: 190, N: 25,  Q: 0.08,  label: "C" },
    A1:   { x: 160, y: 320, N: 10,  Q: 0.40,  label: "A1" },
    A2:   { x: 280, y: 320, N: 20,  Q: 0.30,  label: "A2" },
    B1:   { x: 480, y: 320, N: 0,   Q: 0,     label: "B1", isLeaf: true },
    // Expanded children (hidden initially)
    B1a:  { x: 390, y: 450, N: 0, Q: 0, label: "B1a", expanded: true, prior: "p₁" },
    B1b:  { x: 480, y: 450, N: 0, Q: 0, label: "B1b", expanded: true, prior: "p₂" },
    B1c:  { x: 570, y: 450, N: 0, Q: 0, label: "B1c", expanded: true, prior: "p₃" },
  };

  const TREE_EDGES = [
    ["root", "A"], ["root", "B"], ["root", "C"],
    ["A", "A1"], ["A", "A2"],
    ["B", "B1"],
    // expanded
    ["B1", "B1a"], ["B1", "B1b"], ["B1", "B1c"],
  ];

  // The SELECT path: root → B → B1
  const SELECT_PATH = ["root", "B", "B1"];

  /* ================================================================
   *  SVG drawing helpers
   * ================================================================ */

  const nodeEls = {};
  const edgeEls = {};

  function drawLine(parent, x1, y1, x2, y2, color, width, dash, opacity) {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1);
    l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    l.setAttribute("stroke", color || "#cbd5e1");
    l.setAttribute("stroke-width", width || "1.5");
    if (dash) l.setAttribute("stroke-dasharray", dash);
    l.setAttribute("opacity", opacity ?? "1");
    parent.appendChild(l);
    return l;
  }

  function drawCircle(parent, cx, cy, r, fill, stroke, sw) {
    const c = document.createElementNS(svgNS, "circle");
    c.setAttribute("cx", cx); c.setAttribute("cy", cy);
    c.setAttribute("r", r);
    c.setAttribute("fill", fill); c.setAttribute("stroke", stroke);
    c.setAttribute("stroke-width", sw || "2");
    parent.appendChild(c);
    return c;
  }

  function drawText(parent, x, y, text, size, weight, fill, anchor) {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("text-anchor", anchor || "middle");
    t.setAttribute("font-family", "Helvetica, Arial, sans-serif");
    const baseSize = Number(size || 10);
    const scaledSize = Number.isFinite(baseSize) ? (baseSize * TEXT_SCALE).toFixed(1) : (size || "10");
    t.setAttribute("font-size", scaledSize);
    t.setAttribute("font-weight", weight || "400");
    t.setAttribute("fill", fill || "#1e293b");
    t.textContent = text;
    parent.appendChild(t);
    return t;
  }

  function drawRect(parent, x, y, w, h, rx, fill, stroke, sw) {
    const r = document.createElementNS(svgNS, "rect");
    r.setAttribute("x", x); r.setAttribute("y", y);
    r.setAttribute("width", w); r.setAttribute("height", h);
    r.setAttribute("rx", rx || "6");
    r.setAttribute("fill", fill); r.setAttribute("stroke", stroke);
    r.setAttribute("stroke-width", sw || "2");
    parent.appendChild(r);
    return r;
  }

  /* ── Build tree edges ── */
  TREE_EDGES.forEach(([from, to]) => {
    const n1 = TREE[from], n2 = TREE[to];
    const isExpanded = TREE[to].expanded;
    const line = drawLine(layerEdges, n1.x, n1.y + R, n2.x, n2.y - R, "#cbd5e1", "1.5", "", "0");
    edgeEls[`${from}->${to}`] = line;
  });

  /* ── Build tree nodes ── */
  Object.entries(TREE).forEach(([id, n]) => {
    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("opacity", "0");

    const circle = drawCircle(g, n.x, n.y, R, "#ffffff", "#475569", "2");
    const labelT = drawText(g, n.x, n.y - 6, n.label, "13", "700", "#1e293b");

    let infoT = null;
    if (!n.expanded) {
      infoT = drawText(g, n.x, n.y + 13, `N=${n.N}`, "10.5", "500", "#64748b");
    } else {
      infoT = drawText(g, n.x, n.y + 13, n.prior, "10.5", "700", "#16a34a");
    }

    layerNodes.appendChild(g);
    nodeEls[id] = { group: g, circle, labelT, infoT };
  });

  /* ── NN box (used in Evaluate phase) ── */
  const nnGroup = document.createElementNS(svgNS, "g");
  nnGroup.setAttribute("opacity", "0");
  drawRect(nnGroup, 110, 400, 150, 70, "8", "#ede9fe", "#7c3aed", "2");
  drawText(nnGroup, 185, 425, "Neural Network", "11", "700", "#5b21b6");
  drawText(nnGroup, 185, 442, "f_θ(s)", "10", "400", "#7c3aed");
  drawText(nnGroup, 185, 458, "→ (π, v)", "10", "600", "#5b21b6");
  layerOver.appendChild(nnGroup);

  /* ── Dirichlet noise note ── */
  const dirichletGroup = document.createElementNS(svgNS, "g");
  dirichletGroup.setAttribute("opacity", "0");
  drawRect(dirichletGroup, 580, 20, 185, 48, "6", "#f8fafc", "#64748b", "1.5");
  drawText(dirichletGroup, 672, 40, "Dirichlet noise at root", "10", "600", "#334155");
  drawText(dirichletGroup, 672, 54, "Dir(α) during self-play", "9.5", "400", "#64748b");
  layerOver.appendChild(dirichletGroup);

  /* ── UCB formula note ── */
  const ucbGroup = document.createElementNS(svgNS, "g");
  ucbGroup.setAttribute("opacity", "0");
  drawRect(ucbGroup, 30, 120, 160, 50, "6", "#eff6ff", "#2563eb", "1.5");
  drawText(ucbGroup, 110, 140, "UCB = Q + c·P·√N/(1+n)", "9.5", "600", "#1e40af");
  drawText(ucbGroup, 110, 155, "sign flips at each level", "9.5", "400", "#2563eb");
  layerOver.appendChild(ucbGroup);

  /* ── Phase arrows / annotations (drawn per step) ── */
  let phaseOverlays = [];

  function clearPhaseOverlays() {
    phaseOverlays.forEach(el => el.remove());
    phaseOverlays = [];
  }

  function addPhaseLabel(text, x, y, color, size) {
    const t = drawText(layerLabels, x, y, text, size || "14", "800", color);
    phaseOverlays.push(t);
    return t;
  }

  function addPhasePath(points, color, width, dash) {
    if (points.length < 2) return;
    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) d += ` L ${points[i][0]},${points[i][1]}`;
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", d);
    p.setAttribute("stroke", color);
    p.setAttribute("stroke-width", width || "3");
    p.setAttribute("fill", "none");
    if (dash) p.setAttribute("stroke-dasharray", dash);
    p.setAttribute("marker-end", `url(#arr)`);
    layerPhase.appendChild(p);
    phaseOverlays.push(p);
    return p;
  }

  function addPhaseArrow(x1, y1, x2, y2, color, width) {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1);
    l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    l.setAttribute("stroke", color);
    l.setAttribute("stroke-width", width || "2.5");
    l.setAttribute("marker-end", "url(#arr)");
    layerPhase.appendChild(l);
    phaseOverlays.push(l);
    return l;
  }

  function addNote(x, y, w, h, text1, text2, bgColor, borderColor, textColor) {
    const g = document.createElementNS(svgNS, "g");
    drawRect(g, x, y, w, h, "6", bgColor, borderColor, "1.5");
    drawText(g, x + w / 2, y + h / 2 - (text2 ? 4 : 3), text1, "10.5", "600", textColor);
    if (text2) drawText(g, x + w / 2, y + h / 2 + 10, text2, "9.5", "400", textColor);
    layerOver.appendChild(g);
    phaseOverlays.push(g);
    return g;
  }

  /* ================================================================
   *  ANIMATION STEPS
   * ================================================================ */

  const INITIAL_NODES = ["root", "A", "B", "C", "A1", "A2", "B1"];
  const EXPANDED_NODES = ["B1a", "B1b", "B1c"];

  const STEPS = [
    // ── Step 0: Initial tree ──
    {
      narration: "A partial MCTS game tree. Each node tracks visit count N and mean value Q. B1 is an unexpanded leaf (N=0). One simulation consists of four phases: Select → Evaluate → Expand → Backup.",
      narClass: "",
      visibleNodes: INITIAL_NODES,
      nodeStyles: {},
      visibleEdges: ["root->A", "root->B", "root->C", "A->A1", "A->A2", "B->B1"],
      edgeStyles: {},
      showNN: false, showUCB: false, showDirichlet: false,
      setup(){ },
    },
    // ── Step 1: SELECT — highlight root ──
    {
      narration: "① SELECT — Starting from root, pick the child with the highest UCB score at each level. UCB = Q + c · P · √N / (1 + n). The sign of Q flips at each level because the child plays as the opponent.",
      narClass: "hl-select",
      visibleNodes: INITIAL_NODES,
      nodeStyles: { root: "select" },
      visibleEdges: ["root->A", "root->B", "root->C", "A->A1", "A->A2", "B->B1"],
      edgeStyles: {},
      showNN: false, showUCB: true, showDirichlet: true,
      setup() {
        addPhaseLabel("① SELECT", 850, 80, PC.select.text, "15");
      },
    },
    // ── Step 2: SELECT — root → B ──
    {
      narration: "① SELECT — At root, B is selected by UCB. Even with negative Q (B: -0.20), exploration can dominate because prior/visit terms are stronger at this point.",
      narClass: "hl-select",
      visibleNodes: INITIAL_NODES,
      nodeStyles: { root: "select", B: "select" },
      visibleEdges: ["root->A", "root->B", "root->C", "A->A1", "A->A2", "B->B1"],
      edgeStyles: { "root->B": "select" },
      showNN: false, showUCB: true, showDirichlet: true,
      setup() {
        addPhaseLabel("① SELECT", 850, 80, PC.select.text, "15");
        // Keep the teaching point without hard-coding pseudo-numeric UCB values.
        addNote(
          315,
          145,
          330,
          44,
          "B selected: highest UCB",
          "(exploration term dominates Q)",
          "#dbeafe",
          "#2563eb",
          "#1e40af"
        );
      },
    },
    // ── Step 3: SELECT — B → B1 (leaf) ──
    {
      narration: "① SELECT — At B: only child B1 (N=0, unexpanded leaf). B1 is selected. Selection ends at an unexpanded node.",
      narClass: "hl-select",
      visibleNodes: INITIAL_NODES,
      nodeStyles: { root: "select", B: "select", B1: "select" },
      visibleEdges: ["root->A", "root->B", "root->C", "A->A1", "A->A2", "B->B1"],
      edgeStyles: { "root->B": "select", "B->B1": "select" },
      showNN: false, showUCB: false, showDirichlet: false,
      setup() {
        addPhaseLabel("① SELECT", 850, 80, PC.select.text, "15");
        // show selection path
        addPhasePath([
          [TREE.root.x + 3, TREE.root.y + R + 2],
          [TREE.B.x + 1, TREE.B.y - R - 2],
        ], "#2563eb", "3.5");
        addPhasePath([
          [TREE.B.x, TREE.B.y + R + 2],
          [TREE.B1.x, TREE.B1.y - R - 2],
        ], "#2563eb", "3.5");
        addNote(545, 305, 115, 28, "leaf — N=0", null, "#dbeafe", "#2563eb", "#1e40af");
      },
    },
    // ── Step 4: EVALUATE — NN inference on leaf B1 ──
    {
      narration: "② EVALUATE — The leaf state at B1 is sent to neural network f_θ(s), returning policy logits and value v = 0.65. Dirichlet noise was applied at the root before selection, not at this leaf.",
      narClass: "hl-eval",
      visibleNodes: INITIAL_NODES,
      nodeStyles: { B1: "eval" },
      visibleEdges: ["root->A", "root->B", "root->C", "A->A1", "A->A2", "B->B1"],
      edgeStyles: {},
      showNN: true, showUCB: false, showDirichlet: false,
      setup() {
        addPhaseLabel("② EVALUATE", 850, 80, PC.eval.text, "15");
        // Arrow from B1 to NN
        addPhaseArrow(TREE.B1.x - R - 5, TREE.B1.y + 15, 265, 420, "#7c3aed", "2.5");
        // Returned value estimate
        addNote(290, 440, 70, 24, "v = 0.65", null, "#ede9fe", "#7c3aed", "#5b21b6");
      },
    },
    // ── Step 5: EXPAND — create children using evaluated policy priors ──
    {
      narration: "③ EXPAND — Using policy π from Evaluate, B1 creates child nodes for legal moves. Each new child is initialized with prior pᵢ from π.",
      narClass: "hl-expand",
      visibleNodes: [...INITIAL_NODES, ...EXPANDED_NODES],
      nodeStyles: { B1: "expand", B1a: "expand", B1b: "expand", B1c: "expand" },
      visibleEdges: ["root->A", "root->B", "root->C", "A->A1", "A->A2", "B->B1", "B1->B1a", "B1->B1b", "B1->B1c"],
      edgeStyles: { "B1->B1a": "expand", "B1->B1b": "expand", "B1->B1c": "expand" },
      showNN: false, showUCB: false, showDirichlet: false,
      setup() {
        addPhaseLabel("③ EXPAND", 850, 80, PC.expand.text, "15");
        addNote(
          320,
          508,
          320,
          44,
          "children initialized",
          "from policy priors π",
          "#dcfce7",
          "#16a34a",
          "#166534"
        );
      },
    },
    // ── Step 6: BACKUP — propagate value up ──
    {
      narration: "④ BACKUP — Value v = 0.65 propagates back along the selected path (B1 → B → Root). Sign flips at each level: B1 gets +v, B gets −v (opponent), Root gets +v. Visit counts are incremented.",
      narClass: "hl-backup",
      visibleNodes: [...INITIAL_NODES, ...EXPANDED_NODES],
      nodeStyles: { root: "backup", B: "backup", B1: "backup" },
      visibleEdges: ["root->A", "root->B", "root->C", "A->A1", "A->A2", "B->B1", "B1->B1a", "B1->B1b", "B1->B1c"],
      edgeStyles: { "root->B": "backup", "B->B1": "backup" },
      showNN: false, showUCB: false, showDirichlet: false,
      backupValues: { B1: "+0.65", B: "−0.65", root: "+0.65" },
      backupN: { B1: 1, B: 46, root: 101 },
      setup() {
        addPhaseLabel("④ BACKUP", 850, 80, PC.backup.text, "15");
        // Upward arrows
        addPhasePath([
          [TREE.B1.x - 5, TREE.B1.y - R - 2],
          [TREE.B.x - 5, TREE.B.y + R + 5],
        ], "#d97706", "3");
        addPhasePath([
          [TREE.B.x - 5, TREE.B.y - R - 2],
          [TREE.root.x - 5, TREE.root.y + R + 5],
        ], "#d97706", "3");

        // Value annotations
        addNote(TREE.B1.x + 54, TREE.B1.y - 17, 78, 30, "+v", null, "#fef3c7", "#d97706", "#92400e");
        addNote(TREE.B.x + 54, TREE.B.y - 17, 78, 30, "−v", null, "#fef3c7", "#d97706", "#92400e");
        addNote(TREE.root.x + 54, TREE.root.y - 17, 78, 30, "+v", null, "#fef3c7", "#d97706", "#92400e");

        // N update annotations
        addNote(TREE.B1.x - 200, TREE.B1.y + 3, 120, 30, "N: 0→1", null, "#fffbeb", "#fbbf24", "#92400e");
        addNote(TREE.B.x - 210, TREE.B.y + 3, 130, 30, "N: 45→46", null, "#fffbeb", "#fbbf24", "#92400e");
        addNote(TREE.root.x - 220, TREE.root.y + 3, 140, 30, "N: 100→101", null, "#fffbeb", "#fbbf24", "#92400e");
      },
    },
    // ── Step 7: Complete — ready for next simulation ──
    {
      narration: "Simulation complete! The tree has been updated: B1 is now expanded, visit counts and value sums are adjusted along the path. The next simulation will start from the root again using the updated statistics to guide selection.",
      narClass: "",
      visibleNodes: [...INITIAL_NODES, ...EXPANDED_NODES],
      nodeStyles: { root: "done", B: "done", B1: "done", B1a: "done", B1b: "done", B1c: "done" },
      visibleEdges: ["root->A", "root->B", "root->C", "A->A1", "A->A2", "B->B1", "B1->B1a", "B1->B1b", "B1->B1c"],
      edgeStyles: {},
      showNN: false, showUCB: false, showDirichlet: false,
      updatedN: { root: 101, B: 46, B1: 1 },
      setup() {
        addNote(710, 580, 230, 55, "One simulation done.", "Repeat 100s–1000s of times.", "#f8fafc", "#64748b", "#334155");
      },
    },
  ];

  /* ================================================================
   *  APPLY STEP
   * ================================================================ */

  let currentStep = -1;

  function applyStep(idx) {
    const step = STEPS[idx];
    clearPhaseOverlays();

    // Narration
    const narEl = document.getElementById("narration");
    narEl.textContent = step.narration;
    narEl.className = "narration" + (step.narClass ? ` ${step.narClass}` : "");

    const visibleNodeSet = new Set(step.visibleNodes || []);
    const visibleEdgeSet = new Set(step.visibleEdges || []);
    const nodeStyles = step.nodeStyles || {};
    const edgeStyles = step.edgeStyles || {};

    // Nodes
    Object.entries(TREE).forEach(([id, n]) => {
      const el = nodeEls[id];
      const visible = visibleNodeSet.has(id);
      el.group.setAttribute("opacity", visible ? "1" : "0");
      if (!visible) return;

      const style = nodeStyles[id];
      let sc = PC.normal;
      if (style === "select")  sc = PC.select;
      else if (style === "expand")  sc = PC.expand;
      else if (style === "eval")    sc = PC.eval;
      else if (style === "backup")  sc = PC.backup;
      else if (style === "done")    sc = { fill: "#f0fdf4", stroke: "#16a34a", text: "#166534" };

      el.circle.setAttribute("fill", sc.fill);
      el.circle.setAttribute("stroke", sc.stroke);
      el.circle.setAttribute("stroke-width", style ? "3" : "2");
      el.labelT.setAttribute("fill", sc.text);

      // Update info text
      if (step.backupN && step.backupN[id] !== undefined) {
        el.infoT.textContent = `N=${step.backupN[id]}`;
        el.infoT.setAttribute("fill", "#d97706");
        el.infoT.setAttribute("font-weight", "700");
      } else if (step.updatedN && step.updatedN[id] !== undefined) {
        el.infoT.textContent = `N=${step.updatedN[id]}`;
        el.infoT.setAttribute("fill", "#16a34a");
        el.infoT.setAttribute("font-weight", "700");
      } else if (n.expanded) {
        el.infoT.textContent = n.prior;
        el.infoT.setAttribute("fill", "#16a34a");
        el.infoT.setAttribute("font-weight", "600");
      } else {
        el.infoT.textContent = `N=${n.N}`;
        el.infoT.setAttribute("fill", "#64748b");
        el.infoT.setAttribute("font-weight", "400");
      }
    });

    // Edges
    Object.entries(edgeEls).forEach(([key, line]) => {
      const visible = visibleEdgeSet.has(key);
      line.setAttribute("opacity", visible ? "1" : "0");

      const style = edgeStyles[key];
      if (style === "select") {
        line.setAttribute("stroke", PC.select.stroke);
        line.setAttribute("stroke-width", "3");
      } else if (style === "expand") {
        line.setAttribute("stroke", PC.expand.stroke);
        line.setAttribute("stroke-width", "2.5");
      } else if (style === "backup") {
        line.setAttribute("stroke", PC.backup.stroke);
        line.setAttribute("stroke-width", "3");
      } else {
        line.setAttribute("stroke", "#cbd5e1");
        line.setAttribute("stroke-width", "1.5");
      }
    });

    // NN box
    nnGroup.setAttribute("opacity", step.showNN ? "1" : "0");
    ucbGroup.setAttribute("opacity", step.showUCB ? "1" : "0");
    dirichletGroup.setAttribute("opacity", step.showDirichlet ? "1" : "0");

    // Step-specific setup
    if (step.setup) step.setup();
  }

  /* ================================================================
   *  CONTROLS
   * ================================================================ */

  const btnPrev  = document.getElementById("btn-prev");
  const btnNext  = document.getElementById("btn-next");
  const btnAuto  = document.getElementById("btn-auto");
  const btnReset = document.getElementById("btn-reset");
  const stepLabel = document.getElementById("step-label");
  let autoTimer = null;

  function updateControls() {
    stepLabel.textContent = `Step ${currentStep + 1} / ${STEPS.length}`;
    btnPrev.disabled = currentStep <= 0;
    btnNext.disabled = currentStep >= STEPS.length - 1;
  }

  function goTo(idx) {
    if (idx < 0 || idx >= STEPS.length) return;
    currentStep = idx;
    applyStep(idx);
    updateControls();
  }

  btnNext.addEventListener("click", () => goTo(currentStep + 1));
  btnPrev.addEventListener("click", () => goTo(currentStep - 1));
  btnReset.addEventListener("click", () => { stopAuto(); goTo(0); });

  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    btnAuto.textContent = "▶ Auto Play";
    btnAuto.classList.remove("playing");
  }

  btnAuto.addEventListener("click", () => {
    if (autoTimer) { stopAuto(); return; }
    if (currentStep >= STEPS.length - 1) goTo(0);
    btnAuto.textContent = "⏸ Pause";
    btnAuto.classList.add("playing");
    autoTimer = setInterval(() => {
      if (currentStep >= STEPS.length - 1) { stopAuto(); return; }
      goTo(currentStep + 1);
    }, 2500);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goTo(currentStep + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(currentStep - 1); }
  });

  goTo(0);
})();

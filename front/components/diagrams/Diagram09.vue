<template>
  <div ref="diagramRoot" class="diagram-wrapper">
    <div class="container">
        <h1>Alpha-Beta Pruning</h1>
        <div class="controls">
          <button id="btn-prev" disabled>◀ Prev</button>
          <span id="step-label">Step 0 / 0</span>
          <button id="btn-next">Next ▶</button>
          <button id="btn-auto">▶ Auto Play</button>
          <button id="btn-reset">↺ Reset</button>
        </div>
        <div id="narration" class="narration"></div>
        <svg id="tree" viewBox="0 0 960 620" xmlns="http://www.w3.org/2000/svg">
          <!-- Edges (drawn first, behind nodes) -->
          <g id="edges"></g>
          <!-- Nodes -->
          <g id="nodes"></g>
        </svg>
        <div class="legend">
          <span class="legend-item"><span class="swatch max-swatch"></span> MAX node</span>
          <span class="legend-item"><span class="swatch min-swatch"></span> MIN node</span>
          <span class="legend-item"><span class="swatch leaf-swatch"></span> Leaf value</span>
          <span class="legend-item"><span class="swatch pruned-swatch"></span> Pruned</span>
          <span class="legend-item"><span class="swatch active-swatch"></span> Active</span>
        </div>
      </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const diagramRoot = ref(null);
let cleanupKeydown = null;
let cleanupAutoplay = null;

onMounted(() => {
  if (!diagramRoot.value) return;

  const getById = (id) => diagramRoot.value.querySelector(id.startsWith('#') ? id : '#' + CSS.escape(id));

  const fakeDocument = {
    addEventListener: (evt, cb) => {
      document.addEventListener(evt, cb);
      cleanupKeydown = () => document.removeEventListener(evt, cb);
    }
  };

  (() => {
    "use strict";

    /* ================================================================
     *  TREE LAYOUT — positions, labels, styles
     * ================================================================ */

    const COLORS = {
      max:     { fill: "#dbeafe", stroke: "#2563eb" },
      min:     { fill: "#ede9fe", stroke: "#7c3aed" },
      leaf:    { fill: "#ffffff", stroke: "#334155"  },
      pruned:  { fill: "#f1f5f9", stroke: "#dc2626"  },
      active:  { fill: "#fef3c7", stroke: "#d97706"  },
      result:  { fill: "#bbf7d0", stroke: "#15803d"  },
      edge:    "#475569",
      edgePruned: "#dc2626",
    };

    // Node definitions (id, position, type, label lines, initial alpha/beta)
    const NODES = {
      root: { x: 480, y: 55,  type: "max",  label: "Root", tag: "MAX",  w: 130, h: 70 },
      A:    { x: 260, y: 190, type: "min",  label: "A",    tag: "MIN",  w: 130, h: 70 },
      B:    { x: 700, y: 190, type: "min",  label: "B",    tag: "MIN",  w: 130, h: 70 },
      A1:   { x: 140, y: 330, type: "max",  label: "A1",   tag: "MAX",  w: 120, h: 56 },
      A2:   { x: 380, y: 330, type: "max",  label: "A2",   tag: "MAX",  w: 120, h: 56 },
      B1:   { x: 590, y: 330, type: "max",  label: "B1",   tag: "MAX",  w: 120, h: 56 },
      B2:   { x: 810, y: 330, type: "max",  label: "B2",   tag: "MAX",  w: 120, h: 56 },
      // Leaves
      L_A1a: { x: 95,  y: 470, type: "leaf", label: "3", w: 44, h: 44, r: 22 },
      L_A1b: { x: 185, y: 470, type: "leaf", label: "5", w: 44, h: 44, r: 22 },
      L_A2a: { x: 335, y: 470, type: "leaf", label: "6", w: 44, h: 44, r: 22 },
      L_A2b: { x: 425, y: 470, type: "leaf", label: "9", w: 44, h: 44, r: 22 },
      L_B1a: { x: 545, y: 470, type: "leaf", label: "2", w: 44, h: 44, r: 22 },
      L_B1b: { x: 635, y: 470, type: "leaf", label: "4", w: 44, h: 44, r: 22 },
      L_B2a: { x: 765, y: 470, type: "leaf", label: "7", w: 44, h: 44, r: 22 },
      L_B2b: { x: 855, y: 470, type: "leaf", label: "1", w: 44, h: 44, r: 22 },
    };

    // Edges
    const EDGES = [
      { from: "root", to: "A"     },
      { from: "root", to: "B"     },
      { from: "A",    to: "A1"    },
      { from: "A",    to: "A2"    },
      { from: "B",    to: "B1"    },
      { from: "B",    to: "B2"    },
      { from: "A1",   to: "L_A1a" },
      { from: "A1",   to: "L_A1b" },
      { from: "A2",   to: "L_A2a" },
      { from: "A2",   to: "L_A2b" },
      { from: "B1",   to: "L_B1a" },
      { from: "B1",   to: "L_B1b" },
      { from: "B2",   to: "L_B2a" },
      { from: "B2",   to: "L_B2b" },
    ];

    /* ================================================================
     *  ANIMATION STEPS
     * ================================================================ */

    const STEPS = [
      {
        narration: "Initial state — complete game tree. Root is a MAX node with window α=−∞, β=+∞. We will search left-to-right, depth-first.",
        active: ["root"],
        windows: { root: { a: "−∞", b: "+∞" } },
      },
      {
        narration: "Descend to node A (MIN). It inherits α=−∞, β=+∞ from Root.",
        active: ["root", "A"],
        edgeHighlight: [["root", "A"]],
        windows: { root: { a: "−∞", b: "+∞" }, A: { a: "−∞", b: "+∞" } },
      },
      {
        narration: "Descend to node A1 (MAX). It inherits α=−∞, β=+∞.",
        active: ["A", "A1"],
        edgeHighlight: [["A", "A1"]],
        windows: { root: { a: "−∞", b: "+∞" }, A: { a: "−∞", b: "+∞" }, A1: { a: "−∞", b: "+∞" } },
      },
      {
        narration: "Evaluate leaf 3. A1 (MAX) updates α = max(−∞, 3) = 3.",
        active: ["A1", "L_A1a"],
        edgeHighlight: [["A1", "L_A1a"]],
        leafReveal: ["L_A1a"],
        windows: { root: { a: "−∞", b: "+∞" }, A: { a: "−∞", b: "+∞" }, A1: { a: "3", b: "+∞" } },
      },
      {
        narration: "Evaluate leaf 5. A1 (MAX) updates α = max(3, 5) = 5. A1 returns 5.",
        active: ["A1", "L_A1b"],
        edgeHighlight: [["A1", "L_A1b"]],
        leafReveal: ["L_A1a", "L_A1b"],
        windows: { root: { a: "−∞", b: "+∞" }, A: { a: "−∞", b: "+∞" }, A1: { a: "5", b: "+∞" } },
        returnValue: { A1: 5 },
      },
      {
        narration: "A1 returns 5 to A (MIN). A updates β = min(+∞, 5) = 5. Window at A is now [−∞, 5].",
        active: ["A"],
        edgeHighlight: [["A", "A1"]],
        leafReveal: ["L_A1a", "L_A1b"],
        windows: { root: { a: "−∞", b: "+∞" }, A: { a: "−∞", b: "5" }, A1: { a: "5", b: "+∞" } },
        returnValue: { A1: 5 },
        resultNode: ["A1"],
      },
      {
        narration: "Descend to A2 (MAX). It inherits α=−∞, β=5 from A.",
        active: ["A", "A2"],
        edgeHighlight: [["A", "A2"]],
        leafReveal: ["L_A1a", "L_A1b"],
        windows: { root: { a: "−∞", b: "+∞" }, A: { a: "−∞", b: "5" }, A1: { a: "5", b: "+∞" }, A2: { a: "−∞", b: "5" } },
        returnValue: { A1: 5 },
        resultNode: ["A1"],
      },
      {
        narration: "Evaluate leaf 6. A2 (MAX) updates α = max(−∞, 6) = 6. Now α(6) ≥ β(5) → CUTOFF! Leaf 9 is pruned.",
        active: ["A2", "L_A2a"],
        edgeHighlight: [["A2", "L_A2a"]],
        leafReveal: ["L_A1a", "L_A1b", "L_A2a"],
        windows: { root: { a: "−∞", b: "+∞" }, A: { a: "−∞", b: "5" }, A1: { a: "5", b: "+∞" }, A2: { a: "6", b: "5" } },
        returnValue: { A1: 5 },
        resultNode: ["A1"],
        pruned: ["L_A2b"],
        prunedEdges: [["A2", "L_A2b"]],
        cutoffAt: "A2",
      },
      {
        narration: "A2 returns 6 (cutoff). A (MIN) keeps β = min(5, 6) = 5. A returns 5 to Root.",
        active: ["A"],
        leafReveal: ["L_A1a", "L_A1b", "L_A2a"],
        windows: { root: { a: "−∞", b: "+∞" }, A: { a: "−∞", b: "5" }, A1: { a: "5", b: "+∞" }, A2: { a: "6", b: "5" } },
        returnValue: { A1: 5, A2: 6 },
        resultNode: ["A1", "A2"],
        pruned: ["L_A2b"],
        prunedEdges: [["A2", "L_A2b"]],
      },
      {
        narration: "A returns 5 to Root (MAX). Root updates α = max(−∞, 5) = 5. Window is now [5, +∞].",
        active: ["root"],
        edgeHighlight: [["root", "A"]],
        leafReveal: ["L_A1a", "L_A1b", "L_A2a"],
        windows: { root: { a: "5", b: "+∞" }, A: { a: "−∞", b: "5" }, A1: { a: "5", b: "+∞" }, A2: { a: "6", b: "5" } },
        returnValue: { A1: 5, A2: 6, A: 5 },
        resultNode: ["A1", "A2", "A"],
        pruned: ["L_A2b"],
        prunedEdges: [["A2", "L_A2b"]],
      },
      {
        narration: "Descend to node B (MIN). It inherits α=5, β=+∞ from Root.",
        active: ["root", "B"],
        edgeHighlight: [["root", "B"]],
        leafReveal: ["L_A1a", "L_A1b", "L_A2a"],
        windows: { root: { a: "5", b: "+∞" }, A: { a: "−∞", b: "5" }, A1: { a: "5", b: "+∞" }, A2: { a: "6", b: "5" }, B: { a: "5", b: "+∞" } },
        returnValue: { A1: 5, A2: 6, A: 5 },
        resultNode: ["A1", "A2", "A"],
        pruned: ["L_A2b"],
        prunedEdges: [["A2", "L_A2b"]],
      },
      {
        narration: "Descend to B1 (MAX). It inherits α=5, β=+∞.",
        active: ["B", "B1"],
        edgeHighlight: [["B", "B1"]],
        leafReveal: ["L_A1a", "L_A1b", "L_A2a"],
        windows: { root: { a: "5", b: "+∞" }, A: { a: "−∞", b: "5" }, A1: { a: "5", b: "+∞" }, A2: { a: "6", b: "5" }, B: { a: "5", b: "+∞" }, B1: { a: "5", b: "+∞" } },
        returnValue: { A1: 5, A2: 6, A: 5 },
        resultNode: ["A1", "A2", "A"],
        pruned: ["L_A2b"],
        prunedEdges: [["A2", "L_A2b"]],
      },
      {
        narration: "Evaluate leaf 2. B1 (MAX): α = max(5, 2) = 5. No change — 2 < current α.",
        active: ["B1", "L_B1a"],
        edgeHighlight: [["B1", "L_B1a"]],
        leafReveal: ["L_A1a", "L_A1b", "L_A2a", "L_B1a"],
        windows: { root: { a: "5", b: "+∞" }, A: { a: "−∞", b: "5" }, A1: { a: "5", b: "+∞" }, A2: { a: "6", b: "5" }, B: { a: "5", b: "+∞" }, B1: { a: "5", b: "+∞" } },
        returnValue: { A1: 5, A2: 6, A: 5 },
        resultNode: ["A1", "A2", "A"],
        pruned: ["L_A2b"],
        prunedEdges: [["A2", "L_A2b"]],
      },
      {
        narration: "Evaluate leaf 4. B1 (MAX): max(2, 4) = 4, still below α = 5. B1 returns 5 (alpha floor — no leaf beat the current bound).",
        active: ["B1", "L_B1b"],
        edgeHighlight: [["B1", "L_B1b"]],
        leafReveal: ["L_A1a", "L_A1b", "L_A2a", "L_B1a", "L_B1b"],
        windows: { root: { a: "5", b: "+∞" }, A: { a: "−∞", b: "5" }, A1: { a: "5", b: "+∞" }, A2: { a: "6", b: "5" }, B: { a: "5", b: "+∞" }, B1: { a: "5", b: "+∞" } },
        returnValue: { A1: 5, A2: 6, A: 5, B1: 5 },
        resultNode: ["A1", "A2", "A"],
        pruned: ["L_A2b"],
        prunedEdges: [["A2", "L_A2b"]],
      },
      {
        narration: "B1 returns 5 to B (MIN). B updates β = min(+∞, 5) = 5. Now α(5) ≥ β(5) → CUTOFF! Entire B2 subtree is pruned.",
        active: ["B"],
        edgeHighlight: [["B", "B1"]],
        leafReveal: ["L_A1a", "L_A1b", "L_A2a", "L_B1a", "L_B1b"],
        windows: { root: { a: "5", b: "+∞" }, A: { a: "−∞", b: "5" }, A1: { a: "5", b: "+∞" }, A2: { a: "6", b: "5" }, B: { a: "5", b: "5" }, B1: { a: "5", b: "+∞" } },
        returnValue: { A1: 5, A2: 6, A: 5, B1: 5 },
        resultNode: ["A1", "A2", "A", "B1"],
        pruned: ["L_A2b", "B2", "L_B2a", "L_B2b"],
        prunedEdges: [["A2", "L_A2b"], ["B", "B2"], ["B2", "L_B2a"], ["B2", "L_B2b"]],
        cutoffAt: "B",
      },
      {
        narration: "B returns 5. Root (MAX): α = max(5, 5) = 5. Both children return 5. Final result: 5.",
        active: ["root"],
        edgeHighlight: [["root", "B"]],
        leafReveal: ["L_A1a", "L_A1b", "L_A2a", "L_B1a", "L_B1b"],
        windows: { root: { a: "5", b: "+∞" }, A: { a: "−∞", b: "5" }, A1: { a: "5", b: "+∞" }, A2: { a: "6", b: "5" }, B: { a: "5", b: "5" }, B1: { a: "5", b: "+∞" } },
        returnValue: { A1: 5, A2: 6, A: 5, B1: 5, B: 5, root: 5 },
        resultNode: ["A1", "A2", "A", "B1", "B"],
        pruned: ["L_A2b", "B2", "L_B2a", "L_B2b"],
        prunedEdges: [["A2", "L_A2b"], ["B", "B2"], ["B2", "L_B2a"], ["B2", "L_B2b"]],
        finalResult: true,
      },
    ];

    /* ================================================================
     *  SVG RENDERING
     * ================================================================ */

    const svgNS = "http://www.w3.org/2000/svg";
    const edgesG = getById("edges");
    const nodesG = getById("nodes");

    // Store refs
    const nodeEls = {};   // id -> { group, rect/circle, text, windowText }
    const edgeEls = {};   // "from->to" -> line element

    function edgeKey(from, to) { return `${from}->${to}`; }

    // ── Draw edges ──
    EDGES.forEach(({ from, to }) => {
      const n1 = NODES[from];
      const n2 = NODES[to];
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", n1.x);
      line.setAttribute("y1", n1.y + (n1.h || 0) / 2);
      line.setAttribute("x2", n2.x);
      line.setAttribute("y2", n2.y - (n2.h || n2.r * 2 || 0) / 2);
      line.setAttribute("stroke", COLORS.edge);
      line.setAttribute("stroke-width", "1.8");
      line.setAttribute("opacity", "0.35");
      edgesG.appendChild(line);
      edgeEls[edgeKey(from, to)] = line;
    });

    // ── Draw nodes ──
    Object.entries(NODES).forEach(([id, n]) => {
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("opacity", "0.35");
      let shape;

      if (n.type === "leaf") {
        shape = document.createElementNS(svgNS, "circle");
        shape.setAttribute("cx", n.x);
        shape.setAttribute("cy", n.y);
        shape.setAttribute("r", n.r);
        shape.setAttribute("fill", COLORS.leaf.fill);
        shape.setAttribute("stroke", COLORS.leaf.stroke);
        shape.setAttribute("stroke-width", "2");
      } else {
        shape = document.createElementNS(svgNS, "rect");
        shape.setAttribute("x", n.x - n.w / 2);
        shape.setAttribute("y", n.y - n.h / 2);
        shape.setAttribute("width", n.w);
        shape.setAttribute("height", n.h);
        shape.setAttribute("rx", "8");
        shape.setAttribute("fill", COLORS[n.type].fill);
        shape.setAttribute("stroke", COLORS[n.type].stroke);
        shape.setAttribute("stroke-width", "2");
      }
      g.appendChild(shape);

      // Label
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", n.x);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-family", "Helvetica, Arial, sans-serif");
      text.setAttribute("fill", "#1e293b");

      if (n.type === "leaf") {
        text.setAttribute("y", n.y + 6);
        text.setAttribute("font-size", "18");
        text.setAttribute("font-weight", "800");
        text.textContent = n.label;
      } else {
        text.setAttribute("y", n.y - 12);
        text.setAttribute("font-size", "14");
        text.setAttribute("font-weight", "800");
        text.textContent = `${n.label} [${n.tag}]`;
      }
      g.appendChild(text);

      // α/β window text (non-leaf only)
      let windowText = null;
      if (n.type !== "leaf") {
        windowText = document.createElementNS(svgNS, "text");
        windowText.setAttribute("x", n.x);
        windowText.setAttribute("y", n.y + 7);
        windowText.setAttribute("text-anchor", "middle");
        windowText.setAttribute("font-family", "Helvetica, Arial, sans-serif");
        windowText.setAttribute("font-size", "12");
        windowText.setAttribute("fill", "#475569");
        windowText.textContent = "";
        g.appendChild(windowText);
      }

      // Return value text (below window)
      let retText = null;
      if (n.type !== "leaf") {
        retText = document.createElementNS(svgNS, "text");
        retText.setAttribute("x", n.x);
        retText.setAttribute("y", n.y + 22);
        retText.setAttribute("text-anchor", "middle");
        retText.setAttribute("font-family", "Helvetica, Arial, sans-serif");
        retText.setAttribute("font-size", "12");
        retText.setAttribute("font-weight", "700");
        retText.setAttribute("fill", "#15803d");
        retText.textContent = "";
        g.appendChild(retText);
      }

      nodesG.appendChild(g);
      nodeEls[id] = { group: g, shape, text, windowText, retText };
    });

    // ── Cutoff label helper ──
    function addCutoffLabel(nodeId) {
      const n = NODES[nodeId];
      const existing = getById(`cutoff-${nodeId}`);
      if (existing) return;
      const label = document.createElementNS(svgNS, "text");
      label.id = `cutoff-${nodeId}`;
      label.setAttribute("x", n.x + n.w / 2 + 8);
      label.setAttribute("y", n.y);
      label.setAttribute("font-family", "Helvetica, Arial, sans-serif");
      label.setAttribute("font-size", "12");
      label.setAttribute("font-weight", "800");
      label.setAttribute("fill", "#dc2626");
      label.textContent = "α ≥ β  CUTOFF!";
      nodesG.appendChild(label);
    }

    function removeCutoffLabels() {
      nodesG.querySelectorAll("[id^='cutoff-']").forEach(el => el.remove());
    }

    /* ================================================================
     *  STEP APPLICATION
     * ================================================================ */

    let currentStep = -1;

    function applyStep(idx) {
      const step = STEPS[idx];
      const activeSet = new Set(step.active || []);
      const leafRevealSet = new Set(step.leafReveal || []);
      const prunedSet = new Set(step.pruned || []);
      const prunedEdgeSet = new Set((step.prunedEdges || []).map(([a, b]) => edgeKey(a, b)));
      const edgeHLSet = new Set((step.edgeHighlight || []).map(([a, b]) => edgeKey(a, b)));
      const resultSet = new Set(step.resultNode || []);
      const windows = step.windows || {};
      const retVals = step.returnValue || {};

      // Update narration
      const narEl = getById("narration");
      narEl.textContent = step.narration;
      narEl.classList.toggle("highlight", !!step.cutoffAt || !!step.finalResult);

      // Update nodes
      Object.entries(NODES).forEach(([id, n]) => {
        const el = nodeEls[id];
        const isActive = activeSet.has(id);
        const isPruned = prunedSet.has(id);
        const isRevealed = leafRevealSet.has(id);
        const isResult = resultSet.has(id);
        const isFinal = step.finalResult && id === "root";

        // Opacity
        let opacity = "0.35";
        if (isActive || isRevealed || isPruned || isResult) opacity = "1";
        if (isPruned) opacity = "0.5";
        el.group.setAttribute("opacity", opacity);

        // Colors
        if (isPruned) {
          el.shape.setAttribute("fill", COLORS.pruned.fill);
          el.shape.setAttribute("stroke", COLORS.pruned.stroke);
          el.shape.setAttribute("stroke-dasharray", "6 3");
          if (el.text) el.text.setAttribute("fill", "#94a3b8");
        } else if (isFinal) {
          el.shape.setAttribute("fill", COLORS.result.fill);
          el.shape.setAttribute("stroke", COLORS.result.stroke);
          el.shape.setAttribute("stroke-dasharray", "");
          el.shape.setAttribute("stroke-width", "3");
        } else if (isActive) {
          el.shape.setAttribute("fill", COLORS.active.fill);
          el.shape.setAttribute("stroke", COLORS.active.stroke);
          el.shape.setAttribute("stroke-dasharray", "");
          el.shape.setAttribute("stroke-width", "2.5");
        } else if (isResult) {
          el.shape.setAttribute("fill", COLORS.result.fill);
          el.shape.setAttribute("stroke", COLORS.result.stroke);
          el.shape.setAttribute("stroke-dasharray", "");
          el.shape.setAttribute("stroke-width", "2");
        } else {
          el.shape.setAttribute("fill", COLORS[n.type]?.fill || COLORS.leaf.fill);
          el.shape.setAttribute("stroke", COLORS[n.type]?.stroke || COLORS.leaf.stroke);
          el.shape.setAttribute("stroke-dasharray", "");
          el.shape.setAttribute("stroke-width", "2");
          if (el.text) el.text.setAttribute("fill", "#1e293b");
        }

        // Window text
        if (el.windowText && windows[id]) {
          el.windowText.textContent = `α=${windows[id].a}  β=${windows[id].b}`;
        }

        // Return value
        if (el.retText) {
          if (retVals[id] !== undefined) {
            el.retText.textContent = `returns ${retVals[id]}`;
          } else {
            el.retText.textContent = "";
          }
        }
      });

      // Update edges
      Object.entries(edgeEls).forEach(([key, line]) => {
        if (prunedEdgeSet.has(key)) {
          line.setAttribute("stroke", COLORS.edgePruned);
          line.setAttribute("stroke-dasharray", "6 3");
          line.setAttribute("opacity", "0.6");
          line.setAttribute("stroke-width", "2");
        } else if (edgeHLSet.has(key)) {
          line.setAttribute("stroke", COLORS.active.stroke);
          line.setAttribute("stroke-dasharray", "");
          line.setAttribute("opacity", "1");
          line.setAttribute("stroke-width", "2.5");
        } else {
          line.setAttribute("stroke", COLORS.edge);
          line.setAttribute("stroke-dasharray", "");
          line.setAttribute("opacity", "0.35");
          line.setAttribute("stroke-width", "1.8");
        }
      });

      // Cutoff labels
      removeCutoffLabels();
      if (step.cutoffAt) addCutoffLabel(step.cutoffAt);

      // Final result
      if (step.finalResult) {
        const rootEl = nodeEls["root"];
        rootEl.retText.textContent = "Result: 5";
        rootEl.retText.setAttribute("font-size", "14");
      }
    }

    /* ================================================================
     *  CONTROLS
     * ================================================================ */

    const btnPrev  = getById("btn-prev");
    const btnNext  = getById("btn-next");
    const btnAuto  = getById("btn-auto");
    const btnReset = getById("btn-reset");
    const stepLabel = getById("step-label");

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
    cleanupAutoplay = stopAuto;

    btnAuto.addEventListener("click", () => {
      if (autoTimer) { stopAuto(); return; }
      if (currentStep >= STEPS.length - 1) goTo(0);
      btnAuto.textContent = "⏸ Pause";
      btnAuto.classList.add("playing");
      autoTimer = setInterval(() => {
        if (currentStep >= STEPS.length - 1) { stopAuto(); return; }
        goTo(currentStep + 1);
      }, 1800);
    });

    // keyboard
    fakeDocument.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goTo(currentStep + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(currentStep - 1); }
    });

    // Init
    goTo(0);
  })();

});

onBeforeUnmount(() => {
  if (cleanupAutoplay) cleanupAutoplay();
  if (cleanupKeydown) cleanupKeydown();
});
</script>

<style scoped>
/* ── Reset & Base ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.diagram-wrapper {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: #f8fafc;
  color: #1e293b;
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}

.container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 12px;
  color: #0f172a;
  letter-spacing: -0.3px;
}

/* ── Controls ── */
.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}

.controls button {
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border: 1.5px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s;
}
.controls button:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}
.controls button:disabled {
  opacity: 0.4;
  cursor: default;
}
.controls button.playing {
  background: #fef3c7;
  border-color: #d97706;
  color: #92400e;
}

#step-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  min-width: 80px;
  text-align: center;
}

/* ── Narration ── */
.narration {
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 14px;
  line-height: 1.5;
  color: #334155;
  min-height: 48px;
  margin-bottom: 12px;
  transition: background 0.3s;
}
.narration.highlight {
  background: #fefce8;
  border-color: #fbbf24;
}

/* ── SVG Canvas ── */
#tree {
  width: 100%;
  height: auto;
  display: block;
  background: transparent;
}

/* ── Legend ── */
.legend {
  display: flex;
  justify-content: center;
  gap: 18px;
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1.5px solid;
}
.max-swatch   { background: #dbeafe; border-color: #2563eb; }
.min-swatch   { background: #ede9fe; border-color: #7c3aed; }
.leaf-swatch  { background: #fff;    border-color: #334155; }
.pruned-swatch { background: #f1f5f9; border-color: #dc2626; border-style: dashed; }
.active-swatch { background: #fef3c7; border-color: #d97706; }

</style>

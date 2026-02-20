<template>
  <div ref="diagramRoot" class="diagram-wrapper">
    <div class="container">
    		<h1>Principal Variation Search (PVS)</h1>
    		<div class="controls">
    			<button id="btn-prev" disabled>◀ Prev</button>
    			<span id="step-label">Step 0 / 0</span>
    			<button id="btn-next">Next ▶</button>
    			<button id="btn-auto">▶ Auto Play</button>
    			<button id="btn-reset">↺ Reset</button>
    		</div>
    		<div id="narration" class="narration"></div>
    		<svg id="tree" viewBox="0 0 960 660" xmlns="http://www.w3.org/2000/svg">
    			<defs>
    				<marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
    					<path d="M0,0 L8,3 L0,6 Z" fill="#475569" />
    				</marker>
    				<marker id="arrow-blue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
    					<path d="M0,0 L8,3 L0,6 Z" fill="#2563eb" />
    				</marker>
    				<marker id="arrow-amber" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
    					<path d="M0,0 L8,3 L0,6 Z" fill="#d97706" />
    				</marker>
    				<marker id="arrow-red" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
    					<path d="M0,0 L8,3 L0,6 Z" fill="#dc2626" />
    				</marker>
    				<marker id="arrow-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
    					<path d="M0,0 L8,3 L0,6 Z" fill="#15803d" />
    				</marker>
    			</defs>
    			<g id="edges"></g>
    			<g id="nodes"></g>
    		</svg>
    		<div class="legend">
    			<span class="legend-item"><span class="swatch full-swatch"></span> Full-window search</span>
    			<span class="legend-item"><span class="swatch null-swatch"></span> Null-window search</span>
    			<span class="legend-item"><span class="swatch fail-swatch"></span> Fail-high (re-search)</span>
    			<span class="legend-item"><span class="swatch ok-swatch"></span> Confirmed / updated</span>
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
     *  COLORS
     * ================================================================ */
    const C = {
      full:    { fill: "#dbeafe", stroke: "#2563eb" },   // blue — full-window
      null_w:  { fill: "#fef3c7", stroke: "#d97706" },   // amber — null-window
      fail:    { fill: "#fecaca", stroke: "#dc2626" },   // red — fail-high
      ok:      { fill: "#bbf7d0", stroke: "#15803d" },   // green — confirmed
      dim:     { fill: "#f1f5f9", stroke: "#94a3b8" },   // grey — dimmed
      active:  { fill: "#fef3c7", stroke: "#d97706" },   // amber — active highlight
      root:    { fill: "#dbeafe", stroke: "#2563eb" },   // blue root
      edge:    "#475569",
    };

    // One knob for diagram text readability.
    const FONT_SCALE = 1.35;
    const fs = (px) => (px * FONT_SCALE).toFixed(1);

    /* ================================================================
     *  LAYOUT — PVS tree structure
     *
     *  Root (MAX) at top, three children below.
     *  Under each child: a vertical flow of steps.
     * ================================================================ */

    // Column centers
    const COL1 = 180, COL2 = 480, COL3 = 780;
    const ROOT_Y = 50;
    const CHILD_Y = 150;
    const ROW_GAP = 72;

    const NODES = {
      root: {
        x: 480, y: ROOT_Y, w: 180, h: 64,
        label: "Root [MAX]", sub: "α = −∞   β = +∞",
      },

      // ── Child 1 column ──
      c1_label: {
        x: COL1, y: CHILD_Y, w: 160, h: 30,
        label: "Child 1", isLabel: true, col: "blue",
      },
      c1_search: {
        x: COL1, y: CHILD_Y + 50, w: 170, h: 48,
        label: "Full-window search", sub: "[α, β] = [−∞, +∞]",
      },
      c1_result: {
        x: COL1, y: CHILD_Y + 50 + ROW_GAP, w: 170, h: 44,
        label: "Returns score = 34",
      },
      c1_update: {
        x: COL1, y: CHILD_Y + 50 + ROW_GAP * 2, w: 170, h: 48,
        label: "Root updates α = 34", sub: "(PV assumed found)",
      },

      // ── Child 2 column ──
      c2_label: {
        x: COL2, y: CHILD_Y, w: 160, h: 30,
        label: "Child 2", isLabel: true, col: "amber",
      },
      c2_search: {
        x: COL2, y: CHILD_Y + 50, w: 170, h: 48,
        label: "Null-window search", sub: "[α, β] = [35, 35]",
      },
      c2_result: {
        x: COL2, y: CHILD_Y + 50 + ROW_GAP, w: 170, h: 48,
        label: "Returns score ≤ 34", sub: "(fail-low)",
      },
      c2_confirm: {
        x: COL2, y: CHILD_Y + 50 + ROW_GAP * 2, w: 170, h: 48,
        label: "✓ Child 1 confirmed", sub: "No re-search needed",
      },

      // ── Child 3 column ──
      c3_label: {
        x: COL3, y: CHILD_Y, w: 160, h: 30,
        label: "Child 3", isLabel: true, col: "amber",
      },
      c3_search: {
        x: COL3, y: CHILD_Y + 50, w: 170, h: 48,
        label: "Null-window search", sub: "[α, β] = [35, 35]",
      },
      c3_result: {
        x: COL3, y: CHILD_Y + 50 + ROW_GAP, w: 170, h: 52,
        label: "Returns score ≥ 35", sub: "(fail-high!)",
      },
      c3_trigger: {
        x: COL3, y: CHILD_Y + 50 + ROW_GAP * 2, w: 180, h: 52,
        label: "PV assumption wrong!", sub: "Child 3 better than expected",
      },
      c3_research: {
        x: COL3, y: CHILD_Y + 50 + ROW_GAP * 3, w: 180, h: 48,
        label: "Re-search full window", sub: "[α, β] = [34, +∞]",
      },
      c3_exact: {
        x: COL3, y: CHILD_Y + 50 + ROW_GAP * 3 + ROW_GAP, w: 180, h: 44,
        label: "Returns exact score = 42",
      },
      c3_update: {
        x: COL3, y: CHILD_Y + 50 + ROW_GAP * 3 + ROW_GAP * 2, w: 180, h: 48,
        label: "Root updates α = 42", sub: "Child 3 is best!",
      },
    };

    // Vertical flow edges within each column
    const EDGES = [
      // root -> column labels
      { from: "root", to: "c1_label" },
      { from: "root", to: "c2_label" },
      { from: "root", to: "c3_label" },
      // child 1 flow
      { from: "c1_label",  to: "c1_search" },
      { from: "c1_search", to: "c1_result" },
      { from: "c1_result", to: "c1_update" },
      // child 2 flow
      { from: "c2_label",   to: "c2_search" },
      { from: "c2_search",  to: "c2_result" },
      { from: "c2_result",  to: "c2_confirm" },
      // child 3 flow
      { from: "c3_label",    to: "c3_search" },
      { from: "c3_search",   to: "c3_result" },
      { from: "c3_result",   to: "c3_trigger" },
      { from: "c3_trigger",  to: "c3_research" },
      { from: "c3_research", to: "c3_exact" },
      { from: "c3_exact",    to: "c3_update" },
    ];

    /* ================================================================
     *  STEP DEFINITIONS
     * ================================================================ */

    // Each step: visible nodes, their style, active nodes, narration, rootInfo
    const STEPS = [
      {
        narration: "Root is a MAX node with initial window α = −∞, β = +∞. PVS will search three children in order, using null-window searches after the first child.",
        visible: ["root"],
        styles: { root: "root" },
        active: ["root"],
        rootSub: "α = −∞   β = +∞",
      },
      {
        narration: "Step 1: Search Child 1 with a full-window [−∞, +∞]. This is always a full search for the first child — we need a baseline PV score.",
        visible: ["root", "c1_label", "c1_search"],
        styles: { root: "root", c1_label: "blue_label", c1_search: "full" },
        active: ["c1_search"],
        rootSub: "α = −∞   β = +∞",
        edgeStyles: { "root->c1_label": "blue", "c1_label->c1_search": "blue" },
      },
      {
        narration: "Child 1 returns score = 34. This becomes our provisional best score.",
        visible: ["root", "c1_label", "c1_search", "c1_result"],
        styles: { root: "root", c1_label: "blue_label", c1_search: "full", c1_result: "full" },
        active: ["c1_result"],
        rootSub: "α = −∞   β = +∞",
        edgeStyles: { "root->c1_label": "blue", "c1_label->c1_search": "blue", "c1_search->c1_result": "blue" },
      },
      {
        narration: "Root updates α = 34. We now assume the principal variation (PV) has been found. All subsequent children will be tested with cheap null-window searches.",
        visible: ["root", "c1_label", "c1_search", "c1_result", "c1_update"],
        styles: { root: "root", c1_label: "blue_label", c1_search: "full", c1_result: "full", c1_update: "ok" },
        active: ["c1_update", "root"],
        rootSub: "α = 34   β = +∞",
        edgeStyles: { "root->c1_label": "blue", "c1_label->c1_search": "blue", "c1_search->c1_result": "blue", "c1_result->c1_update": "green" },
      },
      {
        narration: "Step 2: Search Child 2 with a zero-width null-window [35, 35]. Any score < 35 is fail-low; any score >= 35 is fail-high. This is much cheaper than full-window search because the tight window causes aggressive cutoffs.",
        visible: ["root", "c1_label", "c1_search", "c1_result", "c1_update", "c2_label", "c2_search"],
        styles: { root: "root", c1_label: "blue_label", c1_search: "dim", c1_result: "dim", c1_update: "ok", c2_label: "amber_label", c2_search: "null_w" },
        active: ["c2_search"],
        rootSub: "α = 34   β = +∞",
        edgeStyles: { "root->c2_label": "amber", "c2_label->c2_search": "amber" },
      },
      {
        narration: "Child 2 returns score ≤ 34 (fail-low). This means Child 2 is NOT better than Child 1. No re-search needed — the null-window verification was cheap and conclusive.",
        visible: ["root", "c1_label", "c1_search", "c1_result", "c1_update", "c2_label", "c2_search", "c2_result"],
        styles: { root: "root", c1_label: "blue_label", c1_search: "dim", c1_result: "dim", c1_update: "ok", c2_label: "amber_label", c2_search: "null_w", c2_result: "null_w" },
        active: ["c2_result"],
        rootSub: "α = 34   β = +∞",
        edgeStyles: { "root->c2_label": "amber", "c2_label->c2_search": "amber", "c2_search->c2_result": "amber" },
      },
      {
        narration: "✓ Child 1 is confirmed as best so far. α stays at 34. The null-window search saved significant computation.",
        visible: ["root", "c1_label", "c1_search", "c1_result", "c1_update", "c2_label", "c2_search", "c2_result", "c2_confirm"],
        styles: { root: "root", c1_label: "blue_label", c1_search: "dim", c1_result: "dim", c1_update: "ok", c2_label: "amber_label", c2_search: "dim", c2_result: "dim", c2_confirm: "ok" },
        active: ["c2_confirm"],
        rootSub: "α = 34   β = +∞",
        edgeStyles: { "c2_result->c2_confirm": "green" },
      },
      {
        narration: "Step 3: Search Child 3 with the same zero-width null-window [35, 35] to verify whether it can beat α = 34.",
        visible: ["root", "c1_label", "c1_search", "c1_result", "c1_update", "c2_label", "c2_search", "c2_result", "c2_confirm", "c3_label", "c3_search"],
        styles: { root: "root", c1_label: "blue_label", c1_search: "dim", c1_result: "dim", c1_update: "ok", c2_label: "amber_label", c2_search: "dim", c2_result: "dim", c2_confirm: "ok", c3_label: "amber_label", c3_search: "null_w" },
        active: ["c3_search"],
        rootSub: "α = 34   β = +∞",
        edgeStyles: { "root->c3_label": "amber", "c3_label->c3_search": "amber" },
      },
      {
        narration: "⚠ Child 3 returns score >= 35 — FAIL-HIGH! Under [35, 35], this means Child 3 beat α = 34. The null-window probe detected our PV assumption was wrong.",
        visible: ["root", "c1_label", "c1_search", "c1_result", "c1_update", "c2_label", "c2_search", "c2_result", "c2_confirm", "c3_label", "c3_search", "c3_result"],
        styles: { root: "root", c1_label: "blue_label", c1_search: "dim", c1_result: "dim", c1_update: "ok", c2_label: "amber_label", c2_search: "dim", c2_result: "dim", c2_confirm: "ok", c3_label: "amber_label", c3_search: "null_w", c3_result: "fail" },
        active: ["c3_result"],
        rootSub: "α = 34   β = +∞",
        narrationClass: "highlight-red",
        edgeStyles: { "root->c3_label": "amber", "c3_label->c3_search": "amber", "c3_search->c3_result": "red" },
      },
      {
        narration: "The PV assumption was wrong! Child 3 is better than expected. We must now re-search with a full window to get the exact score.",
        visible: ["root", "c1_label", "c1_search", "c1_result", "c1_update", "c2_label", "c2_search", "c2_result", "c2_confirm", "c3_label", "c3_search", "c3_result", "c3_trigger"],
        styles: { root: "root", c1_label: "blue_label", c1_search: "dim", c1_result: "dim", c1_update: "ok", c2_label: "amber_label", c2_search: "dim", c2_result: "dim", c2_confirm: "ok", c3_label: "amber_label", c3_search: "null_w", c3_result: "fail", c3_trigger: "fail" },
        active: ["c3_trigger"],
        rootSub: "α = 34   β = +∞",
        narrationClass: "highlight-red",
        edgeStyles: { "c3_search->c3_result": "red", "c3_result->c3_trigger": "red" },
      },
      {
        narration: "Re-search Child 3 with full window [34, +∞]. This costs more, but it only happens when move ordering was wrong — a rare case with good ordering.",
        visible: ["root", "c1_label", "c1_search", "c1_result", "c1_update", "c2_label", "c2_search", "c2_result", "c2_confirm", "c3_label", "c3_search", "c3_result", "c3_trigger", "c3_research"],
        styles: { root: "root", c1_label: "blue_label", c1_search: "dim", c1_result: "dim", c1_update: "ok", c2_label: "amber_label", c2_search: "dim", c2_result: "dim", c2_confirm: "ok", c3_label: "amber_label", c3_search: "dim", c3_result: "dim", c3_trigger: "dim", c3_research: "full" },
        active: ["c3_research"],
        rootSub: "α = 34   β = +∞",
        edgeStyles: { "c3_trigger->c3_research": "blue" },
      },
      {
        narration: "The full re-search returns exact score = 42. Child 3 is indeed better!",
        visible: ["root", "c1_label", "c1_search", "c1_result", "c1_update", "c2_label", "c2_search", "c2_result", "c2_confirm", "c3_label", "c3_search", "c3_result", "c3_trigger", "c3_research", "c3_exact"],
        styles: { root: "root", c1_label: "blue_label", c1_search: "dim", c1_result: "dim", c1_update: "ok", c2_label: "amber_label", c2_search: "dim", c2_result: "dim", c2_confirm: "ok", c3_label: "amber_label", c3_search: "dim", c3_result: "dim", c3_trigger: "dim", c3_research: "full", c3_exact: "full" },
        active: ["c3_exact"],
        rootSub: "α = 34   β = +∞",
        edgeStyles: { "c3_trigger->c3_research": "blue", "c3_research->c3_exact": "blue" },
      },
      {
        narration: "Root updates α = 42. Child 3 is the new best move. Final result: 42.",
        visible: ["root", "c1_label", "c1_search", "c1_result", "c1_update", "c2_label", "c2_search", "c2_result", "c2_confirm", "c3_label", "c3_search", "c3_result", "c3_trigger", "c3_research", "c3_exact", "c3_update"],
        styles: { root: "result", c1_label: "blue_label", c1_search: "dim", c1_result: "dim", c1_update: "dim", c2_label: "amber_label", c2_search: "dim", c2_result: "dim", c2_confirm: "dim", c3_label: "amber_label", c3_search: "dim", c3_result: "dim", c3_trigger: "dim", c3_research: "dim", c3_exact: "dim", c3_update: "ok_bold" },
        active: ["c3_update", "root"],
        rootSub: "α = 42   β = +∞",
        rootLabel: "Root [MAX] — Result: 42",
        narrationClass: "highlight-green",
        edgeStyles: { "c3_exact->c3_update": "green" },
        final: true,
      },
    ];

    /* ================================================================
     *  SVG HELPERS
     * ================================================================ */

    const svgNS = "http://www.w3.org/2000/svg";
    const edgesG = getById("edges");
    const nodesG = getById("nodes");

    const nodeEls = {};
    const edgeEls = {};

    function ek(f, t) { return `${f}->${t}`; }

    function getStyleColors(styleName) {
      switch (styleName) {
        case "full":        return C.full;
        case "null_w":      return C.null_w;
        case "fail":        return C.fail;
        case "ok":          return C.ok;
        case "ok_bold":     return { fill: "#bbf7d0", stroke: "#15803d" };
        case "dim":         return C.dim;
        case "active":      return C.active;
        case "root":        return C.root;
        case "result":      return { fill: "#bbf7d0", stroke: "#15803d" };
        case "blue_label":  return { fill: "#eff6ff", stroke: "#2563eb" };
        case "amber_label": return { fill: "#fffbeb", stroke: "#d97706" };
        default:            return C.dim;
      }
    }

    function getEdgeColor(style) {
      switch (style) {
        case "blue":  return "#2563eb";
        case "amber": return "#d97706";
        case "red":   return "#dc2626";
        case "green": return "#15803d";
        default:      return "#475569";
      }
    }

    // ── Draw edges ──
    EDGES.forEach(({ from, to }) => {
      const n1 = NODES[from], n2 = NODES[to];
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", n1.x);
      line.setAttribute("y1", n1.y + (n1.h / 2));
      line.setAttribute("x2", n2.x);
      line.setAttribute("y2", n2.y - (n2.h / 2));
      line.setAttribute("stroke", C.edge);
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("opacity", "0");
      edgesG.appendChild(line);
      edgeEls[ek(from, to)] = line;
    });

    // ── Draw nodes ──
    Object.entries(NODES).forEach(([id, n]) => {
      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("opacity", "0");

      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", n.x - n.w / 2);
      rect.setAttribute("y", n.y - n.h / 2);
      rect.setAttribute("width", n.w);
      rect.setAttribute("height", n.h);
      rect.setAttribute("rx", n.isLabel ? "14" : "8");
      rect.setAttribute("fill", "#ffffff");
      rect.setAttribute("stroke", "#94a3b8");
      rect.setAttribute("stroke-width", "2");
      g.appendChild(rect);

      // Main label
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", n.x);
      text.setAttribute("y", n.sub ? n.y - 4 : n.y + 4);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-family", "Helvetica, Arial, sans-serif");
      text.setAttribute("font-size", fs(n.isLabel ? 12 : 11));
      text.setAttribute("font-weight", "700");
      text.setAttribute("fill", "#1e293b");
      text.textContent = n.label;
      g.appendChild(text);

      // Sub label
      let subText = null;
      if (n.sub) {
        subText = document.createElementNS(svgNS, "text");
        subText.setAttribute("x", n.x);
        subText.setAttribute("y", n.y + 12);
        subText.setAttribute("text-anchor", "middle");
        subText.setAttribute("font-family", "Helvetica, Arial, sans-serif");
        subText.setAttribute("font-size", fs(9.5));
        subText.setAttribute("fill", "#475569");
        subText.textContent = n.sub;
        g.appendChild(subText);
      }

      nodesG.appendChild(g);
      nodeEls[id] = { group: g, rect, text, subText };
    });

    /* ================================================================
     *  STEP APPLICATION
     * ================================================================ */

    let currentStep = -1;

    function applyStep(idx) {
      const step = STEPS[idx];
      const visibleSet = new Set(step.visible || []);
      const activeSet = new Set(step.active || []);
      const styles = step.styles || {};
      const edgeStylesMap = step.edgeStyles || {};

      // Narration
      const narEl = getById("narration");
      narEl.textContent = step.narration;
      narEl.className = "narration" + (step.narrationClass ? ` ${step.narrationClass}` : "");

      // Update root label/sub
      const rootEl = nodeEls["root"];
      if (step.rootLabel) rootEl.text.textContent = step.rootLabel;
      else rootEl.text.textContent = "Root [MAX]";
      if (step.rootSub && rootEl.subText) rootEl.subText.textContent = step.rootSub;

      // Nodes
      Object.entries(NODES).forEach(([id, n]) => {
        const el = nodeEls[id];
        const visible = visibleSet.has(id);
        const isActive = activeSet.has(id);
        const styleName = styles[id] || "dim";
        const sc = getStyleColors(styleName);

        // visibility
        el.group.setAttribute("opacity", visible ? "1" : "0");

        if (!visible) return;

        // colours
        el.rect.setAttribute("fill", sc.fill);
        el.rect.setAttribute("stroke", sc.stroke);
        el.rect.setAttribute("stroke-width", (isActive || styleName === "ok_bold" || styleName === "result") ? "3" : "2");
        el.rect.setAttribute("stroke-dasharray", styleName === "dim" ? "4 2" : "");

        // text color
        const textColor = styleName === "dim" ? "#94a3b8" : "#1e293b";
        el.text.setAttribute("fill", textColor);
        if (el.subText) el.subText.setAttribute("fill", styleName === "dim" ? "#94a3b8" : "#475569");
      });

      // Edges
      Object.entries(edgeEls).forEach(([key, line]) => {
        const [fromId, toId] = key.split("->");
        const bothVisible = visibleSet.has(fromId) && visibleSet.has(toId);

        if (!bothVisible) {
          line.setAttribute("opacity", "0");
          return;
        }

        const eStyle = edgeStylesMap[key];
        if (eStyle) {
          line.setAttribute("stroke", getEdgeColor(eStyle));
          line.setAttribute("stroke-width", "2.5");
          line.setAttribute("opacity", "1");
          line.setAttribute("stroke-dasharray", "");
        } else {
          line.setAttribute("stroke", "#cbd5e1");
          line.setAttribute("stroke-width", "1.5");
          line.setAttribute("opacity", "0.4");
          line.setAttribute("stroke-dasharray", "");
        }
      });

      // Key insight note on final steps
      drawInsight(step);
    }

    // ── Insight note ──
    let insightEl = null;
    function drawInsight(step) {
      if (insightEl) { insightEl.remove(); insightEl = null; }
      if (!step.final) return;

      const g = document.createElementNS(svgNS, "g");

      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", 30);
      rect.setAttribute("y", 530);
      rect.setAttribute("width", 290);
      rect.setAttribute("height", 92);
      rect.setAttribute("rx", "6");
      rect.setAttribute("fill", "#f8fafc");
      rect.setAttribute("stroke", "#64748b");
      rect.setAttribute("stroke-width", "1.5");
      g.appendChild(rect);

      const lines = [
        { text: "Key Insight", y: 550, size: "12", weight: "700" },
        { text: "─────────", y: 563, size: "9", weight: "400" },
        { text: "Null-window [35, 35] is zero-width.", y: 578, size: "10", weight: "400" },
        { text: "Much cheaper via aggressive cutoffs.", y: 593, size: "10", weight: "400" },
        { text: "Re-search only when move ordering was wrong.", y: 606, size: "10", weight: "400" },
      ];
      lines.forEach(l => {
        const t = document.createElementNS(svgNS, "text");
        t.setAttribute("x", 175);
        t.setAttribute("y", l.y);
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("font-family", "Helvetica, Arial, sans-serif");
        t.setAttribute("font-size", fs(Number(l.size)));
        t.setAttribute("font-weight", l.weight);
        t.setAttribute("fill", "#334155");
        t.textContent = l.text;
        g.appendChild(t);
      });

      nodesG.appendChild(g);
      insightEl = g;
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
      }, 2200);
    });

    fakeDocument.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goTo(currentStep + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(currentStep - 1); }
    });

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
  gap: 12px;
  margin-bottom: 12px;
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
  min-height: 46px;
  margin-bottom: 12px;
  transition: background 0.3s, border-color 0.3s;
}
.narration.highlight-red {
  background: #fef2f2;
  border-color: #fca5a5;
}
.narration.highlight-green {
  background: #f0fdf4;
  border-color: #86efac;
}

/* ── SVG Canvas ── */
#tree {
  width: 100%;
  height: auto;
  display: block;
  background: transparent;
}

/* Increase text inside node boxes (title + subline) */
#nodes g > text:first-of-type {
  font-weight: 700;
}

#nodes g > text:nth-of-type(2) {
  font-weight: 500;
}

/* ── Legend ── */
.legend {
  display: flex;
  justify-content: center;
  gap: 18px;
  margin-top: 10px;
  font-size: 14px;
  color: #64748b;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.swatch {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid;
}
.full-swatch   { background: #dbeafe; border-color: #2563eb; }
.null-swatch   { background: #fef3c7; border-color: #d97706; }
.fail-swatch   { background: #fecaca; border-color: #dc2626; }
.ok-swatch     { background: #bbf7d0; border-color: #15803d; }
.active-swatch { background: #fef3c7; border-color: #d97706; }

</style>

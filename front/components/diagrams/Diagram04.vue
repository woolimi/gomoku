<template>
  <div ref="diagramRoot" class="diagram-wrapper">
    <div class="container">
    		<h1>Pipelined Async MCTS &nbsp;—&nbsp; CPU / GPU Swim Lanes</h1>
    		<div id="subtitle" class="subtitle"></div>
    		<div class="controls">
    			<button id="btn-prev" disabled>◀ Prev</button>
    			<span id="step-label">Step 0 / 0</span>
    			<button id="btn-next">Next ▶</button>
    			<button id="btn-auto">▶ Auto Play</button>
    			<button id="btn-reset">↺ Reset</button>
    		</div>
    		<svg id="timeline" viewBox="0 0 1000 420" xmlns="http://www.w3.org/2000/svg">
    			<defs>
    				<marker id="arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
    					<path d="M0,0 L8,3 L0,6 Z" fill="#94a3b8" />
    				</marker>
    				<marker id="arr-disp" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
    					<path d="M0,0 L8,3 L0,6 Z" fill="#7c3aed" />
    				</marker>
    				<marker id="arr-drain" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
    					<path d="M0,0 L8,3 L0,6 Z" fill="#16a34a" />
    				</marker>
    			</defs>
    		</svg>
    		<div id="footer" class="footer"></div>
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

    const svgNS = "http://www.w3.org/2000/svg";
    const svg   = getById("timeline");

    /* ================================================================
     *  PALETTE  (light theme)
     * ================================================================ */
    const C = {
      sel:    { f: "#dbeafe", s: "#2563eb", t: "#1e40af" },
      disp:   { f: "#c4b5fd", s: "#7c3aed", t: "#ffffff" },
      drain:  { f: "#a7f3d0", s: "#059669", t: "#065f46" },
      gpu:    { f: "#fed7aa", s: "#ea580c", t: "#9a3412" },
      block:  { f: "#e2e8f0", s: "#94a3b8", t: "#475569" },
      waste:  { f: "#fecaca", s: "#dc2626", t: "#991b1b" },
      dim:    { f: "#f1f5f9", s: "#cbd5e1", t: "#94a3b8" },
      lane:   { f: "#f1f5f9", s: "#e2e8f0" },
      gpu_ln: { f: "#fefce8", s: "#fde68a" },
      drain_ln:{ f: "#ecfdf5", s: "#a7f3d0" },
    };

    /* ================================================================
     *  LAYOUT
     * ================================================================ */
    const LL     = 95;
    const TL     = 110;
    const TR     = 960;
    const U      = 64;
    const LH     = 46;
    const CPU_Y  = 70;
    const DRN_Y  = 160;
    const SEP_Y  = 210;
    const GPU_Y  = 260;
    const TAX_Y  = 330;
    const NOTE_Y = 360;

    /* ================================================================
     *  SVG HELPERS
     * ================================================================ */
    function mkRect(p, x, y, w, h, rx, fill, stroke, sw) {
      const r = document.createElementNS(svgNS, "rect");
      r.setAttribute("x", x); r.setAttribute("y", y);
      r.setAttribute("width", Math.max(w, 0)); r.setAttribute("height", h);
      r.setAttribute("rx", rx || "4"); r.setAttribute("fill", fill);
      r.setAttribute("stroke", stroke); r.setAttribute("stroke-width", sw || "1.5");
      p.appendChild(r); return r;
    }
    function mkText(p, x, y, txt, sz, wt, fill, anc) {
      const t = document.createElementNS(svgNS, "text");
      const baseSize = parseFloat(sz || "10");
      t.setAttribute("x", x); t.setAttribute("y", y);
      t.setAttribute("text-anchor", anc || "middle");
      t.setAttribute("font-family", "Helvetica, Arial, sans-serif");
      t.setAttribute("font-size", (baseSize * 1.25).toFixed(1));
      t.setAttribute("font-weight", wt || "400");
      t.setAttribute("fill", fill || "#1e293b"); t.textContent = txt;
      p.appendChild(t); return t;
    }
    function mkLine(p, x1, y1, x2, y2, col, w, dash) {
      const l = document.createElementNS(svgNS, "line");
      l.setAttribute("x1", x1); l.setAttribute("y1", y1);
      l.setAttribute("x2", x2); l.setAttribute("y2", y2);
      l.setAttribute("stroke", col || "#cbd5e1"); l.setAttribute("stroke-width", w || "1");
      if (dash) l.setAttribute("stroke-dasharray", dash);
      p.appendChild(l); return l;
    }
    function mkArrow(p, x1, y1, x2, y2, col, w) {
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", `M${x1},${y1} L${x2},${y2}`);
      path.setAttribute("stroke", col); path.setAttribute("stroke-width", w || "1.5");
      path.setAttribute("fill", "none");
      path.setAttribute("marker-end",
        col === "#7c3aed" ? "url(#arr-disp)" :
        col === "#16a34a" ? "url(#arr-drain)" : "url(#arr)");
      p.appendChild(path); return path;
    }
    function bx(t) { return TL + t * U; }
    function bw(d) { return d * U; }

    /* ================================================================
     *  STATIC backgrounds
     * ================================================================ */
    const staticG = document.createElementNS(svgNS, "g");
    svg.appendChild(staticG);

    mkRect(staticG, TL-4, CPU_Y-LH/2, TR-TL+8, LH, "4", C.lane.f, C.lane.s, "1");
    mkRect(staticG, TL-4, DRN_Y-LH/2, TR-TL+8, LH, "4", C.drain_ln.f, C.drain_ln.s, "1");
    mkRect(staticG, TL-4, GPU_Y-LH/2, TR-TL+8, LH, "4", C.gpu_ln.f, C.gpu_ln.s, "1");

    mkText(staticG, 50, CPU_Y-10, "CPU", "12", "800", "#2563eb");
    mkText(staticG, 50, CPU_Y+4,  "Select", "9", "600", "#64748b");
    mkText(staticG, 50, CPU_Y+15, "/ Dispatch", "9", "600", "#64748b");
    mkText(staticG, 50, DRN_Y-6, "CPU", "12", "800", "#059669");
    mkText(staticG, 50, DRN_Y+8, "Drain", "9", "600", "#64748b");
    mkText(staticG, 50, GPU_Y-6, "GPU", "12", "800", "#ea580c");
    mkText(staticG, 50, GPU_Y+8, "Infer", "9", "600", "#64748b");

    mkLine(staticG, TL-4, SEP_Y, TR+4, SEP_Y, "#94a3b8", "1", "6 4");
    mkText(staticG, (TL+TR)/2, SEP_Y+4, "— CPU above · GPU below —", "8", "400", "#94a3b8");

    mkLine(staticG, TL, TAX_Y, TR, TAX_Y, "#94a3b8", "1.5");
    mkText(staticG, TR+10, TAX_Y+4, "→", "11", "600", "#94a3b8");
    for (let i = 0; i <= 13; i += 2) {
      const x = bx(i); if (x > TR) break;
      mkLine(staticG, x, TAX_Y-4, x, TAX_Y+4, "#94a3b8", "1");
      mkText(staticG, x, TAX_Y+16, `T+${i}`, "8", "400", "#94a3b8");
    }

    /* ================================================================
     *  DYNAMIC
     * ================================================================ */
    const dynG = document.createElementNS(svgNS, "g");
    svg.appendChild(dynG);
    function clearDyn() { while (dynG.firstChild) dynG.removeChild(dynG.firstChild); }

    function drawBlock(g, x, y, w, h, pal, label, sub, active) {
      mkRect(g, x, y, w, h, "5", pal.f, pal.s, active ? "2.5" : "1.5");
      mkText(g, x+w/2, y+(sub ? h/2-3 : h/2+4), label, "10", "700", pal.t);
      if (sub) mkText(g, x+w/2, y+h/2+10, sub, "8", "400", pal.t);
    }
    function drawSmall(g, x, y, w, h, pal, label) {
      mkRect(g, x, y, w, h, "4", pal.f, pal.s, "1.5");
      mkText(g, x+w/2, y+h/2+4, label, "10", "800", pal.t);
    }
    function drawBracket(g, x1, x2, y, label, col) {
      mkLine(g, x1, y, x1, y-8, col, "1.5");
      mkLine(g, x2, y, x2, y-8, col, "1.5");
      mkLine(g, x1, y-8, x2, y-8, col, "1.5");
      mkText(g, (x1+x2)/2, y-14, label, "8.5", "600", col);
    }
    function drawNote(g, x, y, w, h, lines, bgCol, borderCol, textCol) {
      mkRect(g, x, y, w, h, "5", bgCol, borderCol, "1.5");
      lines.forEach((ln, i) => {
        mkText(g, x+w/2, y + 14 + i * 14, ln, "9", i === 0 ? "700" : "400", textCol);
      });
    }

    const pY = CPU_Y-LH/2+3, pH = LH-6;
    const dY = DRN_Y-LH/2+3;
    const gY = GPU_Y-LH/2+3;

    /* ================================================================
     *  8 STEPS
     * ================================================================ */
    const STEPS = [
      /* 0 ── Naive stop-and-wait ── */
      {
        subtitle: 'Stop-and-wait (naive): CPU blocks waiting for GPU · GPU idles while CPU selects',
        footer: '<span class="red">Red zones = wasted cycles</span> · GPU and CPU alternate, each sitting idle half the time',
        draw() {
          const g = document.createElementNS(svgNS, "g"); dynG.appendChild(g);
          drawBlock(g, bx(0), pY, bw(2), pH, C.sel, "Select B1", "+VL");
          drawBlock(g, bx(2), pY, bw(2.5), pH, C.block, "BLOCKING", "waiting for GPU result");
          drawBlock(g, bx(4.5), pY, bw(1.2), pH, C.drain, "Drain B1", "−VL");
          drawBlock(g, bx(5.7), pY, bw(1.5), pH, C.block, "BLOCKING", "");
          drawBlock(g, bx(7.2), pY, bw(2), pH, C.sel, "Select B2", "+VL");

          mkText(g, (TL+TR)/2, DRN_Y+4, "No drain lane — drain is inline, blocking next Select", "9", "400", "#94a3b8");

          drawBlock(g, bx(0), gY, bw(2.5), pH, C.waste, "IDLE  GPU wasted", "");
          drawBlock(g, bx(2.5), gY, bw(2), pH, C.gpu, "Infer B1", "NN fwd pass");
          drawBlock(g, bx(4.5), gY, bw(2.7), pH, C.waste, "IDLE  GPU wasted", "");
          drawBlock(g, bx(7.2), gY, bw(2), pH, C.gpu, "Infer B2", "NN fwd pass");
        },
      },
      /* 1 ── Concept ── */
      {
        subtitle: '→ <span class="green">Pipelining: overlap CPU tree-traversal with GPU inference</span>',
        footer: 'While GPU infers batch N, CPU selects leaves for batch N+1 · <span class="green">GPU never sits idle · CPU never blocks waiting</span>',
        draw() { },
      },
      /* 2 ── Selection B1 ── */
      {
        subtitle: 'CPU traverses tree via UCB, applies virtual loss (+VL), encodes leaf, enqueues for batch inference',
        footer: '+VL along selected path → makes in-flight paths less attractive to concurrent selections',
        draw() {
          const g = document.createElementNS(svgNS, "g"); dynG.appendChild(g);
          drawBlock(g, bx(0), pY, bw(2), pH, C.sel, "Select B1", "+VL along path", true);
        },
      },
      /* 3 ── Dispatch B1 → GPU starts, CPU continues B2 ── */
      {
        subtitle: 'CPU dispatches B1 → GPU starts immediately → CPU continues with B2 (no blocking)',
        footer: 'Key: after dispatching B1, CPU does NOT wait — it immediately begins selecting B2 leaves',
        draw() {
          const g = document.createElementNS(svgNS, "g"); dynG.appendChild(g);
          drawBlock(g, bx(0), pY, bw(2), pH, C.sel, "Select B1", "+VL along path");
          drawSmall(g, bx(2), pY, bw(0.5), pH, C.disp, "D");
          drawBlock(g, bx(2.5), pY, bw(2.5), pH, C.sel, "Select B2", "+VL along path", true);

          mkArrow(g, bx(2.25), CPU_Y+LH/2+2, bx(2.25), GPU_Y-LH/2-2, "#7c3aed", "1.5");
          mkText(g, bx(2.25)-34, (CPU_Y+GPU_Y)/2-4, "dispatch", "8", "400", "#7c3aed");
          mkText(g, bx(2.25)-34, (CPU_Y+GPU_Y)/2+7, "→ GPU starts", "8", "400", "#7c3aed");

          drawBlock(g, bx(2.5), gY, bw(3), pH, C.gpu, "Infer B1", "NN forward pass", true);
        },
      },
      /* 4 ── First overlap ── */
      {
        subtitle: 'First overlap: CPU selecting B2 while GPU infers B1 → zero idle time',
        footer: '<span class="cyan">CPU Select B2  ||  GPU Infer B1  (concurrent)</span>',
        draw() {
          const g = document.createElementNS(svgNS, "g"); dynG.appendChild(g);
          drawBlock(g, bx(0), pY, bw(2), pH, C.sel, "Select B1", "+VL along path");
          drawSmall(g, bx(2), pY, bw(0.5), pH, C.disp, "D");
          drawBlock(g, bx(2.5), pY, bw(2.5), pH, C.sel, "Select B2", "+VL along path");
          drawSmall(g, bx(5), pY, bw(0.5), pH, C.disp, "D");
          drawBlock(g, bx(2.5), gY, bw(3), pH, C.gpu, "Infer B1", "NN forward pass");

          const ox1 = bx(2.5), ox2 = bx(5);
          drawBracket(g, ox1, ox2, CPU_Y-LH/2-2, "CPU Select B2  ||  GPU Infer B1  (concurrent)", "#0891b2");
          mkLine(g, ox1, CPU_Y-LH/2-22, ox1, GPU_Y+LH/2, "#0891b2", "1", "4 3");
          mkLine(g, ox2, CPU_Y-LH/2-22, ox2, GPU_Y+LH/2, "#0891b2", "1", "4 3");
        },
      },
      /* 5 ── Dispatch B2, GPU B2 starts, Drain B1 ── */
      {
        subtitle: 'GPU B1 finishes → CPU drains result (expand + backup + −VL) while GPU starts B2',
        footer: 'ray.wait(num_returns=1) returns earliest result · inflight_to_root dict prevents selecting same leaf twice',
        draw() {
          const g = document.createElementNS(svgNS, "g"); dynG.appendChild(g);
          drawBlock(g, bx(0), pY, bw(2), pH, C.dim, "Select B1", "+VL along path");
          drawSmall(g, bx(2), pY, bw(0.5), pH, C.dim, "D");
          drawBlock(g, bx(2.5), pY, bw(2.5), pH, C.dim, "Select B2", "+VL along path");
          drawSmall(g, bx(5), pY, bw(0.5), pH, C.disp, "D");

          drawBlock(g, bx(5.5), dY, bw(2), pH, C.drain, "Drain B1", "−VL · expand · backup", true);

          drawBlock(g, bx(2.5), gY, bw(3), pH, C.dim, "Infer B1", "NN forward pass");
          drawBlock(g, bx(5.5), gY, bw(3), pH, C.gpu, "Infer B2", "NN forward pass", true);

          // drain arrow
          const path = document.createElementNS(svgNS, "path");
          path.setAttribute("d", `M${bx(4)},${GPU_Y-LH/2-2} Q${bx(4.75)},${(DRN_Y+GPU_Y)/2} ${bx(6.5)},${DRN_Y+LH/2+2}`);
          path.setAttribute("stroke", "#16a34a"); path.setAttribute("stroke-width", "1.5");
          path.setAttribute("fill", "none"); path.setAttribute("marker-end", "url(#arr-drain)");
          g.appendChild(path);
        },
      },
      /* 6 ── Virtual loss explained + Select B3 ── */
      {
        subtitle: 'Virtual loss: in-flight paths penalised → concurrent selections diverge across the tree',
        footer: '',
        draw() {
          const g = document.createElementNS(svgNS, "g"); dynG.appendChild(g);
          drawBlock(g, bx(0), pY, bw(2), pH, C.sel, "Select B1", "pending_visits ++ on path (+VL)");
          drawSmall(g, bx(2), pY, bw(0.5), pH, C.disp, "D");
          drawBlock(g, bx(2.5), pY, bw(2.5), pH, C.sel, "Select B2", "pending_visits ++ on path (+VL)");
          drawSmall(g, bx(5), pY, bw(0.5), pH, C.disp, "D");
          drawBlock(g, bx(5.5), pY, bw(2.5), pH, C.sel, "Select B3", "pending_visits ++ on path (+VL)");
          drawSmall(g, bx(8), pY, bw(0.5), pH, C.disp, "D");
          drawBlock(g, bx(8.5), pY, bw(2.5), pH, C.sel, "Select B4", "pending_visits ++ on path (+VL)");

          drawBlock(g, bx(5.5), dY, bw(2), pH, C.drain, "Drain B1", "pending_visits -- · expand · backup (−VL)");
          drawBlock(g, bx(8.5), dY, bw(2), pH, C.drain, "Drain B2", "pending_visits -- · expand · backup (−VL)");

          drawBlock(g, bx(2.5), gY, bw(3), pH, C.gpu, "Infer B1", "NN forward pass");
          drawBlock(g, bx(5.5), gY, bw(3), pH, C.gpu, "Infer B2", "NN forward pass");
          drawBlock(g, bx(8.5), gY, bw(3), pH, C.gpu, "Infer B3", "NN forward pass");

          drawBracket(g, bx(2.5), bx(5), CPU_Y-LH/2-2, "B1 overlap", "#0891b2");
          drawBracket(g, bx(5.5), bx(8), CPU_Y-LH/2-2, "B2 overlap", "#0891b2");
          mkLine(g, bx(2.5), CPU_Y-LH/2-8, bx(2.5), GPU_Y+LH/2, "#0891b2", "1", "4 3");
          mkLine(g, bx(5.5), CPU_Y-LH/2-8, bx(5.5), GPU_Y+LH/2, "#0891b2", "1", "4 3");

          // VL explanation note
          drawNote(g, TL, NOTE_Y, 420, 44,
            ["+VL = pending_visits++  on UCB path → path less attractive to next selection",
             "−VL = pending_visits--  after result · inflight_to_root: skip if leaf already in-flight"],
            "#eff6ff", "#93c5fd", "#1e40af");
        },
      },
      /* 7 ── Steady state + Key Insight ── */
      {
        subtitle: 'Steady state: every cycle both CPU and GPU are active — no wasted time',
        footer: '',
        draw() {
          const g = document.createElementNS(svgNS, "g"); dynG.appendChild(g);
          drawBlock(g, bx(0), pY, bw(2), pH, C.sel, "Select B1", "+VL along path");
          drawSmall(g, bx(2), pY, bw(0.5), pH, C.disp, "D");
          drawBlock(g, bx(2.5), pY, bw(2.5), pH, C.sel, "Select B2", "+VL along path");
          drawSmall(g, bx(5), pY, bw(0.5), pH, C.disp, "D");
          drawBlock(g, bx(5.5), pY, bw(2.5), pH, C.sel, "Select B3", "+VL along path");
          drawSmall(g, bx(8), pY, bw(0.5), pH, C.disp, "D");
          drawBlock(g, bx(8.5), pY, bw(2.5), pH, C.sel, "Select B4", "+VL along path");

          drawBlock(g, bx(5.5), dY, bw(2), pH, C.drain, "Drain B1", "−VL · expand · backup");
          drawBlock(g, bx(8.5), dY, bw(2), pH, C.drain, "Drain B2", "−VL · expand · backup");

          drawBlock(g, bx(2.5), gY, bw(3), pH, C.gpu, "Infer B1", "NN forward pass");
          drawBlock(g, bx(5.5), gY, bw(3), pH, C.gpu, "Infer B2", "NN forward pass");
          drawBlock(g, bx(8.5), gY, bw(3), pH, C.gpu, "Infer B3", "NN forward pass");

          drawBracket(g, bx(2.5), bx(5), CPU_Y-LH/2-2, "B1 overlap", "#0891b2");
          drawBracket(g, bx(5.5), bx(8), CPU_Y-LH/2-2, "B2 overlap", "#0891b2");
          mkLine(g, bx(2.5), CPU_Y-LH/2-8, bx(2.5), GPU_Y+LH/2, "#0891b2", "1", "4 3");
          mkLine(g, bx(5.5), CPU_Y-LH/2-8, bx(5.5), GPU_Y+LH/2, "#0891b2", "1", "4 3");

          // VL legend (left)
          drawNote(g, TL, NOTE_Y, 210, 40,
            ["+VL = pending_visits++  (discourage re-selection)",
             "−VL = pending_visits--  (restore after backup)"],
            "#eff6ff", "#93c5fd", "#1e40af");

          // Key Insight box (right)
          drawNote(g, TL + 230, NOTE_Y, 530, 54,
            ["GPU never sits idle  ·  CPU never blocks waiting",
             "Dispatch fires when queue >= batch_size OR max_wait_ms elapsed",
             "Backpressure when pending > inflight_limit × batch_size  ·  inflight_to_root prevents duplicate leaf"],
            "#dcfce7", "#16a34a", "#166534");
        },
      },
    ];

    /* ================================================================
     *  APPLY STEP
     * ================================================================ */
    let currentStep = -1;

    function applyStep(idx) {
      clearDyn();
      const step = STEPS[idx];
      getById("subtitle").innerHTML = step.subtitle || "";
      getById("footer").innerHTML = step.footer || "";
      if (step.draw) step.draw();
      updateControls();
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
      }, 2800);
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
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.diagram-wrapper {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: #f8fafc;
  color: #1e293b;
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
.container { width: 100%; max-width: 1400px; margin: 0 auto; }

h1 {
  font-size: 20px; font-weight: 700; text-align: center;
  margin-bottom: 4px; color: #0f172a; letter-spacing: -0.3px;
}

.subtitle {
  text-align: center; font-size: 12px; color: #64748b;
  min-height: 18px; margin-bottom: 10px; line-height: 1.4;
}
.subtitle .green { color: #16a34a; font-weight: 700; }
.subtitle .red   { color: #dc2626; font-weight: 700; }
.subtitle .cyan  { color: #0891b2; font-weight: 700; }

/* Controls */
.controls {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; margin-bottom: 8px;
}
.controls button {
  font-family: inherit; font-size: 13px; font-weight: 600;
  padding: 6px 14px; border: 1.5px solid #cbd5e1; border-radius: 6px;
  background: #fff; color: #334155; cursor: pointer; transition: all 0.15s;
}
.controls button:hover:not(:disabled) { background: #f1f5f9; border-color: #94a3b8; }
.controls button:disabled { opacity: 0.4; cursor: default; }
.controls button.playing { background: #fef3c7; border-color: #d97706; color: #92400e; }
#step-label { font-size: 13px; font-weight: 600; color: #64748b; min-width: 80px; text-align: center; }

/* SVG */
#timeline { width: 100%; height: auto; display: block; }

/* Footer */
.footer {
  text-align: center; font-size: 12px; color: #64748b;
  min-height: 18px; margin-top: 6px; line-height: 1.4;
}
.footer .red   { color: #dc2626; font-weight: 600; }
.footer .green { color: #16a34a; font-weight: 600; }
.footer .cyan  { color: #0891b2; font-weight: 600; }

</style>

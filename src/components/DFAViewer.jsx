/**
 * DFAViewer.jsx
 * Visualizes the LR(1) DFA using D3.js force simulation.
 * Each state node shows full LR(1) items like: [A → • aAb, d]
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useParser } from '../context/ParserContext.jsx';

export default function DFAViewer() {
  const { parserData, activeState, setActiveState, activeTransition, darkMode } = useParser();
  const svgRef = useRef(null);
  const [selectedState, setSelectedState] = useState(null);

  useEffect(() => {
    if (!parserData || !svgRef.current) return;
    drawDFA(
      parserData,
      svgRef.current,
      activeState,
      activeTransition,
      darkMode,
      (id) => {
        const next = id === selectedState ? null : id;
        setSelectedState(next);
        setActiveState(next);
      }
    );
  }, [parserData, activeState, activeTransition, darkMode]);

  if (!parserData) {
    return (
      <div className={`panel ${darkMode ? 'dark' : 'light'}`}>
        <div className="panel-header">
          <div className="panel-title">DFA Visualization</div>
        </div>
        <div className="empty-state">Generate a parser to see the DFA.</div>
      </div>
    );
  }

  const { states } = parserData.canonicalCollection;

  return (
    <div className={`panel ${darkMode ? 'dark' : 'light'}`}>
      <div className="panel-header">
        <div className="panel-title">DFA — {states.length} States</div>
        <div className="dfa-controls">
          <span className="dfa-hint">Scroll to zoom · Drag nodes · Click state</span>
        </div>
      </div>

      <div className="dfa-container">
        <svg ref={svgRef} className="dfa-svg" />
      </div>

      {selectedState !== null && parserData && (
        <StateTable
          stateId={selectedState}
          items={states[selectedState]}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

/* ── Labeled table shown below the DFA when a state is clicked ── */
function StateTable({ stateId, items, darkMode }) {
  const th = darkMode ? 'dark' : 'light';
  return (
    <div className={`state-inspector ${th}`}>
      <div className="inspector-title">State {stateId} — LR(1) Items</div>
      <table className={`inspector-table ${th}`}>
        <thead>
          <tr>
            <th>Non-terminal</th>
            <th>Production (with dot)</th>
            <th>Lookahead</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const rhs = [...item.rhs];
            rhs.splice(item.dot, 0, '•');
            return (
              <tr key={i}>
                <td className="it-lhs">{item.lhs}</td>
                <td className="it-rhs">{rhs.join(' ')}</td>
                <td className="it-la">{item.lookahead}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Layout constants ── */
const NODE_W       = 210;
const PAD_X        = 8;
const PAD_Y        = 6;
const LINE_H       = 15;
const HEADER_H     = 22;

function nodeHeight(n) {
  return HEADER_H + PAD_Y + n * LINE_H + PAD_Y;
}

/* ── D3 Drawing ── */
function drawDFA(parserData, svgEl, activeState, activeTransition, darkMode, onStateClick) {
  const { canonicalCollection, grammar } = parserData;
  const { states, transitions } = canonicalCollection;

  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  const width  = svgEl.clientWidth  || 900;
  const height = svgEl.clientHeight || 540;

  const C = darkMode
    ? {
        nodeFill:   '#1e1e1e', nodeBorder: '#444',
        headerFill: '#252525', headerText: '#e5e5e5',
        itemText:   '#d4d4d4', dimText: '#888',
        edge: '#555', edgeLabel: '#aaa',
        active: '#f59e0b', accept: '#4ade80', start: '#60a5fa',
        divider: '#333',
      }
    : {
        nodeFill:   '#ffffff', nodeBorder: '#d1d5db',
        headerFill: '#f9fafb', headerText: '#111',
        itemText:   '#111',   dimText: '#6b7280',
        edge: '#9ca3af', edgeLabel: '#4b5563',
        active: '#d97706', accept: '#15803d', start: '#1d4ed8',
        divider: '#e5e5e5',
      };

  /* arrowheads */
  const defs = svg.append('defs');
  const mkArrow = (id, color) =>
    defs.append('marker')
      .attr('id', id).attr('viewBox', '0 -5 10 10')
      .attr('refX', 2).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color);

  mkArrow('arr-def',    C.edge);
  mkArrow('arr-active', C.active);

  const root = svg.attr('width', width).attr('height', height).append('g');

  svg.call(
    d3.zoom().scaleExtent([0.1, 3]).on('zoom', e => root.attr('transform', e.transform))
  );

  /* nodes */
  const nodes = states.map((items, i) => ({
    id: i, items,
    isAccept: items.some(it => it.dot === it.rhs.length && it.lhs === grammar.startSymbol),
    isStart: i === 0,
    w: NODE_W,
    h: nodeHeight(items.length),
  }));

  /* merged parallel links */
  const linkMap = new Map();
  for (let si = 0; si < transitions.length; si++) {
    for (const [sym, ti] of Object.entries(transitions[si])) {
      const key = `${si}→${ti}`;
      if (!linkMap.has(key)) linkMap.set(key, { source: si, target: ti, labels: [] });
      linkMap.get(key).labels.push(sym);
    }
  }
  const links = [...linkMap.values()];

  /* force sim */
  const sim = d3.forceSimulation(nodes)
    .force('link',      d3.forceLink(links).id(d => d.id).distance(300).strength(0.35))
    .force('charge',    d3.forceManyBody().strength(-1400))
    .force('center',    d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide(d => Math.max(d.w, d.h) / 1.5 + 24));

  /* ── edges ── */
  const linkG   = root.append('g');
  const linkSel = linkG.selectAll('g').data(links).enter().append('g');

  const edgePath = linkSel.append('path').attr('fill', 'none').attr('stroke-width', 1.5);
  const edgeLbl  = linkSel.append('text')
    .attr('font-size', 11)
    .attr('font-family', "'JetBrains Mono', monospace")
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .text(d => d.labels.join(' / '));

  /* ── node groups ── */
  const nodeSel = root.append('g').selectAll('g').data(nodes).enter().append('g')
    .attr('cursor', 'pointer')
    .call(
      d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
    )
    .on('click', (e, d) => { e.stopPropagation(); onStateClick(d.id); });

  /* outer box */
  nodeSel.append('rect')
    .attr('rx', 4).attr('ry', 4)
    .attr('x',  d => -d.w / 2).attr('y',  d => -d.h / 2)
    .attr('width', d => d.w).attr('height', d => d.h)
    .attr('fill', C.nodeFill)
    .attr('stroke', d => d.id === activeState ? C.active : d.isAccept ? C.accept : d.isStart ? C.start : C.nodeBorder)
    .attr('stroke-width', d => (d.id === activeState || d.isAccept || d.isStart) ? 2.5 : 1.5);

  /* header bg — two rects trick for square bottom edge */
  nodeSel.append('rect')
    .attr('x', d => -d.w / 2).attr('y', d => -d.h / 2)
    .attr('width', d => d.w).attr('height', HEADER_H)
    .attr('rx', 4).attr('ry', 4)
    .attr('fill', C.headerFill);
  nodeSel.append('rect')
    .attr('x', d => -d.w / 2).attr('y', d => -d.h / 2 + HEADER_H / 2)
    .attr('width', d => d.w).attr('height', HEADER_H / 2)
    .attr('fill', C.headerFill);

  /* divider */
  nodeSel.append('line')
    .attr('stroke', C.divider).attr('stroke-width', 1)
    .attr('x1', d => -d.w / 2).attr('x2', d => d.w / 2)
    .attr('y1', d => -d.h / 2 + HEADER_H).attr('y2', d => -d.h / 2 + HEADER_H);

  /* state number */
  nodeSel.append('text')
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
    .attr('y', d => -d.h / 2 + HEADER_H / 2)
    .attr('font-size', 12).attr('font-weight', '700')
    .attr('font-family', "'Inter', sans-serif")
    .attr('fill', d => d.id === activeState ? C.active : d.isStart ? C.start : C.headerText)
    .text(d => d.id);

  /* accept label */
  nodeSel.filter(d => d.isAccept)
    .append('text')
    .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
    .attr('x', d => d.w / 2 - 6).attr('y', d => -d.h / 2 + HEADER_H / 2)
    .attr('font-size', 9).attr('font-weight', '700')
    .attr('font-family', "'Inter', sans-serif")
    .attr('fill', C.accept)
    .text('ACC');

  /* LR(1) item lines */
  nodeSel.each(function(d) {
    const g = d3.select(this);
    const y0 = -d.h / 2 + HEADER_H + PAD_Y + LINE_H / 2;

    d.items.forEach((item, idx) => {
      const rhs = [...item.rhs];
      rhs.splice(item.dot, 0, '\u2022'); // bullet •
      const label = `[${item.lhs} \u2192 ${rhs.join(' ')}, ${item.lookahead}]`;

      g.append('text')
        .attr('x', -d.w / 2 + PAD_X)
        .attr('y', y0 + idx * LINE_H)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 10.5)
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('fill', C.itemText)
        .text(label);
    });
  });

  /* ── tick ── */
  sim.on('tick', () => {
    edgePath
      .attr('stroke', d => {
        const on = activeTransition && activeTransition.from === d.source.id && activeTransition.to === d.target.id;
        return on ? C.active : C.edge;
      })
      .attr('marker-end', d => {
        const on = activeTransition && activeTransition.from === d.source.id && activeTransition.to === d.target.id;
        return `url(#${on ? 'arr-active' : 'arr-def'})`;
      })
      .attr('d', d => {
        /* self-loop */
        if (d.source.id === d.target.id) {
          const x = d.source.x, y = d.source.y - d.source.h / 2;
          return `M${x - 18},${y} C${x - 55},${y - 55} ${x + 55},${y - 55} ${x + 18},${y}`;
        }
        const sx = d.source.x, sy = d.source.y;
        const tx = d.target.x, ty = d.target.y;
        const dx = tx - sx, dy = ty - sy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        /* exit/enter from box edges */
        const ex = sx + (dx / len) * (d.source.w / 2);
        const ey = sy + (dy / len) * (d.source.h / 2);
        const fx = tx - (dx / len) * (d.target.w / 2 + 4);
        const fy = ty - (dy / len) * (d.target.h / 2 + 4);
        const dr = len * 1.3;
        return `M${ex},${ey} A${dr},${dr} 0 0,1 ${fx},${fy}`;
      });

    edgeLbl
      .attr('fill', d => {
        const on = activeTransition && activeTransition.from === d.source.id && activeTransition.to === d.target.id;
        return on ? C.active : C.edgeLabel;
      })
      .attr('transform', d => {
        if (d.source.id === d.target.id) {
          return `translate(${d.source.x}, ${d.source.y - d.source.h / 2 - 42})`;
        }
        const mx = (d.source.x + d.target.x) / 2;
        const my = (d.source.y + d.target.y) / 2;
        const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return `translate(${mx + (-dy / len) * 16}, ${my + (dx / len) * 16})`;
      });

    nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
  });
}
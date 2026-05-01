/**
 * ParsingTable.jsx
 * Displays the LR(1) ACTION and GOTO tables.
 */

import { useParser } from '../context/ParserContext.jsx';
import { END_MARKER } from '../utils/grammarUtils.js';
import { exportTableToCSV } from '../utils/parserUtils.js';

export default function ParsingTable() {
  const { parserData, activeState, activeTransition, setActiveState, darkMode } = useParser();

  if (!parserData) {
    return (
      <div className={`panel ${darkMode ? 'dark' : 'light'}`}>
        <div className="panel-header"><div className="panel-title">Parsing Table</div></div>
        <div className="empty-state">Generate a parser to see the table.</div>
      </div>
    );
  }

  const { grammar, action, gotoTable, conflicts, canonicalCollection } = parserData;
  const { states } = canonicalCollection;
  const numStates = states.length;

  const termCols = [...grammar.terminals, END_MARKER];
  const ntCols = [...grammar.nonTerminals].filter(nt => nt !== grammar.startSymbol);

  const conflictSet = new Set(conflicts.map(c => `${c.state}-${c.symbol}`));

  const handleExport = () => {
    const csv = exportTableToCSV(grammar.terminals, grammar.nonTerminals, action, gotoTable, numStates);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lr1_parsing_table.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatAction = (act) => {
    if (!act) return '';
    if (act.type === 'shift') return `s${act.value}`;
    if (act.type === 'reduce') return `r${act.value}`;
    if (act.type === 'accept') return 'acc';
    return '';
  };

  return (
    <div className={`panel ${darkMode ? 'dark' : 'light'}`}>
      <div className="panel-header">
        <div className="panel-title">Parsing Table</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {conflicts.length > 0 && (
            <span className="conflict-badge">{conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}</span>
          )}
          <button className="export-btn" onClick={handleExport}>↓ CSV</button>
        </div>
      </div>

      {/* Productions reference */}
      <div className={`productions-ref ${darkMode ? 'dark' : 'light'}`}>
        {grammar.productions.map((p, i) => (
          <span key={i} className="prod-ref-item">
            <span className="prod-ref-num">{i}</span>
            <span className="prod-ref-text">{p.lhs} → {p.rhs.join(' ')}</span>
          </span>
        ))}
      </div>

      <div className="table-scroll">
        <table className={`parsing-table ${darkMode ? 'dark' : 'light'}`}>
          <thead>
            <tr>
              <th rowSpan={2} className="state-th">State</th>
              <th colSpan={termCols.length} className="section-th">ACTION</th>
              {ntCols.length > 0 && <th colSpan={ntCols.length} className="section-th">GOTO</th>}
            </tr>
            <tr>
              {termCols.map(t => (
                <th key={t} className={`sym-th ${t === END_MARKER ? 'endmarker' : ''}`}>{t}</th>
              ))}
              {ntCols.map(nt => (
                <th key={nt} className="sym-th nt-col">{nt}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numStates }, (_, i) => (
              <tr
                key={i}
                className={`table-row ${i === activeState ? 'active-row' : ''}`}
                onClick={() => setActiveState(i === activeState ? null : i)}
              >
                <td className="state-cell">{i}</td>
                {termCols.map(t => {
                  const act = action[i]?.[t];
                  const isConflict = conflictSet.has(`${i}-${t}`);
                  const isActive = activeTransition && activeTransition.symbol === t && (
                    (act?.type === 'shift' && i === activeTransition.from) ||
                    (act?.type === 'reduce' && i === activeTransition.from)
                  );
                  return (
                    <td
                      key={t}
                      className={`action-cell ${act?.type || ''} ${isConflict ? 'conflict' : ''} ${isActive ? 'highlight' : ''}`}
                    >
                      {formatAction(act)}
                    </td>
                  );
                })}
                {ntCols.map(nt => {
                  const g = gotoTable[i]?.[nt];
                  return (
                    <td key={nt} className="goto-cell">
                      {g !== undefined ? g : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
/**
 * FirstSetsPanel.jsx
 * Displays computed FIRST sets for all non-terminals.
 */

import { useParser } from '../context/ParserContext.jsx';
import { EPSILON } from '../utils/grammarUtils.js';

export default function FirstSetsPanel() {
  const { parserData, darkMode } = useParser();

  if (!parserData) return null;

  const { grammar, firstSets } = parserData;
  const th = darkMode ? 'dark' : 'light';

  return (
    <div className={`panel ${th}`}>
      <div className="panel-header">
        <div className="panel-title">FIRST Sets</div>
      </div>
      <div className="first-sets-grid">
        {[...grammar.nonTerminals].map(nt => {
          const fs = firstSets.get(nt) || new Set();
          return (
            <div key={nt} className="first-set-row">
              <span className="first-set-nt">FIRST({nt})</span>
              <span className="first-set-eq"> = </span>
              <span className="first-set-vals">
                {'{'}
                {[...fs].join(', ') || EPSILON}
                {'}'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
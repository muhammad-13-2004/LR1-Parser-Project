/**
 * GrammarInput.jsx
 * Grammar input panel with textarea and generate button.
 */

import { useParser } from '../context/ParserContext.jsx';

const EXAMPLES = [
  { label: 'Classic (S → AA)', value: `S -> A A\nA -> a A | b` },
  { label: 'Arithmetic', value: `E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id` },
  { label: 'Simple', value: `S -> C C\nC -> c C | d` },
  { label: 'Epsilon', value: `S -> A B\nA -> a | ε\nB -> b` },
];

export default function GrammarInput() {
  const { grammarText, setGrammarText, generateParser, loading, error, parserData, darkMode } = useParser();

  const th = darkMode ? 'dark' : 'light';

  return (
    <div className={`side-panel ${th}`}>
      <div className="panel-header">
        <div className="panel-title">Grammar</div>
        <div className="example-pills">
          {EXAMPLES.map(ex => (
            <button
              key={ex.label}
              className="pill-btn"
              onClick={() => setGrammarText(ex.value)}
              title={ex.value}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        className={`grammar-textarea ${th}`}
        value={grammarText}
        onChange={e => setGrammarText(e.target.value)}
        spellCheck={false}
        placeholder={`S -> A A\nA -> a A | b`}
        rows={6}
      />

      <div className="grammar-hint">
        One production per line. Use <code>|</code> for alternatives. Use <code>ε</code> or leave rhs as epsilon symbol for empty productions.
      </div>

      {error && (
        <div className="error-box">
          <span className="error-icon">⚠</span> {error}
        </div>
      )}

      {parserData?.conflicts?.length > 0 && (
        <div className="conflict-box">
          <div className="conflict-title">⚡ Conflicts Detected ({parserData.conflicts.length})</div>
          {parserData.conflicts.slice(0, 5).map((c, i) => (
            <div key={i} className="conflict-item">
              State {c.state}, symbol '{c.symbol}': {c.conflict}
            </div>
          ))}
          {parserData.conflicts.length > 5 && <div className="conflict-item">...and {parserData.conflicts.length - 5} more</div>}
        </div>
      )}

      <button
        className="generate-btn"
        onClick={generateParser}
        disabled={loading}
      >
        {loading ? 'Generating…' : 'Generate Parser →'}
      </button>

      {parserData && (
        <div className="stats-row">
          <Stat label="States" value={parserData.canonicalCollection.states.length} />
          <Stat label="Terminals" value={parserData.grammar.terminals.size} />
          <Stat label="Non-terminals" value={parserData.grammar.nonTerminals.size} />
          <Stat label="Productions" value={parserData.grammar.productions.length} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat-item">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
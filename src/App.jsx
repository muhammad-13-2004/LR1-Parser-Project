/**
 * App.jsx
 * Main application layout.
 */

import { useParser } from './context/ParserContext.jsx';
import GrammarInput from './components/GrammarInput.jsx';
import DFAViewer from './components/DFAViewer.jsx';
import ParsingTable from './components/ParsingTable.jsx';
import ParserSimulator from './components/ParserSimulator.jsx';
import FirstSetsPanel from './components/FirstSetsPanel.jsx';

export default function App() {
  const { darkMode, setDarkMode } = useParser();

  return (
    <div className={`app-root ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <header className={`app-header ${darkMode ? 'dark' : 'light'}`}>
        <div className="header-left">
          <span className="header-title">LR(1) Parser</span>
          <span className="header-sub">Canonical Collection Visualizer</span>
        </div>
        <div className="header-right">
          <a
            href="https://en.wikipedia.org/wiki/LR_parser"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
          >
            LR Parsing ↗
          </a>
          <button
            className="dark-toggle"
            onClick={() => setDarkMode(d => !d)}
            title="Toggle dark mode"
          >
            {darkMode ? '☀' : '◑'}
          </button>
        </div>
      </header>

      {/* Main layout */}
      <main className="app-main">
        {/* Left sidebar */}
        <aside className="sticky top-0 sidebar">
          <GrammarInput />
          <FirstSetsPanel />
        </aside>

        {/* Right content */}
        <div className="content-area">
          <div className="top-row">
            <div className="dfa-wrapper">
              <DFAViewer />
            </div>
            <div className="simulator-wrapper">
              <ParserSimulator />
            </div>
          </div>
          <div className="table-row">
            <ParsingTable />
          </div>
        </div>
      </main>
    </div>
  );
}
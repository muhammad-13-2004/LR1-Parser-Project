/**
 * ParserSimulator.jsx
 * Input string parser with step-by-step trace.
 */

import { useState, useRef, useEffect } from 'react';
import { useParser } from '../context/ParserContext.jsx';
import { tokenize, simulate } from '../utils/parserUtils.js';

export default function ParserSimulator() {
  const { parserData, setActiveState, setActiveTransition, darkMode } = useParser();
  const [inputString, setInputString] = useState('');
  const [result, setResult] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoRef = useRef(null);
  const traceRef = useRef(null);

  const th = darkMode ? 'dark' : 'light';

  useEffect(() => {
    if (!autoPlay || !result) return;
    autoRef.current = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= result.steps.length - 1) {
          setAutoPlay(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(autoRef.current);
  }, [autoPlay, result]);

  // Highlight active state during step-through
  useEffect(() => {
    if (!result || !result.steps[currentStep]) return;
    const step = result.steps[currentStep];
    if (step.stateTransition) {
      setActiveState(step.stateTransition.to);
      setActiveTransition(step.stateTransition);
    } else {
      // Extract current state from stack
      const parts = step.stack.split(' ');
      const lastNum = [...parts].reverse().find(p => !isNaN(p));
      if (lastNum !== undefined) setActiveState(parseInt(lastNum));
      setActiveTransition(null);
    }
  }, [currentStep, result]);

  // Auto-scroll trace
  useEffect(() => {
    if (traceRef.current) {
      const rows = traceRef.current.querySelectorAll('tr');
      if (rows[currentStep + 1]) {
        rows[currentStep + 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [currentStep]);

  const handleParse = () => {
    if (!parserData) return;
    const tokens = tokenize(inputString);
    const { steps, accepted, error } = simulate(
      tokens,
      parserData.action,
      parserData.gotoTable,
      parserData.grammar.productions
    );
    setResult({ steps, accepted, error });
    setCurrentStep(0);
    setAutoPlay(false);
    setActiveState(null);
    setActiveTransition(null);
  };

  const handleStepForward = () => {
    if (!result) return;
    setCurrentStep(p => Math.min(p + 1, result.steps.length - 1));
  };

  const handleStepBack = () => {
    setCurrentStep(p => Math.max(p - 1, 0));
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAutoPlay(false);
    setActiveState(null);
    setActiveTransition(null);
  };

  if (!parserData) {
    return (
      <div className={`panel ${th}`}>
        <div className="panel-header"><div className="panel-title">Parser Simulator</div></div>
        <div className="empty-state">Generate a parser first.</div>
      </div>
    );
  }

  return (
    <div className={`panel ${th}`}>
      <div className="panel-header">
        <div className="panel-title">Parser Simulator</div>
      </div>

      <div className="sim-input-row">
        <input
          className={`sim-input ${th}`}
          type="text"
          value={inputString}
          onChange={e => setInputString(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleParse()}
          placeholder={`Enter tokens separated by spaces (e.g. a b)`}
        />
        <button className="parse-btn" onClick={handleParse}>Parse</button>
      </div>

      {/* Quick examples */}
      {parserData && (
        <div className="example-inputs">
          {generateExamples(parserData.grammar).map((ex, i) => (
            <button key={i} className="pill-btn" onClick={() => setInputString(ex)}>{ex}</button>
          ))}
        </div>
      )}

      {result && (
        <>
          <div className={`result-banner ${result.accepted ? 'accept' : 'reject'}`}>
            {result.accepted ? '✓ Accepted' : '✗ Rejected'}
            {result.error && <span className="result-error"> — {result.error}</span>}
          </div>

          {/* Playback controls */}
          <div className="playback-controls">
            <button className="ctrl-btn" onClick={handleReset} title="Reset">⏮</button>
            <button className="ctrl-btn" onClick={handleStepBack} disabled={currentStep === 0} title="Back">◀</button>
            <button
              className={`ctrl-btn ${autoPlay ? 'active' : ''}`}
              onClick={() => setAutoPlay(p => !p)}
              title="Play/Pause"
            >
              {autoPlay ? '⏸' : '▶'}
            </button>
            <button
              className="ctrl-btn"
              onClick={handleStepForward}
              disabled={currentStep >= result.steps.length - 1}
              title="Forward"
            >▶</button>
            <span className="step-counter">{currentStep + 1} / {result.steps.length}</span>
          </div>

          {/* Trace table */}
          <div className="trace-scroll">
            <table className={`trace-table ${th}`} ref={traceRef}>
              <thead>
                <tr>
                  <th className="trace-th">#</th>
                  <th className="trace-th">Stack</th>
                  <th className="trace-th">Input</th>
                  <th className="trace-th">Action</th>
                </tr>
              </thead>
              <tbody>
                {result.steps.map((step, i) => (
                  <tr
                    key={i}
                    className={`trace-row ${i === currentStep ? 'active-trace' : ''} ${step.type}`}
                    onClick={() => setCurrentStep(i)}
                  >
                    <td className="trace-num">{i + 1}</td>
                    <td className="trace-stack">{step.stack}</td>
                    <td className="trace-input">{step.input}</td>
                    <td className={`trace-action ${step.type}`}>{step.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function generateExamples(grammar) {
  const examples = [];
  // Try to generate a few valid strings from terminal sequences in productions
  const terminals = [...grammar.terminals].slice(0, 4);
  if (terminals.length >= 1) examples.push(terminals[0]);
  if (terminals.length >= 2) examples.push(terminals.slice(0, 2).join(' '));
  // Common combos
  examples.push(terminals.join(' '));
  return examples.filter((e, i, a) => a.indexOf(e) === i).slice(0, 4);
}
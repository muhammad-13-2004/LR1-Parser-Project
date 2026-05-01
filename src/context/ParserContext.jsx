/**
 * ParserContext.jsx
 * Central state management for the LR(1) parser app.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { parseGrammar, augmentGrammar, computeFirst } from '../utils/grammarUtils.js';
import { buildCanonicalCollection, buildParsingTable } from '../utils/lr1Utils.js';

const ParserContext = createContext(null);

export function ParserProvider({ children }) {
  const [grammarText, setGrammarText] = useState(`S -> A A\nA -> a A | b`);
  const [parserData, setParserData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeState, setActiveState] = useState(null);
  const [activeTransition, setActiveTransition] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const generateParser = useCallback(() => {
    setLoading(true);
    setError(null);
    setParserData(null);

    try {
      const rawGrammar = parseGrammar(grammarText);
      const grammar = augmentGrammar(rawGrammar);
      const firstSets = computeFirst(grammar);
      const canonicalCollection = buildCanonicalCollection(grammar, firstSets);
      const { action, gotoTable, conflicts } = buildParsingTable(grammar, firstSets, canonicalCollection);

      setParserData({
        grammar,
        firstSets,
        canonicalCollection,
        action,
        gotoTable,
        conflicts,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [grammarText]);

  return (
    <ParserContext.Provider value={{
      grammarText, setGrammarText,
      parserData,
      error,
      loading,
      generateParser,
      activeState, setActiveState,
      activeTransition, setActiveTransition,
      darkMode, setDarkMode,
    }}>
      {children}
    </ParserContext.Provider>
  );
}

export function useParser() {
  const ctx = useContext(ParserContext);
  if (!ctx) throw new Error('useParser must be used within ParserProvider');
  return ctx;
}
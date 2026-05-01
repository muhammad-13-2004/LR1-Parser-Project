/**
 * grammarUtils.js
 * Handles grammar parsing, augmentation, and FIRST/FOLLOW set computation.
 */

export const EPSILON = 'ε';
export const END_MARKER = '$';
export const AUGMENTED_START = "S'";

/**
 * Parse raw grammar text into a structured grammar object.
 * Input format: "S -> A B | C" or "A -> a A"
 */
export function parseGrammar(text) {
  const lines = text.trim().split('\n').filter(l => l.trim() !== '');
  const productions = [];
  const nonTerminals = new Set();
  const terminals = new Set();

  for (const line of lines) {
    const arrowMatch = line.match(/^(\S+)\s*->\s*(.+)$/);
    if (!arrowMatch) {
      throw new Error(`Invalid production: "${line}"`);
    }
    const lhs = arrowMatch[1].trim();
    const rhsAlternatives = arrowMatch[2].split('|').map(alt => alt.trim().split(/\s+/).filter(s => s !== ''));

    nonTerminals.add(lhs);
    for (const rhs of rhsAlternatives) {
      if (rhs.length === 0) {
        throw new Error(`Empty production for ${lhs}. Use ε or leave blank for epsilon.`);
      }
      productions.push({ lhs, rhs });
    }
  }

  // Collect terminals
  for (const { rhs } of productions) {
    for (const sym of rhs) {
      if (sym !== EPSILON && !nonTerminals.has(sym)) {
        terminals.add(sym);
      }
    }
  }

  if (productions.length === 0) {
    throw new Error('No productions found.');
  }

  return {
    productions,
    nonTerminals,
    terminals,
    startSymbol: productions[0].lhs,
  };
}

/**
 * Augment grammar: add S' -> S
 */
export function augmentGrammar(grammar) {
  const augStart = AUGMENTED_START;
  const augProduction = { lhs: augStart, rhs: [grammar.startSymbol] };
  const augProductions = [augProduction, ...grammar.productions];
  const augNonTerminals = new Set([augStart, ...grammar.nonTerminals]);

  return {
    productions: augProductions,
    nonTerminals: augNonTerminals,
    terminals: grammar.terminals,
    startSymbol: augStart,
    originalStart: grammar.startSymbol,
  };
}

/**
 * Compute FIRST sets for all symbols in the grammar.
 * Returns a Map from symbol -> Set of terminals (may include ε).
 */
export function computeFirst(grammar) {
  const { productions, nonTerminals, terminals } = grammar;
  const first = new Map();

  // Initialize
  for (const nt of nonTerminals) first.set(nt, new Set());
  for (const t of terminals) first.set(t, new Set([t]));
  first.set(EPSILON, new Set([EPSILON]));
  first.set(END_MARKER, new Set([END_MARKER]));

  let changed = true;
  while (changed) {
    changed = false;
    for (const { lhs, rhs } of productions) {
      const prevSize = first.get(lhs).size;

      if (rhs[0] === EPSILON) {
        if (!first.get(lhs).has(EPSILON)) {
          first.get(lhs).add(EPSILON);
          changed = true;
        }
        continue;
      }

      let allHaveEpsilon = true;
      for (const sym of rhs) {
        const symFirst = first.get(sym) || new Set([sym]);
        for (const f of symFirst) {
          if (f !== EPSILON) first.get(lhs).add(f);
        }
        if (!symFirst.has(EPSILON)) {
          allHaveEpsilon = false;
          break;
        }
      }
      if (allHaveEpsilon) first.get(lhs).add(EPSILON);

      if (first.get(lhs).size !== prevSize) changed = true;
    }
  }

  return first;
}

/**
 * Compute FIRST of a sequence of symbols followed by a lookahead.
 * Used during closure computation.
 */
export function firstOfSequence(symbols, lookahead, firstSets) {
  const result = new Set();

  if (symbols.length === 0) {
    result.add(lookahead);
    return result;
  }

  let allEpsilon = true;
  for (const sym of symbols) {
    const sf = firstSets.get(sym) || new Set([sym]);
    for (const f of sf) {
      if (f !== EPSILON) result.add(f);
    }
    if (!sf.has(EPSILON)) {
      allEpsilon = false;
      break;
    }
  }

  if (allEpsilon) result.add(lookahead);
  return result;
}
/**
 * lr1Utils.js
 * Core LR(1) algorithm: Items, Closure, Goto, Canonical Collection, DFA.
 */

import { EPSILON, END_MARKER, firstOfSequence } from './grammarUtils.js';

// ─── Item Utilities ─────────────────────────────────────────────────────────

/**
 * Create an LR(1) item: [lhs -> α . β, lookahead]
 */
export function makeItem(lhs, rhs, dot, lookahead) {
  return { lhs, rhs: [...rhs], dot, lookahead };
}

/**
 * Serialize an item to a unique string key.
 */
export function itemKey(item) {
  const rhs = [...item.rhs];
  rhs.splice(item.dot, 0, '•');
  return `${item.lhs} -> ${rhs.join(' ')} [${item.lookahead}]`;
}

/**
 * Serialize an item set to a unique string key (order-independent).
 */
export function itemSetKey(items) {
  return items.map(itemKey).sort().join('\n');
}

/**
 * Check if two item sets are equal.
 */
export function itemSetsEqual(a, b) {
  return itemSetKey(a) === itemSetKey(b);
}

/**
 * Get the symbol after the dot.
 */
export function symbolAfterDot(item) {
  if (item.dot >= item.rhs.length) return null;
  return item.rhs[item.dot];
}

// ─── Closure ─────────────────────────────────────────────────────────────────

/**
 * Compute the closure of a set of LR(1) items.
 */
export function closure(items, grammar, firstSets) {
  const { productions } = grammar;
  const itemMap = new Map();

  for (const item of items) {
    itemMap.set(itemKey(item), item);
  }

  const queue = [...items];

  while (queue.length > 0) {
    const item = queue.shift();
    const B = symbolAfterDot(item);

    if (!B || !grammar.nonTerminals.has(B)) continue;

    // β is the rest of rhs after B
    const beta = item.rhs.slice(item.dot + 1);
    const lookaheadSet = firstOfSequence(beta, item.lookahead, firstSets);

    for (const prod of productions) {
      if (prod.lhs !== B) continue;

      for (const lookahead of lookaheadSet) {
        const rhs = prod.rhs[0] === EPSILON ? [] : [...prod.rhs];
        const newItem = makeItem(B, rhs, 0, lookahead);
        const key = itemKey(newItem);

        if (!itemMap.has(key)) {
          itemMap.set(key, newItem);
          queue.push(newItem);
        }
      }
    }
  }

  return [...itemMap.values()];
}

// ─── Goto ─────────────────────────────────────────────────────────────────────

/**
 * Compute goto(I, X): move dot over symbol X.
 */
export function goto(items, symbol, grammar, firstSets) {
  const moved = [];
  for (const item of items) {
    if (symbolAfterDot(item) === symbol) {
      moved.push(makeItem(item.lhs, item.rhs, item.dot + 1, item.lookahead));
    }
  }
  if (moved.length === 0) return [];
  return closure(moved, grammar, firstSets);
}

// ─── Canonical Collection ────────────────────────────────────────────────────

/**
 * Build the canonical LR(1) collection of item sets.
 * Returns { states, transitions }
 */
export function buildCanonicalCollection(grammar, firstSets) {
  const { productions, nonTerminals, terminals, startSymbol } = grammar;

  // Start item: S' -> . S [$]
  const startProd = productions.find(p => p.lhs === startSymbol);
  const startRhs = startProd.rhs[0] === EPSILON ? [] : [...startProd.rhs];
  const startItem = makeItem(startSymbol, startRhs, 0, END_MARKER);
  const startState = closure([startItem], grammar, firstSets);

  const states = [startState]; // states[i] = array of LR(1) items
  const stateKeys = new Map(); // key -> stateIndex
  stateKeys.set(itemSetKey(startState), 0);

  // transitions[fromState][symbol] = toState
  const transitions = [];
  transitions.push({});

  const queue = [0];

  const allSymbols = [...nonTerminals, ...terminals];

  while (queue.length > 0) {
    const si = queue.shift();
    const state = states[si];

    for (const sym of allSymbols) {
      const nextState = goto(state, sym, grammar, firstSets);
      if (nextState.length === 0) continue;

      const key = itemSetKey(nextState);
      let nextIdx;

      if (stateKeys.has(key)) {
        nextIdx = stateKeys.get(key);
      } else {
        nextIdx = states.length;
        states.push(nextState);
        stateKeys.set(key, nextIdx);
        transitions.push({});
        queue.push(nextIdx);
      }

      transitions[si][sym] = nextIdx;
    }
  }

  return { states, transitions };
}

// ─── Parsing Table ───────────────────────────────────────────────────────────

/**
 * Build the ACTION and GOTO tables from the canonical collection.
 * Returns { action, gotoTable, conflicts, productionList }
 */
export function buildParsingTable(grammar, firstSets, canonicalCollection) {
  const { states, transitions } = canonicalCollection;
  const { productions, nonTerminals, terminals, startSymbol, originalStart } = grammar;

  const action = []; // action[state][terminal] = { type, value }
  const gotoTable = []; // gotoTable[state][nonTerminal] = nextState
  const conflicts = [];

  for (let i = 0; i < states.length; i++) {
    action.push({});
    gotoTable.push({});
  }

  // Fill GOTO table
  for (let si = 0; si < states.length; si++) {
    for (const nt of nonTerminals) {
      if (transitions[si][nt] !== undefined) {
        gotoTable[si][nt] = transitions[si][nt];
      }
    }
  }

  // Fill ACTION table
  for (let si = 0; si < states.length; si++) {
    const state = states[si];

    // Shift actions
    for (const t of terminals) {
      if (transitions[si][t] !== undefined) {
        const newEntry = { type: 'shift', value: transitions[si][t] };
        if (action[si][t]) {
          conflicts.push({ state: si, symbol: t, conflict: `Shift/Reduce conflict`, existing: action[si][t], new: newEntry });
        }
        action[si][t] = newEntry;
      }
    }

    // Reduce / Accept actions
    for (const item of state) {
      if (item.dot < item.rhs.length) continue; // dot not at end

      // Find production index
      const prodIdx = productions.findIndex(
        p => p.lhs === item.lhs && p.rhs.join(' ') === (item.rhs.join(' ') || EPSILON)
      );

      if (item.lhs === startSymbol && item.lookahead === END_MARKER) {
        // Accept
        const newEntry = { type: 'accept' };
        if (action[si][END_MARKER] && action[si][END_MARKER].type !== 'accept') {
          conflicts.push({ state: si, symbol: END_MARKER, conflict: 'Accept conflict', existing: action[si][END_MARKER], new: newEntry });
        }
        action[si][END_MARKER] = newEntry;
      } else {
        const newEntry = { type: 'reduce', value: prodIdx };
        if (action[si][item.lookahead]) {
          const existing = action[si][item.lookahead];
          conflicts.push({
            state: si,
            symbol: item.lookahead,
            conflict: existing.type === 'shift' ? 'Shift/Reduce conflict' : 'Reduce/Reduce conflict',
            existing,
            new: newEntry
          });
        } else {
          action[si][item.lookahead] = newEntry;
        }
      }
    }
  }

  return { action, gotoTable, conflicts };
}
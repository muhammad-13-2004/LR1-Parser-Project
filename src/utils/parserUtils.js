/**
 * parserUtils.js
 * LR(1) stack-based parsing simulation.
 */

import { END_MARKER, EPSILON } from './grammarUtils.js';

/**
 * Tokenize an input string.
 * Splits on whitespace.
 */
export function tokenize(input) {
  const tokens = input.trim().split(/\s+/).filter(t => t !== '');
  tokens.push(END_MARKER);
  return tokens;
}

/**
 * Run LR(1) parsing simulation.
 * Returns array of step objects and final status.
 */
export function simulate(tokens, action, gotoTable, productions) {
  const steps = [];
  const stack = [0]; // state stack
  const symbolStack = []; // symbol stack (for display)
  let pos = 0;
  let accepted = false;
  let error = null;
  const MAX_STEPS = 500;

  while (steps.length < MAX_STEPS) {
    const state = stack[stack.length - 1];
    const lookahead = tokens[pos];

    const act = action[state]?.[lookahead];

    const stackDisplay = buildStackDisplay(stack, symbolStack);
    const inputDisplay = tokens.slice(pos).join(' ');

    if (!act) {
      const expected = Object.keys(action[state] || {});
      steps.push({
        stack: stackDisplay,
        input: inputDisplay,
        action: `Error: unexpected '${lookahead}'. Expected: ${expected.join(', ') || 'nothing'}`,
        type: 'error',
      });
      error = `Parse error at token '${lookahead}'. Expected: ${expected.join(', ') || 'nothing'}`;
      break;
    }

    if (act.type === 'shift') {
      steps.push({
        stack: stackDisplay,
        input: inputDisplay,
        action: `Shift ${act.value}`,
        type: 'shift',
        stateTransition: { from: state, to: act.value, symbol: lookahead },
      });
      symbolStack.push(lookahead);
      stack.push(act.value);
      pos++;
    } else if (act.type === 'reduce') {
      const prod = productions[act.value];
      const rLen = prod.rhs[0] === EPSILON ? 0 : prod.rhs.length;

      steps.push({
        stack: stackDisplay,
        input: inputDisplay,
        action: `Reduce by ${prod.lhs} → ${prod.rhs.join(' ')}  (prod #${act.value})`,
        type: 'reduce',
        production: prod,
        productionIndex: act.value,
      });

      // Pop rLen items
      for (let i = 0; i < rLen; i++) {
        stack.pop();
        symbolStack.pop();
      }

      const topState = stack[stack.length - 1];
      const nextState = gotoTable[topState]?.[prod.lhs];
      if (nextState === undefined) {
        steps.push({
          stack: buildStackDisplay(stack, symbolStack),
          input: inputDisplay,
          action: `Error: no GOTO entry for state ${topState}, nonterminal ${prod.lhs}`,
          type: 'error',
        });
        error = `GOTO table missing entry for state ${topState}, symbol ${prod.lhs}`;
        break;
      }

      symbolStack.push(prod.lhs);
      stack.push(nextState);
    } else if (act.type === 'accept') {
      steps.push({
        stack: stackDisplay,
        input: inputDisplay,
        action: 'Accept ✓',
        type: 'accept',
      });
      accepted = true;
      break;
    }
  }

  if (steps.length >= MAX_STEPS) {
    error = 'Parsing exceeded maximum steps — possible infinite loop.';
  }

  return { steps, accepted, error };
}

function buildStackDisplay(stack, symbolStack) {
  const result = ['0'];
  for (let i = 0; i < symbolStack.length; i++) {
    result.push(symbolStack[i]);
    result.push(String(stack[i + 1]));
  }
  return result.join(' ');
}

/**
 * Export ACTION+GOTO table to CSV string.
 */
export function exportTableToCSV(terminals, nonTerminals, action, gotoTable, numStates) {
  const termCols = [...terminals, '$'];
  const ntCols = [...nonTerminals].filter(nt => nt !== "S'");
  const header = ['State', ...termCols.map(t => `ACTION[${t}]`), ...ntCols.map(nt => `GOTO[${nt}]`)];

  const rows = [header];
  for (let i = 0; i < numStates; i++) {
    const row = [String(i)];
    for (const t of termCols) {
      const act = action[i]?.[t];
      if (!act) row.push('');
      else if (act.type === 'shift') row.push(`s${act.value}`);
      else if (act.type === 'reduce') row.push(`r${act.value}`);
      else if (act.type === 'accept') row.push('acc');
      else row.push('');
    }
    for (const nt of ntCols) {
      const g = gotoTable[i]?.[nt];
      row.push(g !== undefined ? String(g) : '');
    }
    rows.push(row);
  }

  return rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
}
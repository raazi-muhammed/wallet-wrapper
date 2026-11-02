/**
 * Evaluates a basic arithmetic expression such as "10 * 23" or "(120 + 80) / 4".
 * Supports + - * / (also × and ÷), parentheses, unary minus and decimals.
 * Returns undefined when the expression is incomplete or invalid.
 */
export function evaluateExpression(input: string): number | undefined {
  const tokens = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/,/g, "").match(/\d*\.?\d+|\d+\.|[-+*/()]|\S/g);
  if (!tokens) return undefined;
  let pos = 0;

  // expr := term (("+" | "-") term)*
  function expr(): number | undefined {
    let value = term();
    while (value !== undefined && (tokens![pos] === "+" || tokens![pos] === "-")) {
      const op = tokens![pos++];
      const rhs = term();
      if (rhs === undefined) return undefined;
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  // term := factor (("*" | "/") factor)*
  function term(): number | undefined {
    let value = factor();
    while (value !== undefined && (tokens![pos] === "*" || tokens![pos] === "/")) {
      const op = tokens![pos++];
      const rhs = factor();
      if (rhs === undefined) return undefined;
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }

  // factor := "-" factor | "(" expr ")" | number
  function factor(): number | undefined {
    const token = tokens![pos++];
    if (token === "-") {
      const value = factor();
      return value === undefined ? undefined : -value;
    }
    if (token === "(") {
      const value = expr();
      return tokens![pos++] === ")" ? value : undefined;
    }
    const value = Number(token);
    return token !== undefined && Number.isFinite(value) ? value : undefined;
  }

  const result = expr();
  if (result === undefined || pos !== tokens.length || !Number.isFinite(result)) return undefined;
  // Round away float noise such as 0.1 + 0.2 = 0.30000000000000004.
  return Math.round(result * 100) / 100;
}

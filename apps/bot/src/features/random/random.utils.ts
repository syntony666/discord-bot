export const MAX_DICE = 100;
export const MIN_SIDES = 2;
export const MAX_SIDES = 1000;

export interface DiceModifier {
  type: 'kh' | 'dh' | 'kl' | 'dl';
  n: number;
}

export interface DiceSpec {
  count: number;
  sides: number;
  modifier?: DiceModifier;
}

export interface RollResult {
  rolls: number[];
  /** Parallel to rolls — false marks dice excluded from the total. */
  kept: boolean[];
  total: number;
}

/** Parse `NdM` with optional kh/dh/kl/dl modifier (e.g. `4d6kh3`). Null on invalid input. */
export function parseDiceExpr(expr: string): DiceSpec | null {
  const m = expr
    .trim()
    .toLowerCase()
    .match(/^(\d*)d(\d+)(?:(kh|dh|kl|dl)(\d+))?$/);
  if (!m) return null;
  const count = m[1] ? Number(m[1]) : 1;
  const sides = Number(m[2]);
  if (count < 1 || count > MAX_DICE || sides < MIN_SIDES || sides > MAX_SIDES) return null;
  if (m[3]) {
    const n = Number(m[4]);
    if (n < 1 || n >= count) return null;
    return { count, sides, modifier: { type: m[3] as DiceModifier['type'], n } };
  }
  return { count, sides };
}

/** `roll(sides)` returns one die result in [1, sides] — injected so tests can fix the sequence. */
export function rollDice(spec: DiceSpec, roll: (sides: number) => number): RollResult {
  const rolls = Array.from({ length: spec.count }, () => roll(spec.sides));
  const kept = rolls.map(() => true);
  if (spec.modifier) {
    const { type, n } = spec.modifier;
    const desc = rolls.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    let drop: typeof desc;
    if (type === 'dh') drop = desc.slice(0, n);
    else if (type === 'dl') drop = desc.slice(desc.length - n);
    else if (type === 'kh') drop = desc.slice(n);
    else drop = desc.slice(0, desc.length - n);
    for (const { i } of drop) kept[i] = false;
  }
  const total = rolls.reduce((sum, v, i) => sum + (kept[i] ? v : 0), 0);
  return { rolls, kept, total };
}

/** Split on any of `,` `，` `;` `、` `；` — trim, drop empties. */
export function parsePickOptions(input: string): string[] {
  return input
    .split(/[,，;、；]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

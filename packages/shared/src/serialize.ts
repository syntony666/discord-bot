export function serialize(obj: unknown, seen = new WeakSet<object>()): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (typeof obj !== 'object' || obj instanceof Date) return obj;
  if (seen.has(obj)) return '[Circular]';
  seen.add(obj);
  try {
    if (obj instanceof Error) {
      return {
        name: obj.name,
        message: obj.message,
        stack: serialize(obj.stack, seen),
        // Error.cause needs es2022 lib types; runtime Node supports it
        cause: serialize((obj as { cause?: unknown }).cause, seen),
      };
    }
    if (Array.isArray(obj)) return obj.map((v) => serialize(v, seen));
    if (obj instanceof Map) {
      const serialized: Record<string, unknown> = {};
      for (const [key, value] of obj) serialized[String(key)] = serialize(value, seen);
      return serialized;
    }
    if (obj instanceof Set) return [...obj].map((v) => serialize(v, seen));
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) serialized[key] = serialize(value, seen);
    return serialized;
  } finally {
    seen.delete(obj);
  }
}

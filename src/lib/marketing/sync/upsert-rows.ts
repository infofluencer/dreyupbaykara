import "server-only";

/** Postgres upsert rejects batches where the same unique key appears twice. */
export function mergeRowsByKey<T extends Record<string, unknown>>(
  rows: T[],
  keyFn: (row: T) => string,
  sumFields: (keyof T)[],
): T[] {
  const merged = new Map<string, T>();

  for (const row of rows) {
    const key = keyFn(row);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...row });
      continue;
    }

    for (const field of sumFields) {
      const total = Number(existing[field] ?? 0) + Number(row[field] ?? 0);
      existing[field] = total as T[keyof T];
    }
  }

  return [...merged.values()];
}

export function chunkRows<T>(rows: T[], size = 500): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}

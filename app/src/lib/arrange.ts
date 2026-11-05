// Pure helper for dragging to-dos across categories (no device imports, so tests can load it).

/**
 * The day's list is one sequence: a category's title, its to-dos, its footer, the next title...
 * After a drag, every to-do belongs to the category whose title (or footer) is the nearest one above it.
 * A to-do dropped above the first title joins the first category.
 * `ownerOf` returns the category a title/footer key opens, or null for a to-do key.
 */
export function arrangeByHeaders(keys: string[], ownerOf: (key: string) => string | null): { id: string; categoryId: string }[] {
  const first = keys.map(ownerOf).find((x) => x !== null);
  if (!first) return [];
  let current = first;
  const out: { id: string; categoryId: string }[] = [];
  for (const k of keys) {
    const owner = ownerOf(k);
    if (owner !== null) current = owner;
    else out.push({ id: k, categoryId: current });
  }
  return out;
}

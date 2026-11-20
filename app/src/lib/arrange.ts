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

/**
 * A list without category titles (design app 달력 To Do, user): the held row `moved` was dropped where it is in
 * `keys`. It takes the category of the row now above it (or below it, at the top); the rest keep theirs. Returns the
 * to-dos in their new order with their categories, ready for arrangeTodos.
 */
export function arrangeByNeighbours(keys: string[], moved: string, catOf: (key: string) => string): { id: string; categoryId: string }[] {
  return keys.map((k, i) => {
    if (k !== moved) return { id: k, categoryId: catOf(k) };
    const near = i > 0 ? keys[i - 1] : keys[i + 1];
    return { id: k, categoryId: catOf(near ?? k) };
  });
}

import assert from "node:assert/strict";
import { arrangeByHeaders, arrangeByNeighbours } from "../src/lib/arrange";

const owner = (k: string) => (k.startsWith("h:") || k.startsWith("f:") ? k.slice(2) : null);
const run = (keys: string[]) => arrangeByHeaders(keys, owner).map((e) => `${e.id}>${e.categoryId}`).join(" ");

// same category: order only
assert.equal(run(["h:A", "b", "a", "f:A", "h:B", "c", "f:B"]), "b>A a>A c>B");
// dropped under another title: joins that category, first place
assert.equal(run(["h:A", "f:A", "h:B", "a", "c", "f:B"]), "a>B c>B");
// dropped after a footer but before the next title: stays with the category above (its end)
assert.equal(run(["h:A", "b", "f:A", "a", "h:B", "c", "f:B"]), "b>A a>A c>B");
// dropped above the first title: first category
assert.equal(run(["a", "h:A", "b", "f:A"]), "a>A b>A");
// no categories: nothing
assert.equal(run(["a", "b"]), "");
console.log("ok to-dos follow the title above them (5 cases)");

// a list with tags only (design app): the dropped to-do joins the category of the row above it
const cats: Record<string, string> = { a1: "A", a2: "A", b1: "B", b2: "B" };
const near = (keys: string[], moved: string) => arrangeByNeighbours(keys, moved, (k) => cats[k]).map((e) => `${e.id}>${e.categoryId}`).join(" ");
assert.equal(near(["a2", "a1", "b1", "b2"], "a2"), "a2>A a1>A b1>B b2>B"); // same category: order only
assert.equal(near(["a2", "b1", "a1", "b2"], "a1"), "a2>A b1>B a1>B b2>B"); // under a B to-do: becomes B
assert.equal(near(["b1", "a1", "a2", "b2"], "b1"), "b1>A a1>A a2>A b2>B"); // at the top: takes the one below
assert.equal(near(["a1"], "a1"), "a1>A");
console.log("ok tag list: a dropped to-do takes the category above it (4 cases)");

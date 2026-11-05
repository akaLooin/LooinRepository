import assert from "node:assert/strict";
import { arrangeByHeaders } from "../src/lib/arrange";

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

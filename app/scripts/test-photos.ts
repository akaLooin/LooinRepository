import assert from "node:assert/strict";
import { isUploaded, splitStored } from "../src/lib/photoPaths";
assert.equal(isUploaded("todo-photos/u1/a.jpg"), true);
assert.equal(isUploaded("avatars/u1/avatar.jpg"), true);
assert.equal(isUploaded("file:///data/user/0/cache/x.jpg"), false);
assert.equal(isUploaded("data:image/jpeg;base64,AAA"), false);
assert.equal(isUploaded(undefined), false);
assert.deepEqual(splitStored("diary-images/u1/d-1.jpg"), { bucket: "diary-images", path: "u1/d-1.jpg" });
console.log("ok photo paths");

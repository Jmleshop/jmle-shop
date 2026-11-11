import { test } from "node:test";
import assert from "node:assert/strict";
import { descendantIds, withoutOrphans } from "./category-tree";

const rows = [
  { id: "root", parent_id: null, deleted_at: null },
  { id: "child", parent_id: "root", deleted_at: null },
  { id: "grand", parent_id: "child", deleted_at: null },
  { id: "deadParent", parent_id: null, deleted_at: "2026-11-01" },
  { id: "orphan", parent_id: "deadParent", deleted_at: null },
  { id: "orphanKid", parent_id: "orphan", deleted_at: null },
  { id: "missingParent", parent_id: "gibtsNicht", deleted_at: null },
];

test("withoutOrphans entfernt Unterkategorien gelöschter Oberkategorien", () => {
  assert.deepEqual(
    withoutOrphans(rows).map((c) => c.id).sort(),
    ["child", "grand", "root"]
  );
});

test("descendantIds findet Kinder und Enkel", () => {
  assert.deepEqual(descendantIds(rows, "root").sort(), ["child", "grand"]);
  assert.deepEqual(descendantIds(rows, "deadParent").sort(), ["orphan", "orphanKid"]);
  assert.deepEqual(descendantIds(rows, "grand"), []);
});

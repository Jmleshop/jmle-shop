import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeNextPath } from "./safe-redirect";

const base = "https://jmle-shop.vercel.app";

describe("safeNextPath", () => {
  it("keeps internal paths with query and hash", () => {
    assert.equal(safeNextPath("/profile", base), "/profile");
    assert.equal(safeNextPath("/admin/dashboard?x=1#top", base), "/admin/dashboard?x=1#top");
  });

  it("rejects paths that would leave the shop domain", () => {
    for (const evil of ["@evil.example/x", ".evil.example", "//evil.example", "/\\evil.example", "https://evil.example", "evil"]) {
      assert.equal(safeNextPath(evil, base), "/profile", evil);
    }
  });

  it("falls back when next is missing", () => {
    assert.equal(safeNextPath(null, base), "/profile");
    assert.equal(safeNextPath("", base, "/"), "/");
  });

  it("never produces a foreign host when appended to the origin", () => {
    for (const input of ["@evil.example/x", ".evil.example", "/ok", "//x.y"]) {
      assert.equal(new URL(`${base}${safeNextPath(input, base)}`).host, "jmle-shop.vercel.app");
    }
  });
});

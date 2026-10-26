import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMissingTableError } from "./supabase-errors";

describe("isMissingTableError", () => {
  it("detects PostgREST and Postgres missing-table errors", () => {
    assert.equal(isMissingTableError({ code: "PGRST205", message: "x" }), true);
    assert.equal(isMissingTableError({ code: "42P01" }), true);
    assert.equal(
      isMissingTableError({ message: "Could not find the table 'public.orders' in the schema cache" }),
      true
    );
  });

  it("ignores other errors and null", () => {
    assert.equal(isMissingTableError(null), false);
    assert.equal(isMissingTableError({ code: "42501", message: "permission denied for table orders" }), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  friendlySiteSettingsError,
  siteSettingRowId,
} from "./site-settings";

describe("site-settings", () => {
  it("uses stable row ids for known keys", () => {
    assert.equal(siteSettingRowId("site"), "site_config_main");
    assert.equal(siteSettingRowId("site_logo"), "site_logo_main");
    assert.equal(siteSettingRowId("custom"), "site_setting_custom");
  });

  it("hides raw SQL null-id errors from admins", () => {
    const msg = friendlySiteSettingsError(
      'null value in column "id" of relation "site_settings" violates not-null constraint'
    );
    assert.match(msg, /Datenbank-ID fehlt/i);
    assert.doesNotMatch(msg, /violates not-null/i);
  });

  it("maps permission errors", () => {
    const msg = friendlySiteSettingsError("new row violates row-level security policy");
    assert.match(msg, /Berechtigung/i);
  });
});

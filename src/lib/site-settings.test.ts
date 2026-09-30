import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  friendlySiteSettingsError,
  siteSettingRowId,
  SITE_SETTING_ROW_IDS,
} from "./site-settings";

describe("site-settings", () => {
  it("uses stable UUID row ids for known keys", () => {
    assert.equal(siteSettingRowId("site"), SITE_SETTING_ROW_IDS.site);
    assert.equal(siteSettingRowId("site_logo"), SITE_SETTING_ROW_IDS.site_logo);
    assert.match(SITE_SETTING_ROW_IDS.site, /^[0-9a-f-]{36}$/i);
    const custom = siteSettingRowId("custom");
    assert.match(custom, /^[0-9a-f-]{36}$/i);
    assert.notEqual(custom, siteSettingRowId("other"));
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

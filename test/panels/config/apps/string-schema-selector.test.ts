import { describe, expect, it } from "vitest";
import { stringSchemaEntrySelector } from "../../../../src/panels/config/apps/app-view/util/string-schema-selector";

describe("stringSchemaEntrySelector", () => {
  it("renders multi-value fields as a multi-select with supervisor options", () => {
    expect(
      stringSchemaEntrySelector({
        name: "enabled_shares",
        multiple: true,
        options: ["addons", "backup", "config"],
      })
    ).toEqual({
      select: {
        options: ["addons", "backup", "config"],
        multiple: true,
        custom_value: true,
      },
    });
  });

  it("renders multi-value fields without options as an empty multi-select", () => {
    expect(
      stringSchemaEntrySelector({ name: "veto_files", multiple: true })
    ).toEqual({
      select: { options: [], multiple: true, custom_value: true },
    });
  });

  it("keeps single-value fields as text even when options are present", () => {
    expect(
      stringSchemaEntrySelector({
        name: "share_on_port",
        options: ["443", "8443", "10000"],
      })
    ).toEqual({ text: { type: "text" } });
  });

  it("keeps masked fields as password text even when options are present", () => {
    expect(
      stringSchemaEntrySelector({ name: "token", options: ["a", "b"] })
    ).toEqual({ text: { type: "password" } });
  });

  it("keeps format-typed fields as text even when options are present", () => {
    expect(
      stringSchemaEntrySelector({
        name: "contact",
        format: "email",
        options: ["a@b.c"],
      })
    ).toEqual({ text: { type: "email" } });
  });

  it("renders plain single-value fields without options as text", () => {
    expect(stringSchemaEntrySelector({ name: "workgroup" })).toEqual({
      text: { type: "text" },
    });
  });

  it("renders masked fields without options as password text", () => {
    expect(stringSchemaEntrySelector({ name: "password" })).toEqual({
      text: { type: "password" },
    });
  });
});

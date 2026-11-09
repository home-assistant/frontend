import { describe, expect, it } from "vitest";
import {
  diffJsonPayloads,
  prettyPrintJson,
} from "../../../../../../src/panels/config/integrations/integration-panels/mqtt/mqtt-payload";

describe("prettyPrintJson", () => {
  it("indents JSON objects and arrays", () => {
    expect(prettyPrintJson('{"a":1,"b":[1,2],"c":{}}')).toBe(
      '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ],\n  "c": {}\n}'
    );
    expect(prettyPrintJson(" [ ] ")).toBe("[]");
  });

  it("matches JSON.stringify for regular payloads", () => {
    const payload = '{"state": "ON", "list": [{"x": -1.5}, null, true]}';
    expect(prettyPrintJson(payload)).toBe(
      JSON.stringify(JSON.parse(payload), null, 2)
    );
  });

  it("keeps big numbers, duplicate keys and escapes as received", () => {
    expect(prettyPrintJson('{"id": 12345678901234567890}')).toBe(
      '{\n  "id": 12345678901234567890\n}'
    );
    expect(prettyPrintJson('{"a": 1, "a": 2}')).toBe(
      '{\n  "a": 1,\n  "a": 2\n}'
    );
    expect(prettyPrintJson('{"s": "a, \\"{b}\\": [c]\\\\"}')).toBe(
      '{\n  "s": "a, \\"{b}\\": [c]\\\\"\n}'
    );
  });

  it("returns undefined for payloads that aren't a JSON object or array", () => {
    expect(prettyPrintJson("online")).toBeUndefined();
    expect(prettyPrintJson("42")).toBeUndefined();
    expect(prettyPrintJson("{not json")).toBeUndefined();
  });
});

describe("diffJsonPayloads", () => {
  it("compares full payloads when the root changes between object and array", () => {
    expect(diffJsonPayloads("{}", "[]")).toBeUndefined();
    expect(diffJsonPayloads('{"0": 1}', "[1]")).toBeUndefined();
  });

  it("lists changed, added and removed keys with dotted paths", () => {
    expect(
      diffJsonPayloads(
        '{"power": 10, "energy": {"total": 1}, "old": true}',
        '{"power": 12, "energy": {"total": 1, "today": 0.5}}'
      )
    ).toEqual([
      { key: "power", type: "changed", oldValue: "10", newValue: "12" },
      { key: "energy.today", type: "added", newValue: "0.5" },
      { key: "old", type: "removed", oldValue: "true" },
    ]);
  });

  it("keeps dotted keys apart from nested objects", () => {
    expect(
      diffJsonPayloads('{"a.b": 1, "a": {"b": 2}}', '{"a.b": 3, "a": {"b": 2}}')
    ).toEqual([
      { key: '["a.b"]', type: "changed", oldValue: "1", newValue: "3" },
    ]);
  });

  it("keeps array indexes apart from numeric object keys", () => {
    expect(diffJsonPayloads('{"a": [1]}', '{"a": {"0": 1}}')).toEqual([
      { key: 'a["0"]', type: "added", newValue: "1" },
      { key: "a[0]", type: "removed", oldValue: "1" },
    ]);
  });

  it("returns no changes for identical payloads", () => {
    expect(diffJsonPayloads('{"a": 1}', '{"a": 1}')).toEqual([]);
  });

  it("can't compare payloads that aren't JSON", () => {
    expect(diffJsonPayloads("online", "offline")).toBeUndefined();
  });
});

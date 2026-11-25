import { describe, expect, it, vi } from "vitest";
import { InlineErrorFields } from "../../../../src/panels/config/automation/automation-field-errors";

describe("InlineErrorFields", () => {
  it("works", () => {
    const onChange = vi.fn();
    const fields = new InlineErrorFields(onChange);
    const editor = {};
    fields.set(editor, [["repeat", "count"], ["at"]]);

    expect(fields.has(["repeat", "count"])).toBe(true);
    expect(fields.has(["at", "offset"])).toBe(true);
    // Other keys of a claimed block stay in the sidebar
    expect(fields.has(["repeat", "sequence"])).toBe(false);
    expect(fields.has(["repeat"])).toBe(false);

    fields.delete(editor);
    expect(fields.has(["at"])).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

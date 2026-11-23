import { describe, expect, it } from "vitest";
import {
  countConfigLineChanges,
  countLineChanges,
} from "../../../../../src/panels/config/automation/ai/automation-ai-stats";

// The AI sidebar shows these numbers like a git diff, so they have to match
// what the YAML diff of the editor shows as added and removed lines
describe("countLineChanges", () => {
  it("counts nothing for the same text", () => {
    expect(countLineChanges("a\nb\n", "a\nb\n")).toEqual({
      added: 0,
      removed: 0,
    });
  });

  it("counts a changed line as one removed and one added", () => {
    expect(countLineChanges("a\nb\nc\n", "a\nx\nc\n")).toEqual({
      added: 1,
      removed: 1,
    });
  });

  it("keeps the lines in order that both texts share", () => {
    expect(countLineChanges("a\nb\nc\n", "b\nc\nd\ne\n")).toEqual({
      added: 2,
      removed: 1,
    });
  });

  it("counts everything as added for an empty text before", () => {
    expect(countLineChanges("", "a\nb\n")).toEqual({ added: 2, removed: 0 });
  });
});

describe("countConfigLineChanges", () => {
  it("counts the lines of the YAML of two configs", () => {
    expect(
      countConfigLineChanges(
        { alias: "Light", mode: "single" },
        { alias: "Light", mode: "restart", description: "At night" }
      )
    ).toEqual({ added: 2, removed: 1 });
  });
});

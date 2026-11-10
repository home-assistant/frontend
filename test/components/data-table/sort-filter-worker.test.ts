import { expose } from "comlink";
import { describe, expect, it, vi } from "vitest";
import type { Api } from "../../../src/components/data-table/sort-filter-worker";
import "../../../src/components/data-table/sort-filter-worker";

vi.mock("comlink", () => ({ expose: vi.fn() }));

const { sortData } = vi.mocked(expose).mock.calls[0][0] as Api;

describe("numeric sorting", () => {
  it.each([
    { direction: "asc" as const, expected: ["weak", "strong", "zero", "full"] },
    {
      direction: "desc" as const,
      expected: ["full", "zero", "strong", "weak"],
    },
  ])(
    "keeps unknown readings last when sorting $direction",
    ({ direction, expected }) => {
      const rows = [
        { id: "null", value: null },
        { id: "zero", value: 0 },
        { id: "weak", value: -100 },
        { id: "undefined", value: undefined },
        { id: "full", value: "100" },
        { id: "strong", value: -40 },
        { id: "invalid", value: "unknown" },
      ];
      expect(
        sortData(rows, { type: "numeric" }, direction, "value").map(
          (row) => row.id
        )
      ).toEqual([...expected, "null", "undefined", "invalid"]);
    }
  );
});

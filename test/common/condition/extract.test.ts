import { describe, it, expect } from "vitest";
import {
  extractMediaQueries,
  extractTimeConditions,
} from "../../../src/common/condition/extract";
import type {
  Condition,
  TimeCondition,
  ScreenCondition,
  OrCondition,
  AndCondition,
  NotCondition,
} from "../../../src/panels/lovelace/common/validate-condition";

describe("extractMediaQueries", () => {
  it("should extract single media query", () => {
    const conditions: Condition[] = [
      {
        condition: "screen",
        media_query: "(max-width: 600px)",
      } as ScreenCondition,
    ];

    const result = extractMediaQueries(conditions);

    expect(result).toEqual(["(max-width: 600px)"]);
  });

  it("should extract multiple media queries", () => {
    const conditions: Condition[] = [
      {
        condition: "screen",
        media_query: "(max-width: 600px)",
      } as ScreenCondition,
      {
        condition: "screen",
        media_query: "(min-width: 1200px)",
      } as ScreenCondition,
    ];

    const result = extractMediaQueries(conditions);

    expect(result).toEqual(["(max-width: 600px)", "(min-width: 1200px)"]);
  });

  it("should return empty array when no screen conditions", () => {
    const conditions: Condition[] = [
      {
        condition: "time",
        after: "08:00",
      } as TimeCondition,
      {
        condition: "state",
        entity: "light.living_room",
        state: "on",
      },
    ];

    const result = extractMediaQueries(conditions);

    expect(result).toEqual([]);
  });

  it("should ignore screen conditions without media_query", () => {
    const conditions: Condition[] = [
      {
        condition: "screen",
      } as ScreenCondition,
    ];

    const result = extractMediaQueries(conditions);

    expect(result).toEqual([]);
  });

  it("should extract from nested or conditions", () => {
    const conditions: Condition[] = [
      {
        condition: "or",
        conditions: [
          {
            condition: "screen",
            media_query: "(max-width: 600px)",
          } as ScreenCondition,
          {
            condition: "state",
            entity: "light.living_room",
            state: "on",
          },
        ],
      } as OrCondition,
    ];

    const result = extractMediaQueries(conditions);

    expect(result).toEqual(["(max-width: 600px)"]);
  });

  it("should extract from nested and conditions", () => {
    const conditions: Condition[] = [
      {
        condition: "and",
        conditions: [
          {
            condition: "screen",
            media_query: "(orientation: portrait)",
          } as ScreenCondition,
          {
            condition: "time",
            after: "08:00",
          } as TimeCondition,
        ],
      } as AndCondition,
    ];

    const result = extractMediaQueries(conditions);

    expect(result).toEqual(["(orientation: portrait)"]);
  });

  it("should extract from nested not conditions", () => {
    const conditions: Condition[] = [
      {
        condition: "not",
        conditions: [
          {
            condition: "screen",
            media_query: "(prefers-color-scheme: dark)",
          } as ScreenCondition,
        ],
      } as NotCondition,
    ];

    const result = extractMediaQueries(conditions);

    expect(result).toEqual(["(prefers-color-scheme: dark)"]);
  });

  it("should extract from deeply nested conditions", () => {
    const conditions: Condition[] = [
      {
        condition: "or",
        conditions: [
          {
            condition: "and",
            conditions: [
              {
                condition: "screen",
                media_query: "(max-width: 600px)",
              } as ScreenCondition,
              {
                condition: "not",
                conditions: [
                  {
                    condition: "screen",
                    media_query: "(orientation: landscape)",
                  } as ScreenCondition,
                ],
              } as NotCondition,
            ],
          } as AndCondition,
        ],
      } as OrCondition,
    ];

    const result = extractMediaQueries(conditions);

    expect(result).toEqual(["(max-width: 600px)", "(orientation: landscape)"]);
  });

  it("should handle empty conditions array", () => {
    const result = extractMediaQueries([]);

    expect(result).toEqual([]);
  });

  it("should handle mixed conditions with nesting", () => {
    const conditions: Condition[] = [
      {
        condition: "screen",
        media_query: "(max-width: 600px)",
      } as ScreenCondition,
      {
        condition: "time",
        after: "08:00",
      } as TimeCondition,
      {
        condition: "or",
        conditions: [
          {
            condition: "screen",
            media_query: "(min-width: 1200px)",
          } as ScreenCondition,
        ],
      } as OrCondition,
    ];

    const result = extractMediaQueries(conditions);

    expect(result).toEqual(["(max-width: 600px)", "(min-width: 1200px)"]);
  });
});

describe("extractTimeConditions", () => {
  it("should extract single time condition", () => {
    const conditions: Condition[] = [
      {
        condition: "time",
        after: "08:00",
        before: "17:00",
      } as TimeCondition,
    ];

    const result = extractTimeConditions(conditions);

    expect(result).toEqual([
      {
        condition: "time",
        after: "08:00",
        before: "17:00",
      },
    ]);
  });

  it("should extract multiple time conditions", () => {
    const conditions: Condition[] = [
      {
        condition: "time",
        after: "08:00",
      } as TimeCondition,
      {
        condition: "time",
        before: "17:00",
        weekdays: ["mon", "tue", "wed", "thu", "fri"],
      } as TimeCondition,
    ];

    const result = extractTimeConditions(conditions);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ condition: "time", after: "08:00" });
    expect(result[1]).toMatchObject({
      condition: "time",
      before: "17:00",
      weekdays: ["mon", "tue", "wed", "thu", "fri"],
    });
  });

  it("should return empty array when no time conditions", () => {
    const conditions: Condition[] = [
      {
        condition: "screen",
        media_query: "(max-width: 600px)",
      } as ScreenCondition,
      {
        condition: "state",
        entity: "light.living_room",
        state: "on",
      },
    ];

    const result = extractTimeConditions(conditions);

    expect(result).toEqual([]);
  });

  it("should extract from nested or conditions", () => {
    const conditions: Condition[] = [
      {
        condition: "or",
        conditions: [
          {
            condition: "time",
            after: "08:00",
          } as TimeCondition,
          {
            condition: "state",
            entity: "light.living_room",
            state: "on",
          },
        ],
      } as OrCondition,
    ];

    const result = extractTimeConditions(conditions);

    expect(result).toEqual([
      {
        condition: "time",
        after: "08:00",
      },
    ]);
  });

  it("should extract from nested and conditions", () => {
    const conditions: Condition[] = [
      {
        condition: "and",
        conditions: [
          {
            condition: "screen",
            media_query: "(max-width: 600px)",
          } as ScreenCondition,
          {
            condition: "time",
            weekdays: ["sat", "sun"],
          } as TimeCondition,
        ],
      } as AndCondition,
    ];

    const result = extractTimeConditions(conditions);

    expect(result).toEqual([
      {
        condition: "time",
        weekdays: ["sat", "sun"],
      },
    ]);
  });

  it("should extract from nested not conditions", () => {
    const conditions: Condition[] = [
      {
        condition: "not",
        conditions: [
          {
            condition: "time",
            after: "22:00",
            before: "06:00",
          } as TimeCondition,
        ],
      } as NotCondition,
    ];

    const result = extractTimeConditions(conditions);

    expect(result).toEqual([
      {
        condition: "time",
        after: "22:00",
        before: "06:00",
      },
    ]);
  });

  it("should extract from deeply nested conditions", () => {
    const conditions: Condition[] = [
      {
        condition: "or",
        conditions: [
          {
            condition: "and",
            conditions: [
              {
                condition: "time",
                after: "08:00",
              } as TimeCondition,
              {
                condition: "not",
                conditions: [
                  {
                    condition: "time",
                    weekdays: ["sat", "sun"],
                  } as TimeCondition,
                ],
              } as NotCondition,
            ],
          } as AndCondition,
        ],
      } as OrCondition,
    ];

    const result = extractTimeConditions(conditions);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ condition: "time", after: "08:00" });
    expect(result[1]).toMatchObject({
      condition: "time",
      weekdays: ["sat", "sun"],
    });
  });

  it("should handle empty conditions array", () => {
    const result = extractTimeConditions([]);

    expect(result).toEqual([]);
  });

  it("should handle mixed conditions with nesting", () => {
    const conditions: Condition[] = [
      {
        condition: "time",
        after: "08:00",
      } as TimeCondition,
      {
        condition: "screen",
        media_query: "(max-width: 600px)",
      } as ScreenCondition,
      {
        condition: "or",
        conditions: [
          {
            condition: "time",
            before: "22:00",
          } as TimeCondition,
        ],
      } as OrCondition,
    ];

    const result = extractTimeConditions(conditions);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ condition: "time", after: "08:00" });
    expect(result[1]).toMatchObject({ condition: "time", before: "22:00" });
  });

  it("should preserve all time condition properties", () => {
    const conditions: Condition[] = [
      {
        condition: "time",
        after: "08:00",
        before: "17:00",
        weekdays: ["mon", "tue", "wed", "thu", "fri"],
      } as TimeCondition,
    ];

    const result = extractTimeConditions(conditions);

    expect(result[0]).toEqual({
      condition: "time",
      after: "08:00",
      before: "17:00",
      weekdays: ["mon", "tue", "wed", "thu", "fri"],
    });
  });
});

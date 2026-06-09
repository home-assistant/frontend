import { describe, expect, it } from "vitest";

import {
  createHistoryLogbookUrl,
  decodeHistoryLogbookQueryParams,
  historyLogbookQueryParamConfig,
  historyLogbookTargetParamKeys,
  historyLogbookTargetFromQueryParams,
} from "../../../src/common/url/history-logbook-query-params";
import {
  createQueryString,
  decodeQueryParams,
  queryParamsFromServiceTarget,
  serviceTargetFromQueryParams,
  type QueryParamConfig,
} from "../../../src/common/url/query-params";
import {
  createTodoQueryString,
  decodeTodoQueryParams,
} from "../../../src/common/url/todo-query-params";

const panelQueryParams = [
  {
    type: "history",
    path: "/history",
  },
  {
    type: "logbook",
    path: "/logbook",
  },
] as const;

describe.each(panelQueryParams)("$type query params", (panel) => {
  it("decodes target and date params", () => {
    const params = decodeQueryParams(
      "?entity_id=light.kitchen,switch.fan&device_id=device-1&area_id=kitchen&floor_id=downstairs&label_id=important&start_date=2026-06-05T10:00:00.000Z&end_date=2026-06-05T11:00:00.000Z&back=1",
      historyLogbookQueryParamConfig
    );

    expect(params).toEqual({
      entity_id: ["light.kitchen", "switch.fan"],
      label_id: ["important"],
      floor_id: ["downstairs"],
      area_id: ["kitchen"],
      device_id: ["device-1"],
      start_date: new Date("2026-06-05T10:00:00.000Z"),
      end_date: new Date("2026-06-05T11:00:00.000Z"),
      back: true,
    });
  });

  it("creates target picker values only when target params are present", () => {
    expect(
      serviceTargetFromQueryParams(
        decodeQueryParams(
          "?start_date=2026-06-05T10:00:00.000Z",
          historyLogbookQueryParamConfig
        ),
        historyLogbookTargetParamKeys
      )
    ).toBeUndefined();

    expect(
      serviceTargetFromQueryParams(
        decodeQueryParams(
          "?entity_id=light.kitchen&area_id=kitchen",
          historyLogbookQueryParamConfig
        ),
        historyLogbookTargetParamKeys
      )
    ).toEqual({
      entity_id: ["light.kitchen"],
      area_id: ["kitchen"],
    });
  });

  it("ignores empty target values", () => {
    expect(
      serviceTargetFromQueryParams(
        decodeQueryParams(
          "?entity_id=&device_id=",
          historyLogbookQueryParamConfig
        ),
        historyLogbookTargetParamKeys
      )
    ).toBeUndefined();
  });

  it("encodes target picker values", () => {
    expect(
      queryParamsFromServiceTarget(
        {
          entity_id: ["light.kitchen", "switch.fan"],
          area_id: "kitchen",
        },
        historyLogbookTargetParamKeys
      )
    ).toEqual({
      entity_id: ["light.kitchen", "switch.fan"],
      area_id: ["kitchen"],
    });
  });

  it("creates deterministic query strings", () => {
    expect(
      createQueryString(
        {
          device_id: ["device-1"],
          entity_id: ["light.kitchen"],
          start_date: new Date("2026-06-05T10:00:00.000Z"),
          end_date: new Date("2026-06-05T11:00:00.000Z"),
        },
        historyLogbookQueryParamConfig
      )
    ).toBe(
      "entity_id=light.kitchen&device_id=device-1&start_date=2026-06-05T10%3A00%3A00.000Z&end_date=2026-06-05T11%3A00%3A00.000Z"
    );
  });

  it("creates typed URLs", () => {
    expect(
      createHistoryLogbookUrl(
        panel.path,
        { entity_id: ["light.kitchen"] },
        new Date("2026-06-05T10:00:00.000Z"),
        new Date("2026-06-05T11:00:00.000Z")
      )
    ).toBe(
      `${panel.path}?entity_id=light.kitchen&start_date=2026-06-05T10%3A00%3A00.000Z&end_date=2026-06-05T11%3A00%3A00.000Z`
    );
  });
});

describe("history logbook query params", () => {
  it("decodes query params", () => {
    expect(
      decodeHistoryLogbookQueryParams("?entity_id=light.kitchen&back=1")
    ).toEqual({
      entity_id: ["light.kitchen"],
      back: true,
    });
  });

  it("creates target picker values only when target params are present", () => {
    expect(
      historyLogbookTargetFromQueryParams(
        decodeHistoryLogbookQueryParams("?start_date=2026-06-05T10:00:00.000Z")
      )
    ).toBeUndefined();
  });
});

describe("string params", () => {
  const stringConfig = {
    string: ["name", "color"],
  } as const satisfies QueryParamConfig;

  it("decodes scalar string params", () => {
    expect(decodeQueryParams("?name=hello&color=blue", stringConfig)).toEqual({
      name: "hello",
      color: "blue",
    });
  });

  it("ignores empty string values", () => {
    expect(decodeQueryParams("?name=&color=blue", stringConfig)).toEqual({
      color: "blue",
    });
  });

  it("ignores missing string params", () => {
    expect(decodeQueryParams("?color=green", stringConfig)).toEqual({
      color: "green",
    });
  });

  it("encodes scalar string params", () => {
    expect(
      createQueryString({ name: "hello", color: "blue" }, stringConfig)
    ).toBe("name=hello&color=blue");
  });

  it("omits undefined string values from encoding", () => {
    expect(createQueryString({ name: "hello" }, stringConfig)).toBe(
      "name=hello"
    );
  });
});

describe("todo query params", () => {
  it("decodes entity_id", () => {
    expect(decodeTodoQueryParams("?entity_id=todo.shopping")).toEqual({
      entity_id: "todo.shopping",
    });
  });

  it("decodes entity_id with add_item", () => {
    expect(
      decodeTodoQueryParams("?entity_id=todo.shopping&add_item=true")
    ).toEqual({
      entity_id: "todo.shopping",
      add_item: true,
    });
  });

  it("ignores add_item with non-true value", () => {
    expect(
      decodeTodoQueryParams("?entity_id=todo.shopping&add_item=false")
    ).toEqual({
      entity_id: "todo.shopping",
    });
  });

  it("returns empty for no params", () => {
    expect(decodeTodoQueryParams("")).toEqual({});
  });

  it("creates query string with entity_id only", () => {
    expect(createTodoQueryString({ entity_id: "todo.shopping" })).toBe(
      "entity_id=todo.shopping"
    );
  });

  it("creates query string with entity_id and add_item", () => {
    expect(
      createTodoQueryString({ entity_id: "todo.shopping", add_item: true })
    ).toBe("add_item=true&entity_id=todo.shopping");
  });

  it("omits add_item when false or undefined", () => {
    expect(
      createTodoQueryString({ entity_id: "todo.shopping", add_item: false })
    ).toBe("entity_id=todo.shopping");
  });

  it("round-trips decode and encode", () => {
    const original = "?entity_id=todo.tasks&add_item=true";
    const decoded = decodeTodoQueryParams(original);
    const encoded = createTodoQueryString(decoded);
    expect(encoded).toBe("add_item=true&entity_id=todo.tasks");
  });
});

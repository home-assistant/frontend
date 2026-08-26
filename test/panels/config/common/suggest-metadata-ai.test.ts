import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateMetadataSuggestionTask,
  processMetadataSuggestion,
} from "../../../../src/panels/config/common/suggest-metadata-ai";
import type {
  MetadataSuggestionInclude,
  MetadataSuggestionResult,
} from "../../../../src/panels/config/common/suggest-metadata-ai";
import type { GenDataTaskResult } from "../../../../src/data/ai_task";
import type { HomeAssistant } from "../../../../src/types";

const fetchCategories = vi.hoisted(() => vi.fn());
const fetchFloors = vi.hoisted(() => vi.fn());
const fetchLabels = vi.hoisted(() => vi.fn());

vi.mock(
  "../../../../src/panels/config/common/suggest-metadata-helpers",
  () => ({
    fetchCategories,
    fetchFloors,
    fetchLabels,
  })
);

const connection = {} as HomeAssistant["connection"];

const INCLUDE_ALL: MetadataSuggestionInclude = {
  name: true,
  description: true,
  categories: true,
  labels: true,
  floor: true,
};

const generate = (include: MetadataSuggestionInclude) =>
  generateMetadataSuggestionTask(
    connection,
    "en",
    "automation",
    { alias: "Test" },
    [],
    include
  );

describe("generateMetadataSuggestionTask", () => {
  beforeEach(() => {
    fetchCategories.mockResolvedValue({});
    fetchFloors.mockResolvedValue({});
    fetchLabels.mockResolvedValue({});
  });

  it("omits the category field when there are no categories", async () => {
    const result = await generate(INCLUDE_ALL);

    expect(result.task.structure?.category).toBeUndefined();
    expect(result.task.instructions).not.toContain("a category");
  });

  it("includes the category field when categories exist", async () => {
    fetchCategories.mockResolvedValue({ work: "Work" });

    const result = await generate(INCLUDE_ALL);

    expect(result.task.structure?.category).toEqual({
      description: "The category of the automation",
      required: false,
      // The model is offered the category name, not its internal ID.
      selector: { select: { options: [{ value: "Work", label: "Work" }] } },
    });
    expect(result.task.instructions).toContain("a category");
  });

  it("omits the floor field when there are no floors", async () => {
    const result = await generate(INCLUDE_ALL);

    expect(result.task.structure?.floor).toBeUndefined();
    expect(result.task.instructions).not.toContain("a floor");
  });

  it("includes the floor field when floors exist", async () => {
    fetchFloors.mockResolvedValue({
      ground: { floor_id: "ground", name: "Ground floor" },
    });

    const result = await generate(INCLUDE_ALL);

    expect(result.task.structure?.floor).toEqual({
      description: "The floor of the automation",
      required: false,
      // The model is offered the floor name, not its internal ID.
      selector: {
        select: {
          options: [{ value: "Ground floor", label: "Ground floor" }],
        },
      },
    });
  });

  it("always includes the free-text labels field regardless of registries", async () => {
    const result = await generate(INCLUDE_ALL);

    expect(result.task.structure?.labels).toEqual({
      description: "Labels for the automation",
      required: false,
      selector: { text: { multiple: true } },
    });
  });
});

describe("processMetadataSuggestion", () => {
  beforeEach(() => {
    fetchCategories.mockResolvedValue({});
    fetchFloors.mockResolvedValue({});
    fetchLabels.mockResolvedValue({});
  });

  const result = (
    data: MetadataSuggestionResult
  ): GenDataTaskResult<MetadataSuggestionResult> => ({
    conversation_id: "test",
    data,
  });

  // The model is offered the category name, so the result carries a name that
  // has to map back to the internal ID.
  it("maps a category name from the model back to its ID", async () => {
    fetchCategories.mockResolvedValue({ work: "Work" });

    const processed = await processMetadataSuggestion(
      connection,
      "automation",
      result({ category: "Work" }),
      INCLUDE_ALL
    );

    expect(processed.category).toBe("work");
  });

  it("maps a floor name from the model back to its ID", async () => {
    fetchFloors.mockResolvedValue({
      ground: { floor_id: "ground", name: "Ground floor" },
    });

    const processed = await processMetadataSuggestion(
      connection,
      "automation",
      result({ floor: "Ground floor" }),
      INCLUDE_ALL
    );

    expect(processed.floor).toBe("ground");
  });
});

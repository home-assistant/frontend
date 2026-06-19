import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMetadataSuggestionTask } from "../../../../src/panels/config/common/suggest-metadata-ai";
import type { MetadataSuggestionInclude } from "../../../../src/panels/config/common/suggest-metadata-ai";
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
      selector: { select: { options: [{ value: "work", label: "Work" }] } },
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
      selector: {
        select: { options: [{ value: "ground", label: "Ground floor" }] },
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

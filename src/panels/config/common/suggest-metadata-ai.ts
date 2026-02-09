import { dump } from "js-yaml";
import type { AITaskStructure, GenDataTaskResult } from "../../../data/ai_task";
import type { HomeAssistant } from "../../../types";
import type { SuggestWithAIGenerateTask } from "../../../components/ha-suggest-with-ai-button";
import {
  fetchCategories,
  fetchFloors,
  fetchLabels,
} from "./suggest-metadata-helpers";

export interface MetadataSuggestionResult {
  name?: string;
  description?: string;
  category?: string;
  labels?: string[];
  floor?: string;
}

export type MetadataSuggestionDomain =
  | "automation"
  | "script"
  | "scene"
  | "area";

export interface MetadataSuggestionInclude {
  name: boolean;
  description?: boolean;
  categories?: boolean;
  labels?: boolean;
  floor?: boolean;
}

export const SUGGESTION_INCLUDE_DEFAULT: MetadataSuggestionInclude = {
  name: true,
  description: true,
  categories: true,
  labels: true,
} as const;

// Always English to format lists in the prompt
const PROMPT_LIST_FORMAT = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

/**
 * Generates an AI task for suggesting metadata based on their configuration.
 *
 * @param connection - Home Assistant connection
 * @param language - User's language preference
 * @param domain - The domain to suggest metadata for
 * @param config - The configuration to suggest metadata for
 * @param inspirations - Existing entries to use as inspiration
 * @param include - The metadata fields to include in the suggestion
 * @returns Promise resolving to the AI task structure
 */
export async function generateMetadataSuggestionTask<T>(
  connection: HomeAssistant["connection"],
  language: HomeAssistant["language"],
  domain: MetadataSuggestionDomain,
  config: T,
  inspirations: string[] = [],
  include = SUGGESTION_INCLUDE_DEFAULT
): Promise<SuggestWithAIGenerateTask> {
  const [categories, floors] = await Promise.all([
    include.categories
      ? fetchCategories(connection, domain)
      : Promise.resolve(undefined),
    include.floor ? fetchFloors(connection) : Promise.resolve(undefined),
  ]);

  const structure: AITaskStructure = {
    ...(include.name && {
      name: {
        description: `The name of the ${domain}`,
        required: true,
        selector: {
          text: {},
        },
      },
    }),
    ...(include.description && {
      description: {
        description: `A short description of the ${domain}`,
        required: false,
        selector: {
          text: {},
        },
      },
    }),
    ...(include.labels && {
      labels: {
        description: `Labels for the ${domain}`,
        required: false,
        selector: {
          text: {
            multiple: true,
          },
        },
      },
    }),
    ...(include.categories &&
      categories && {
        category: {
          description: `The category of the ${domain}`,
          required: false,
          selector: {
            select: {
              options: Object.entries(categories).map(([id, name]) => ({
                value: id,
                label: name,
              })),
            },
          },
        },
      }),
    ...(include.floor &&
      floors && {
        floor: {
          description: `The floor of the ${domain}`,
          required: false,
          selector: {
            select: {
              options: Object.values(floors).map((floor) => ({
                value: floor.floor_id,
                label: floor.name,
              })),
            },
          },
        },
      }),
  };

  const requestedParts = [
    include.name ? "a name" : null,
    include.description ? "a description" : null,
    include.categories ? "a category" : null,
    include.labels ? "labels" : null,
    include.floor ? "a floor" : null,
  ].filter((entry): entry is string => entry !== null);

  const categoryLabels: string[] = [
    include.categories ? "category" : null,
    include.labels ? "labels" : null,
    include.floor ? "floor" : null,
  ].filter((entry): entry is string => entry !== null);

  const categoryLabelsText = PROMPT_LIST_FORMAT.format(categoryLabels);

  const requestedPartsText = requestedParts.length
    ? PROMPT_LIST_FORMAT.format(requestedParts)
    : "suggestions";

  return {
    type: "data",
    task: {
      task_name: `frontend__${domain}__save`,
      instructions: [
        `Suggest in language "${language}" ${requestedPartsText} for the following Home Assistant ${domain}.`,
        "",
        include.name
          ? `The name should be relevant to the ${domain}'s purpose.`
          : `The suggestions should be relevant to the ${domain}'s purpose.`,
        ...(inspirations.length
          ? [
              ...(include.name
                ? [
                    `The name should be in same style and sentence capitalization as existing ${domain}s.`,
                  ]
                : []),
              ...(include.categories || include.labels || include.floor
                ? [
                    `Suggest ${categoryLabelsText} if relevant to the ${domain}'s purpose.`,
                    `Only suggest ${categoryLabelsText} that are already used by existing ${domain}s.`,
                  ]
                : []),
            ]
          : include.name
            ? [
                `The name should be short, descriptive, sentence case, and written in the language ${language}.`,
              ]
            : []),
        ...(include.description
          ? [`If the ${domain} contains 5+ steps, include a short description.`]
          : []),
        "",
        `For inspiration, here are existing ${domain}s:`,
        inspirations.join("\n"),
        "",
        `The ${domain} configuration is as follows:`,
        "",
        `${dump(config)}`,
      ].join("\n"),
      structure,
    },
  };
}

/**
 * Processes the result of an AI task for suggesting metadata
 * based on their configuration.
 *
 * @param connection - Home Assistant connection
 * @param domain - The domain of the ${domain}
 * @param result - The result of the AI task
 * @param include - The metadata fields to include in the suggestion
 * @returns Promise resolving to the processed metadata suggestion
 */
export async function processMetadataSuggestion(
  connection: HomeAssistant["connection"],
  domain: MetadataSuggestionDomain,
  result: GenDataTaskResult<MetadataSuggestionResult>,
  include = SUGGESTION_INCLUDE_DEFAULT
): Promise<MetadataSuggestionResult> {
  const [categories, labels, floors] = await Promise.all([
    include.categories
      ? fetchCategories(connection, domain)
      : Promise.resolve(undefined),
    include.labels ? fetchLabels(connection) : Promise.resolve(undefined),
    include.floor ? fetchFloors(connection) : Promise.resolve(undefined),
  ]);

  const processed: MetadataSuggestionResult = {
    name: include.name ? result.data.name : undefined,
    description: include.description ? result.data.description : undefined,
  };

  // Convert category name to ID
  if (include.categories && categories && result.data.category) {
    const categoryId = Object.entries(categories).find(
      ([, name]) => name === result.data.category
    )?.[0];
    if (categoryId) {
      processed.category = categoryId;
    }
  }

  // Convert label names to IDs
  if (include.labels && labels && result.data.labels?.length) {
    const newLabels: Record<string, undefined | string> = Object.fromEntries(
      result.data.labels.map((name) => [name, undefined])
    );
    let toFind = result.data.labels.length;
    for (const [labelId, labelName] of Object.entries(labels)) {
      if (labelName in newLabels && newLabels[labelName] === undefined) {
        newLabels[labelName] = labelId;
        toFind--;
        if (toFind === 0) {
          break;
        }
      }
    }
    const foundLabels = Object.values(newLabels).filter(
      (labelId): labelId is string => labelId !== undefined
    );
    if (foundLabels.length) {
      processed.labels = foundLabels;
    }
  }

  if (include.floor && floors && result.data.floor) {
    const floorId =
      result.data.floor in floors
        ? result.data.floor
        : Object.entries(floors).find(
            ([, floor]) => floor.name === result.data.floor
          )?.[0];
    if (floorId) {
      processed.floor = floorId;
    }
  }

  return processed;
}

import { dump } from "js-yaml";
import { computeDomain } from "../../../common/entity/compute_domain";
import { subscribeOne } from "../../../common/util/subscribe-one";
import type { AITaskStructure, GenDataTaskResult } from "../../../data/ai_task";
import { fetchCategoryRegistry } from "../../../data/category_registry";
import {
  subscribeEntityRegistry,
  type EntityRegistryEntry,
} from "../../../data/entity/entity_registry";
import { subscribeLabelRegistry } from "../../../data/label/label_registry";
import type { HomeAssistant } from "../../../types";
import type { SuggestWithAIGenerateTask } from "../../../components/ha-suggest-with-ai-button";

export interface MetadataSuggestionResult {
  name: string;
  description?: string;
  category?: string;
  labels?: string[];
}

export type MetadataSuggestionDomain = "automation" | "script";

export interface MetadataSuggestionInclude {
  description?: boolean;
  categories?: boolean;
  labels?: boolean;
}

type Categories = Record<string, string>;
type Entities = Record<string, EntityRegistryEntry>;
type Labels = Record<string, string>;

export const SUGGESTION_INCLUDE_ALL: MetadataSuggestionInclude = {
  description: true,
  categories: true,
  labels: true,
} as const;

const tryCatchEmptyObject = <T>(promise: Promise<T>): Promise<T> =>
  promise.catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Error fetching data for suggestion: ", err);
    return {} as T;
  });

const fetchCategories = (
  connection: HomeAssistant["connection"],
  domain: MetadataSuggestionDomain
): Promise<Categories> =>
  tryCatchEmptyObject<Categories>(
    fetchCategoryRegistry(connection, domain).then((cats) =>
      Object.fromEntries(cats.map((cat) => [cat.category_id, cat.name]))
    )
  );

const fetchEntities = (
  connection: HomeAssistant["connection"]
): Promise<Entities> =>
  tryCatchEmptyObject<Entities>(
    subscribeOne(connection, subscribeEntityRegistry).then((ents) =>
      Object.fromEntries(ents.map((ent) => [ent.entity_id, ent]))
    )
  );

const fetchLabels = (
  connection: HomeAssistant["connection"]
): Promise<Labels> =>
  tryCatchEmptyObject<Labels>(
    subscribeOne(connection, subscribeLabelRegistry).then((labs) =>
      Object.fromEntries(labs.map((lab) => [lab.label_id, lab.name]))
    )
  );

function buildMetadataInspirations(
  domain: MetadataSuggestionDomain,
  states: HomeAssistant["states"],
  entities: Entities,
  categories?: Categories,
  labels?: Labels
): string[] {
  const inspirations: string[] = [];

  for (const entityId of Object.keys(entities)) {
    const entityEntry = entities[entityId];
    if (!entityEntry || computeDomain(entityId) !== domain) {
      continue;
    }

    const entity = states[entityId];
    if (
      !entity ||
      entity.attributes.restored ||
      !entity.attributes.friendly_name
    ) {
      continue;
    }

    let inspiration = `- ${entity.attributes.friendly_name}`;

    // Get the category for this domain
    if (categories && categories[entityEntry.categories[domain]]) {
      inspiration += ` (category: ${categories[entityEntry.categories[domain]]})`;
    }

    if (labels && entityEntry.labels.length) {
      inspiration += ` (labels: ${entityEntry.labels
        .map((label) => labels[label])
        .join(", ")})`;
    }

    inspirations.push(inspiration);
  }

  return inspirations;
}

/**
 * Generates an AI task for suggesting metadata
 * for automations or scripts based on their configuration.
 *
 * @param connection - Home Assistant connection
 * @param states - Current state objects
 * @param language - User's language preference
 * @param domain - The domain to suggest metadata for (automation, script)
 * @param config - The configuration to suggest metadata for
 * @param include - The metadata fields to include in the suggestion
 * @returns Promise resolving to the AI task structure
 */
export async function generateMetadataSuggestionTask<T>(
  connection: HomeAssistant["connection"],
  states: HomeAssistant["states"],
  language: HomeAssistant["language"],
  domain: MetadataSuggestionDomain,
  config: T,
  include = SUGGESTION_INCLUDE_ALL
): Promise<SuggestWithAIGenerateTask> {
  const [categories, entities, labels] = await Promise.all([
    include.categories
      ? fetchCategories(connection, domain)
      : Promise.resolve(undefined),
    fetchEntities(connection),
    include.labels ? fetchLabels(connection) : Promise.resolve(undefined),
  ]);

  const inspirations = buildMetadataInspirations(
    domain,
    states,
    entities,
    categories,
    labels
  );

  const structure: AITaskStructure = {
    name: {
      description: `The name of the ${domain}`,
      required: true,
      selector: {
        text: {},
      },
    },
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
  };

  const categoryLabelText: string[] = [];
  if (include.categories) {
    categoryLabelText.push("category");
  }
  if (include.labels) {
    categoryLabelText.push("labels");
  }
  const categoryLabelString =
    categoryLabelText.length > 0 ? `, ${categoryLabelText.join(" and ")}` : "";

  return {
    type: "data",
    task: {
      task_name: `frontend__${domain}__save`,
      instructions: `Suggest in language "${language}" a name${include.description ? ", description" : ""}${categoryLabelString} for the following Home Assistant ${domain}.

The name should be relevant to the ${domain}'s purpose.
${
  inspirations.length
    ? `The name should be in same style and sentence capitalization as existing ${domain}s.${
        include.categories || include.labels
          ? `
Suggest ${categoryLabelText.join(" and ")} if relevant to the ${domain}'s purpose.
Only suggest ${categoryLabelText.join(" and ")} that are already used by existing ${domain}s.`
          : ""
      }`
    : `The name should be short, descriptive, sentence case, and written in the language ${language}.`
}${
        include.description
          ? `
If the ${domain} contains 5+ steps, include a short description.`
          : ""
      }

For inspiration, here are existing ${domain}s:
${inspirations.join("\n")}

The ${domain} configuration is as follows:

${dump(config)}
`,
      structure,
    },
  };
}

/**
 * Processes the result of an AI task for suggesting metadata
 * for automations or scripts based on their configuration.
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
  include: MetadataSuggestionInclude
): Promise<MetadataSuggestionResult> {
  const [categories, labels] = await Promise.all([
    include.categories
      ? fetchCategories(connection, domain)
      : Promise.resolve(undefined),
    include.labels ? fetchLabels(connection) : Promise.resolve(undefined),
  ]);

  const processed: MetadataSuggestionResult = {
    name: result.data.name,
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

  return processed;
}

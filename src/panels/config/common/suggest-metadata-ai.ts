import { dump } from "js-yaml";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
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

// TODO: TEST
// TODO: Self review
// TODO: AI review

export interface MetadataSuggestionResult {
  name: string;
  description?: string;
  category?: string;
  labels?: string[];
}

export interface MetadataSuggestionConfig {
  /** The domain to suggest metadata for (automation, script) */
  domain: "automation" | "script";
  /** The configuration to suggest metadata for */
  config: any;

  /** The metadata fields to include in the suggestion */
  include: {
    description?: boolean;
    categories?: boolean;
    labels?: boolean;
  };
}

type Categories = Record<string, string>;
type Entities = Record<string, EntityRegistryEntry>;
type Labels = Record<string, string>;

const tryCatchEmptyObject = <T>(promise: Promise<T>): Promise<T> =>
  promise.catch(() => ({}) as T);

const fetchCategories = (
  connection: HomeAssistant["connection"],
  domain: MetadataSuggestionConfig["domain"]
): Promise<Categories> =>
  tryCatchEmptyObject(
    fetchCategoryRegistry(connection, domain).then((cats) =>
      Object.fromEntries(cats.map((cat) => [cat.category_id, cat.name]))
    )
  );

const fetchEntities = (
  connection: HomeAssistant["connection"]
): Promise<Entities> =>
  tryCatchEmptyObject(
    subscribeOne(connection, subscribeEntityRegistry).then((ents) =>
      Object.fromEntries(ents.map((ent) => [ent.entity_id, ent]))
    )
  );

const fetchLabels = (
  connection: HomeAssistant["connection"]
): Promise<Labels> =>
  tryCatchEmptyObject(
    subscribeOne(connection, subscribeLabelRegistry).then((labs) =>
      Object.fromEntries(labs.map((lab) => [lab.label_id, lab.name]))
    )
  );

function buildMetadataInspirations(
  domain: MetadataSuggestionConfig["domain"],
  states: HomeAssistant["states"],
  entities: Entities,
  categories?: Categories,
  labels?: Labels
): string[] {
  const inspirations: string[] = [];

  if (!entities) {
    return inspirations;
  }

  for (const entity of Object.values(states)) {
    const entityEntry = entities[entity.entity_id];
    if (
      !entityEntry ||
      computeStateDomain(entity) !== domain ||
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
        .map((label) => labels![label])
        .join(", ")})`;
    }

    inspirations.push(inspiration);
  }

  return inspirations;
}

export async function generateMetadataSuggestionTask(
  connection: HomeAssistant["connection"],
  states: HomeAssistant["states"],
  language: HomeAssistant["language"],
  suggestionConfig: MetadataSuggestionConfig
): Promise<SuggestWithAIGenerateTask> {
  const { domain, config, include } = suggestionConfig;

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

export async function processMetadataSuggestion(
  connection: HomeAssistant["connection"],
  domain: MetadataSuggestionConfig["domain"],
  result: GenDataTaskResult<MetadataSuggestionResult>,
  include: MetadataSuggestionConfig["include"]
): Promise<MetadataSuggestionResult> {
  const [categories, labels] = await Promise.all([
    include.categories
      ? fetchCategories(connection, domain)
      : Promise.resolve(undefined),
    include.labels ? fetchLabels(connection) : Promise.resolve(undefined),
  ]);

  const processed: MetadataSuggestionResult = {
    name: result.data.name,
    description: result.data.description ?? undefined,
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
      (labelId) => labelId !== undefined
    );
    if (foundLabels.length) {
      processed.labels = foundLabels;
    }
  }

  return processed;
}

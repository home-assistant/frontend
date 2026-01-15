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

export interface MetadataSuggestionResult {
  name: string;
  description?: string;
  category?: string;
  labels?: string[];
}

export interface ProcessedMetadataSuggestionResult {
  name: string;
  description?: string;
  categoryId?: string;
  labelIds?: string[];
}

export interface MetadataSuggestionConfig {
  /** The domain to suggest metadata for (automation, script) */
  domain: "automation" | "script";
  /** The configuration to suggest metadata for */
  config: any;
  /** Whether to include description field in the suggestion */
  includeDescription?: boolean;
  /** Whether to include icon field in the suggestion (scripts only) */
  includeIcon?: boolean;
}

type Categories = Record<string, string>;
type Entities = Record<string, EntityRegistryEntry>;
type Labels = Record<string, string>;

const fetchCategories = (
  connection: HomeAssistant["connection"],
  domain: MetadataSuggestionConfig["domain"]
): Promise<Categories> =>
  fetchCategoryRegistry(connection, domain).then((cats) =>
    Object.fromEntries(cats.map((cat) => [cat.category_id, cat.name]))
  );

const fetchEntities = (
  connection: HomeAssistant["connection"]
): Promise<Entities> =>
  subscribeOne(connection, subscribeEntityRegistry).then((ents) =>
    Object.fromEntries(ents.map((ent) => [ent.entity_id, ent]))
  );

const fetchLabels = (
  connection: HomeAssistant["connection"]
): Promise<Labels> =>
  subscribeOne(connection, subscribeLabelRegistry).then((labs) =>
    Object.fromEntries(labs.map((lab) => [lab.label_id, lab.name]))
  );

function buildMetadataInspirations(
  states: HomeAssistant["states"],
  entities: Record<string, EntityRegistryEntry>,
  categories: Categories,
  labels: Labels,
  domain: MetadataSuggestionConfig["domain"]
): string[] {
  const inspirations: string[] = [];

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
    const category = categories[entityEntry.categories[domain]];
    if (category) {
      inspiration += ` (category: ${category})`;
    }

    if (entityEntry.labels.length) {
      inspiration += ` (labels: ${entityEntry.labels
        .map((label) => labels[label])
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
  const { domain, config, includeDescription } = suggestionConfig;

  let categories: Categories = {};
  let entities: Entities = {};
  let labels: Labels = {};
  try {
    [categories, entities, labels] = await Promise.all([
      fetchCategories(connection, domain),
      fetchEntities(connection),
      fetchLabels(connection),
    ]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting suggest metadata:", error);
  }

  const inspirations = buildMetadataInspirations(
    states,
    entities,
    categories,
    labels,
    domain
  );

  // Build the structure dynamically
  const structure: AITaskStructure = {
    name: {
      description: `The name of the ${domain}`,
      required: true,
      selector: {
        text: {},
      },
    },
  };

  // Add description field if requested
  if (includeDescription) {
    structure.description = {
      description: `A short description of the ${domain}`,
      required: false,
      selector: {
        text: {},
      },
    };
  }

  // Add labels field
  structure.labels = {
    description: `Labels for the ${domain}`,
    required: false,
    selector: {
      text: {
        multiple: true,
      },
    },
  };

  // Add category field
  structure.category = {
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
  };

  return {
    type: "data",
    task: {
      task_name: `frontend__${domain}__save`,
      instructions: `Suggest in language "${language}" a name${includeDescription ? ", description" : ""}, category and labels for the following Home Assistant ${domain}.

The name should be relevant to the ${domain}'s purpose.
${
  inspirations.length
    ? `The name should be in same style and sentence capitalization as existing ${domain}s.
Suggest a category and labels if relevant to the ${domain}'s purpose.
Only suggest category and labels that are already used by existing ${domain}s.`
    : `The name should be short, descriptive, sentence case, and written in the language ${language}.`
}${
        includeDescription
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
  result: GenDataTaskResult<MetadataSuggestionResult>
): Promise<ProcessedMetadataSuggestionResult> {
  let categories: Categories = {};
  let labels: Labels = {};
  try {
    [categories, labels] = await Promise.all([
      fetchCategories(connection, domain),
      fetchLabels(connection),
    ]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting suggest metadata:", error);
  }

  const processed: ProcessedMetadataSuggestionResult = {
    name: result.data.name,
    description: result.data.description ?? undefined,
  };

  // Convert category name to ID
  if (result.data.category) {
    const categoryId = Object.entries(categories).find(
      ([, name]) => name === result.data.category
    )?.[0];
    if (categoryId) {
      processed.categoryId = categoryId;
    }
  }

  // Convert label names to IDs
  if (result.data.labels?.length) {
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
      processed.labelIds = foundLabels;
    }
  }

  return processed;
}

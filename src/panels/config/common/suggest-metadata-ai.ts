import { dump } from "js-yaml";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { subscribeOne } from "../../../common/util/subscribe-one";
import type { GenDataTaskResult } from "../../../data/ai_task";
import { fetchCategoryRegistry } from "../../../data/category_registry";
import { subscribeEntityRegistry } from "../../../data/entity/entity_registry";
import { subscribeLabelRegistry } from "../../../data/label/label_registry";
import type { HomeAssistant } from "../../../types";
import type { SuggestWithAIGenerateTask } from "../../../components/ha-suggest-with-ai-button";

interface SuggestData {
  labels: Record<string, string>;
  entities: Record<string, any>;
  categories: Record<string, string>;
}

export interface MetadataSuggestionResult {
  name: string;
  description?: string;
  category?: string;
  labels?: string[];
}

export interface MetadataSuggestionConfig {
  /** The domain (automation, script) */
  domain: "automation" | "script";
  /** The configuration to analyze */
  config: any;
  /** Whether to include description field in suggestion */
  includeDescription?: boolean;
  /** Whether to include icon field in suggestion (scripts only) */
  includeIcon?: boolean;
}

async function getSuggestMetadata(
  hass: HomeAssistant,
  domain: string
): Promise<SuggestData> {
  const [labels, entities, categories] = await Promise.all([
    subscribeOne(hass.connection, subscribeLabelRegistry).then((labs) =>
      Object.fromEntries(labs.map((lab) => [lab.label_id, lab.name]))
    ),
    subscribeOne(hass.connection, subscribeEntityRegistry).then((ents) =>
      Object.fromEntries(ents.map((ent) => [ent.entity_id, ent]))
    ),
    fetchCategoryRegistry(hass.connection, domain).then((cats) =>
      Object.fromEntries(cats.map((cat) => [cat.category_id, cat.name]))
    ),
  ]);

  return { labels, entities, categories };
}

function buildMetadataInspirations(
  hass: HomeAssistant,
  entities: Record<string, any>,
  categories: Record<string, string>,
  labels: Record<string, string>,
  domain: string
): string[] {
  const inspirations: string[] = [];

  for (const entity of Object.values(hass.states)) {
    const entityEntry = entities[entity.entity_id];
    if (
      computeStateDomain(entity) !== domain ||
      entity.attributes.restored ||
      !entity.attributes.friendly_name ||
      !entityEntry
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
  hass: HomeAssistant,
  suggestionConfig: MetadataSuggestionConfig
): Promise<SuggestWithAIGenerateTask> {
  const { domain, config, includeDescription } = suggestionConfig;
  const { labels, entities, categories } = await getSuggestMetadata(
    hass,
    domain
  );
  const inspirations = buildMetadataInspirations(
    hass,
    entities,
    categories,
    labels,
    domain
  );

  const term = domain === "script" ? "script" : domain;

  // Build the structure dynamically
  const structure: Record<string, any> = {
    name: {
      description: `The name of the ${term}`,
      required: true,
      selector: {
        text: {},
      },
    },
  };

  // Add description field if requested
  if (includeDescription) {
    structure.description = {
      description: `A short description of the ${term}`,
      required: false,
      selector: {
        text: {},
      },
    };
  }

  // Add labels field
  structure.labels = {
    description: `Labels for the ${term}`,
    required: false,
    selector: {
      text: {
        multiple: true,
      },
    },
  };

  // Add category field
  structure.category = {
    description: `The category of the ${term}`,
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
      task_name: `frontend__${term}__save`,
      instructions: `Suggest in language "${hass.language}" a name${includeDescription ? ", description" : ""}, category and labels for the following Home Assistant ${term}.

The name should be relevant to the ${term}'s purpose.
${
  inspirations.length
    ? `The name should be in same style and sentence capitalization as existing ${term}s.
Suggest a category and labels if relevant to the ${term}'s purpose.
Only suggest category and labels that are already used by existing ${term}s.`
    : `The name should be short, descriptive, sentence case, and written in the language ${hass.language}.`
}${
        includeDescription
          ? `
If the ${term} contains 5+ steps, include a short description.`
          : ""
      }

For inspiration, here are existing ${term}s:
${inspirations.join("\n")}

The ${term} configuration is as follows:

${dump(config)}
`,
      structure,
    },
  };
}

export async function processMetadataSuggestion(
  hass: HomeAssistant,
  domain: string,
  result: GenDataTaskResult<MetadataSuggestionResult>
): Promise<{
  name: string;
  description?: string;
  categoryId?: string;
  labelIds?: string[];
}> {
  const { labels, categories } = await getSuggestMetadata(hass, domain);

  const processed: {
    name: string;
    description?: string;
    categoryId?: string;
    labelIds?: string[];
  } = {
    name: result.data.name,
  };

  // Add description if provided
processed.description = result.data.description || undefined;

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

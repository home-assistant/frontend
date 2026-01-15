import { dump } from "js-yaml";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import { subscribeOne } from "../../../../common/util/subscribe-one";
import type { GenDataTaskResult } from "../../../../data/ai_task";
import { fetchCategoryRegistry } from "../../../../data/category_registry";
import { subscribeEntityRegistry } from "../../../../data/entity/entity_registry";
import { subscribeLabelRegistry } from "../../../../data/label/label_registry";
import type { SceneConfig } from "../../../../data/scene";
import type { HomeAssistant } from "../../../../types";
import type { SuggestWithAIGenerateTask } from "../../../../components/ha-suggest-with-ai-button";

interface SuggestData {
  labels: Record<string, string>;
  entities: Record<string, any>;
  categories: Record<string, string>;
}

export interface SceneSuggestionResult {
  name: string;
  category?: string;
  labels?: string[];
}

async function getSuggestData(hass: HomeAssistant): Promise<SuggestData> {
  const [labels, entities, categories] = await Promise.all([
    subscribeOne(hass.connection, subscribeLabelRegistry).then((labs) =>
      Object.fromEntries(labs.map((lab) => [lab.label_id, lab.name]))
    ),
    subscribeOne(hass.connection, subscribeEntityRegistry).then((ents) =>
      Object.fromEntries(ents.map((ent) => [ent.entity_id, ent]))
    ),
    fetchCategoryRegistry(hass.connection, "scene").then((cats) =>
      Object.fromEntries(cats.map((cat) => [cat.category_id, cat.name]))
    ),
  ]);

  return { labels, entities, categories };
}

export async function generateSceneSuggestionTask(
  hass: HomeAssistant,
  config: SceneConfig,
  domain: string
): Promise<SuggestWithAIGenerateTask> {
  const { labels, entities, categories } = await getSuggestData(hass);
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

    const category = categories[entityEntry.categories.scene];
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

  return {
    type: "data",
    task: {
      task_name: "frontend__scene__save",
      instructions: `Suggest in language "${hass.language}" a name, category and labels for the following Home Assistant scene.

The name should be relevant to the scene's purpose.
${
  inspirations.length
    ? `The name should be in same style and sentence capitalization as existing scenes.
Suggest a category and labels if relevant to the scene's purpose.
Only suggest category and labels that are already used by existing scenes.`
    : `The name should be short, descriptive, sentence case, and written in the language ${hass.language}.`
}

For inspiration, here are existing scenes:
${inspirations.join("\n")}

The scene configuration is as follows:

${dump(config)}
`,
      structure: {
        name: {
          description: "The name of the scene",
          required: true,
          selector: {
            text: {},
          },
        },
        labels: {
          description: "Labels for the scene",
          required: false,
          selector: {
            text: {
              multiple: true,
            },
          },
        },
        category: {
          description: "The category of the scene",
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
      },
    },
  };
}

export async function processSuggestion(
  hass: HomeAssistant,
  result: GenDataTaskResult<SceneSuggestionResult>
): Promise<{
  name: string;
  categoryId?: string;
  labelIds?: string[];
}> {
  const { labels, categories } = await getSuggestData(hass);

  const processed: {
    name: string;
    categoryId?: string;
    labelIds?: string[];
  } = {
    name: result.data.name,
  };

  if (result.data.category) {
    // We get back category name, convert it to ID
    const categoryId = Object.entries(categories).find(
      ([, name]) => name === result.data.category
    )?.[0];
    if (categoryId) {
      processed.categoryId = categoryId;
    }
  }

  if (result.data.labels?.length) {
    // We get back label names, convert them to IDs
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

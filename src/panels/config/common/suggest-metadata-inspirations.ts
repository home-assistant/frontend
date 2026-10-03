import { computeDomain } from "../../../common/entity/compute_domain";
import type { HomeAssistant } from "../../../types";
import type { MetadataSuggestionDomain } from "./suggest-metadata-ai";
import {
  fetchAreas,
  fetchCategories,
  fetchEntities,
  fetchFloors,
  fetchLabels,
} from "./suggest-metadata-helpers";

export const buildEntityMetadataInspirations = async (
  connection: HomeAssistant["connection"],
  states: HomeAssistant["states"],
  domain: MetadataSuggestionDomain
): Promise<string[]> => {
  const [categories, entities, labels] = await Promise.all([
    fetchCategories(connection, domain),
    fetchEntities(connection),
    fetchLabels(connection),
  ]);

  return Object.values(entities).reduce<string[]>((inspirations, entry) => {
    if (!entry || computeDomain(entry.entity_id) !== domain) {
      return inspirations;
    }

    const entity = states[entry.entity_id];
    if (
      !entity ||
      entity.attributes.restored ||
      !entity.attributes.friendly_name
    ) {
      return inspirations;
    }

    let inspiration = `- ${entity.attributes.friendly_name}`;

    const category = entry.categories[domain];
    if (category && categories[category]) {
      inspiration += ` (category: ${categories[category]})`;
    }

    if (entry.labels.length) {
      const labelNames = entry.labels
        .map((labelId) => labels[labelId])
        .filter(Boolean);
      if (labelNames.length) {
        inspiration += ` (labels: ${labelNames.join(", ")})`;
      }
    }

    inspirations.push(inspiration);
    return inspirations;
  }, []);
};

export const buildAreaMetadataInspirations = async (
  connection: HomeAssistant["connection"]
): Promise<string[]> => {
  const [labels, floors, areas] = await Promise.all([
    fetchLabels(connection),
    fetchFloors(connection),
    fetchAreas(connection),
  ]);

  return Object.values(areas).reduce<string[]>((inspirations, area) => {
    if (!area.floor_id) {
      return inspirations;
    }

    const floorName = floors[area.floor_id]?.name;
    const labelNames = area.labels
      .map((labelId) => labels[labelId])
      .filter(Boolean);

    inspirations.push(
      `- ${area.name} (${floorName ? `floor: ${floorName}` : "no floor"}${labelNames.length ? `, labels: ${labelNames.join(", ")}` : ""})`
    );
    return inspirations;
  }, []);
};

import { computeDomain } from "../../../common/entity/compute_domain";
import { subscribeOne } from "../../../common/util/subscribe-one";
import { subscribeFloorRegistry } from "../../../data/ws-floor_registry";
import { getFloorAreaLookup } from "../../../data/floor_registry";
import { subscribeAreaRegistry } from "../../../data/area/area_registry";
import type { HomeAssistant } from "../../../types";
import type { MetadataSuggestionDomain } from "./suggest-metadata-ai";
import {
  fetchCategories,
  fetchEntities,
  fetchLabels,
} from "./suggest-metadata-helpers";

const safeFetch = async <T>(promise: Promise<T>, fallback: T): Promise<T> => {
  try {
    return await promise;
  } catch (_err) {
    return fallback;
  }
};

export const buildEntityMetadataInspirations = async (
  connection: HomeAssistant["connection"],
  states: HomeAssistant["states"],
  domain: MetadataSuggestionDomain
): Promise<string[]> => {
  const [categoryMap, entities, labelMap] = await Promise.all([
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
    if (category && categoryMap[category]) {
      inspiration += ` (category: ${categoryMap[category]})`;
    }

    if (entry.labels.length) {
      const labelNames = entry.labels
        .map((labelId) => labelMap[labelId])
        .filter(Boolean);
      if (labelNames.length) {
        inspiration += ` (labels: ${labelNames.join(", ")})`;
      }
    }

    inspirations.push(inspiration);
    return inspirations;
  }, []);
};

export const buildFloorMetadataInspirations = async (
  connection: HomeAssistant["connection"]
): Promise<string[]> => {
  const [floors, areas] = await Promise.all([
    safeFetch(subscribeOne(connection, subscribeFloorRegistry), []),
    safeFetch(subscribeOne(connection, subscribeAreaRegistry), []),
  ]);

  if (!floors.length || !areas.length) {
    return [];
  }

  const floorAreaLookup = getFloorAreaLookup(areas);

  return floors.reduce<string[]>((inspirations, floor) => {
    const floorAreas = floorAreaLookup[floor.floor_id] || [];
    const areaNames = floorAreas.map((area) => area.name).filter(Boolean);
    if (!areaNames.length) {
      return inspirations;
    }

    const floorName = floor.name || floor.floor_id;
    inspirations.push(`- ${floorName} (areas: ${areaNames.join(", ")})`);
    return inspirations;
  }, []);
};

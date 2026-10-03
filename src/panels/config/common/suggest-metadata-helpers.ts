import { subscribeOne } from "../../../common/util/subscribe-one";
import { subscribeAreaRegistry } from "../../../data/area/area_registry";
import type { AreaRegistryEntry } from "../../../data/area/area_registry";
import { fetchCategoryRegistry } from "../../../data/category_registry";
import {
  subscribeEntityRegistry,
  type EntityRegistryEntry,
} from "../../../data/entity/entity_registry";
import { subscribeFloorRegistry } from "../../../data/ws-floor_registry";
import type { FloorRegistryEntry } from "../../../data/floor_registry";
import { subscribeLabelRegistry } from "../../../data/label/label_registry";
import type { HomeAssistant } from "../../../types";
import type { MetadataSuggestionDomain } from "./suggest-metadata-ai";

export type Categories = Record<string, string>;
export type Entities = Record<string, EntityRegistryEntry>;
export type Labels = Record<string, string>;
export type Floors = Record<string, FloorRegistryEntry>;
export type Areas = Record<string, AreaRegistryEntry>;

const tryCatchEmptyObject = <T>(promise: Promise<T>): Promise<T> =>
  promise.catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Error fetching data for suggestion: ", err);
    return {} as T;
  });

export const fetchCategories = (
  connection: HomeAssistant["connection"],
  domain: MetadataSuggestionDomain
): Promise<Categories> =>
  tryCatchEmptyObject<Categories>(
    fetchCategoryRegistry(connection, domain).then((cats) =>
      Object.fromEntries(cats.map((cat) => [cat.category_id, cat.name]))
    )
  );

export const fetchLabels = (
  connection: HomeAssistant["connection"]
): Promise<Labels> =>
  tryCatchEmptyObject<Labels>(
    subscribeOne(connection, subscribeLabelRegistry).then((labs) =>
      Object.fromEntries(labs.map((lab) => [lab.label_id, lab.name]))
    )
  );

export const fetchFloors = (
  connection: HomeAssistant["connection"]
): Promise<Floors> =>
  tryCatchEmptyObject<Floors>(
    subscribeOne(connection, subscribeFloorRegistry).then((floors) =>
      Object.fromEntries(floors.map((floor) => [floor.floor_id, floor]))
    )
  );

export const fetchAreas = (
  connection: HomeAssistant["connection"]
): Promise<Areas> =>
  tryCatchEmptyObject<Areas>(
    subscribeOne(connection, subscribeAreaRegistry).then((areas) =>
      Object.fromEntries(areas.map((area) => [area.area_id, area]))
    )
  );

export const fetchEntities = (
  connection: HomeAssistant["connection"]
): Promise<Entities> =>
  tryCatchEmptyObject<Entities>(
    subscribeOne(connection, subscribeEntityRegistry).then((ents) =>
      Object.fromEntries(ents.map((ent) => [ent.entity_id, ent]))
    )
  );

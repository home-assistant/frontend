import { arrayWith, arrayWithout } from "../common/array/array-with";

export interface DataTableFilter {
  value: DataTableFiltersValue;
  items: Set<string> | undefined;
}

export type DataTableFilters = Record<string, DataTableFilter>;

export interface FloorAreasFilterValue {
  floors?: string[];
  areas?: string[];
  no_area?: boolean;
}

/** Whether a floor of the floor and area filter is picked, partly or not. */
export type FloorSelection = "all" | "some" | "none";

/**
 * Whether a floor is picked. A picked floor stands for all its areas, so a
 * floor whose areas are all picked counts as picked too.
 */
export const floorSelection = (
  value: FloorAreasFilterValue | undefined,
  floorId: string,
  areaIds: readonly string[]
): FloorSelection => {
  if (value?.floors?.includes(floorId)) {
    return "all";
  }
  const picked = areaIds.filter((id) => value?.areas?.includes(id)).length;
  if (!picked) {
    return "none";
  }
  return picked === areaIds.length ? "all" : "some";
};

/**
 * The floor and area filter after a floor or area is ticked or unticked.
 *
 * A ticked floor stands for all its areas, so ticking a floor drops its areas
 * from the list. Unticking one area of a ticked floor keeps its other areas,
 * and ticking the last area of a floor picks the floor instead.
 *
 * @param floorAreas - The area ids of each floor, by floor id
 */
export const toggleFloorArea = (
  value: FloorAreasFilterValue | undefined,
  floorAreas: Readonly<Record<string, readonly string[]>>,
  type: "floors" | "areas",
  id: string,
  selected: boolean
): FloorAreasFilterValue => {
  let floors = value?.floors ?? [];
  let areas = value?.areas ?? [];

  if (type === "floors") {
    const floorAreaIds = floorAreas[id] ?? [];
    areas = areas.filter((areaId) => !floorAreaIds.includes(areaId));
    floors = selected ? arrayWith(floors, id) : arrayWithout(floors, id);
    return { ...value, floors, areas };
  }

  const floorId = Object.keys(floorAreas).find((floor) =>
    floorAreas[floor].includes(id)
  );
  const siblings = floorId ? floorAreas[floorId] : [];

  if (selected) {
    areas = arrayWith(areas, id);
    if (floorId && siblings.every((areaId) => areas.includes(areaId))) {
      floors = arrayWith(floors, floorId);
      areas = areas.filter((areaId) => !siblings.includes(areaId));
    }
  } else if (floorId && floors.includes(floorId)) {
    // Older values can list the floor and some of its areas, so drop the
    // floor's areas before adding all of them but the unticked one.
    floors = arrayWithout(floors, floorId);
    areas = [
      ...areas.filter((areaId) => !siblings.includes(areaId)),
      ...siblings.filter((areaId) => areaId !== id),
    ];
  } else {
    areas = arrayWithout(areas, id);
  }

  return { ...value, floors, areas };
};

/** What a floor and area filter looks up to find its items. */
export interface FloorAreaLookups {
  areas: string[];
  floors: string[];
}

/**
 * The floors and areas to look up for a floor and area filter. A floor whose
 * areas are all picked counts as picked, so it matches the same as ticking the
 * floor. Its search also finds the automations and scripts that target the
 * floor itself. Areas picked without their whole floor are looked up on their
 * own.
 *
 * @param floorAreas - The area ids of each floor, by floor id
 */
export const floorAreaLookups = (
  value: FloorAreasFilterValue | undefined,
  floorAreas: Readonly<Record<string, readonly string[]>>
): FloorAreaLookups => {
  const pickedAreas = value?.areas ?? [];
  const floors = new Set(value?.floors ?? []);
  for (const [floorId, areaIds] of Object.entries(floorAreas)) {
    if (areaIds.length && areaIds.every((id) => pickedAreas.includes(id))) {
      floors.add(floorId);
    }
  }
  const inFloors = new Set(
    [...floors].flatMap((floorId) => floorAreas[floorId] ?? [])
  );
  return {
    areas: pickedAreas.filter((areaId) => !inFloors.has(areaId)),
    floors: [...floors],
  };
};

export type DataTableFiltersValue =
  | string[]
  | Record<"key" | string, string[]>
  | FloorAreasFilterValue
  | undefined;

export type DataTableFiltersValues = Record<string, DataTableFiltersValue>;

export type DataTableFiltersItems = Record<string, Set<string> | undefined>;

export const serializeFilters = (value: DataTableFilters) => {
  const serializedValue = {};
  Object.entries(value).forEach(([key, val]) => {
    serializedValue[key] = {
      value: val.value,
      items: val.items instanceof Set ? Array.from(val.items) : val.items,
    };
  });
  return serializedValue;
};

export const deserializeFilters = (value: DataTableFilters) => {
  const deserializedValue = {};
  Object.entries(value).forEach(([key, val]) => {
    deserializedValue[key] = {
      value: val.value,
      items: Array.isArray(val.items) ? new Set(val.items) : val.items,
    };
  });
  return deserializedValue;
};

// returns true when this filter has *selected* options and the filter's name
// equals the given filterName
export const isFilterUsed = (
  key: string,
  filter: DataTableFilter,
  filterName: string
): number | false => {
  const isUsed =
    key === filterName && Array.isArray(filter.value) && filter.value.length;
  return isUsed;
};

// returns true when this filter has *selected* options
// which has resulted in a list of items that match these selected opions
// (this list can be empty),
// and the filter's name equals (one of) the given filterName(s)
export const isRelatedItemsFilterUsed = (
  key: string,
  filter: DataTableFilter,
  filterName: string | string[]
) => {
  const isUsed =
    (key === filterName || filterName.includes(key)) && filter.items;
  return isUsed;
};

/**
 * Whether an item with nothing assigned (no area, device, label, category or
 * assistant) passes the filters: only a "No area" selection keeps it, any
 * selected id leaves it out.
 */
export const filtersMatchUnassignedItem = (
  filters: DataTableFiltersValues
): boolean =>
  Object.values(filters).every((value) => {
    if (!value) {
      return true;
    }
    if (Array.isArray(value)) {
      return !value.length;
    }
    if ((value as FloorAreasFilterValue).no_area) {
      return true;
    }
    return Object.values(value).every(
      (selected) => !Array.isArray(selected) || !selected.length
    );
  });

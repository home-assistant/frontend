import type {
  DataTableFiltersValue,
  FloorAreasFilterValue,
  ListFilterValue,
} from "../../data/data_table_filters";
import { listFilterValue } from "../../data/data_table_filters";

// Params shared by the filters of the config tables for the items without an
// area, device, label or category, like `no_label=1`.

const floorAreasValue = (
  value: DataTableFiltersValue
): FloorAreasFilterValue | undefined =>
  value && !Array.isArray(value) ? (value as FloorAreasFilterValue) : undefined;

/** The params of the floor and area filter. */
export const floorAreasFilterParams = (value: DataTableFiltersValue) => {
  const floorAreas = floorAreasValue(value);
  return {
    floor: floorAreas?.floors,
    area: floorAreas?.areas,
    no_area: floorAreas?.no_area,
  };
};

/** The ids a list filter has selected, for its list param. */
export const listFilterIds = (
  value: DataTableFiltersValue
): string[] | undefined => listFilterValue(value)?.ids;

/** Whether a list filter shows the items that have none, for its `no_` param. */
export const listFilterNone = (value: DataTableFiltersValue): boolean =>
  !!listFilterValue(value)?.none;

/** The floor and area filter a link asks for. */
export const floorAreasFilterFromParams = (
  floors: string[],
  areas: string[],
  noArea: boolean | undefined
): FloorAreasFilterValue | undefined => {
  if (!floors.length && !areas.length && !noArea) {
    return undefined;
  }
  return {
    floors,
    areas,
    ...(noArea ? { no_area: true } : {}),
  };
};

/** A list filter a link asks for. */
export const listFilterFromParams = (
  ids: string[],
  none: boolean | undefined
): ListFilterValue | string[] | undefined =>
  // Without "No …" it's a plain list, as the filters send it
  none ? { ids, none: true } : ids;

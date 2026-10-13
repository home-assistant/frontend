import { getDeviceAreaId } from "../../common/entity/context/get_device_context";
import type {
  ExtractFromTargetResultReferenced,
  TargetType,
} from "../../data/target";
import type { HomeAssistant } from "../../types";

export interface TargetSubRows {
  nextType: TargetType;
  rows: string[];
  rowEntries?: ExtractFromTargetResultReferenced[];
  deviceRows: string[];
  deviceRowEntries?: ExtractFromTargetResultReferenced[];
  entityRows: string[];
}

const emptyEntries = (): ExtractFromTargetResultReferenced => ({
  referenced_areas: [],
  referenced_devices: [],
  referenced_entities: [],
});

export const computeTargetSubRows = (
  type: TargetType,
  itemId: string,
  entries: ExtractFromTargetResultReferenced,
  entityRegistry: HomeAssistant["entities"],
  devices: HomeAssistant["devices"]
): TargetSubRows => {
  let nextType: TargetType =
    type === "floor" ? "area" : type === "area" ? "device" : "entity";

  if (type === "label") {
    if (entries.referenced_areas.length) {
      nextType = "area";
    } else if (entries.referenced_devices.length) {
      nextType = "device";
    }
  }

  const deviceOf = (entityId: string) => entityRegistry[entityId]?.device_id;
  const parentOf = (deviceId: string) => devices[deviceId]?.parent_device_id;
  // An entity belongs to a device row when it is on that device or on one of
  // its child devices, so the row can nest the children below it.
  const belongsTo = (entityId: string, deviceId: string) => {
    const entityDevice = deviceOf(entityId);
    return (
      entityDevice === deviceId ||
      (!!entityDevice && parentOf(entityDevice) === deviceId)
    );
  };
  const entitiesOf = (deviceId: string) =>
    entries.referenced_entities.filter((entityId) =>
      belongsTo(entityId, deviceId)
    );
  const rootsOf = (deviceIds: string[]) =>
    deviceIds.filter((deviceId) => {
      const parentId = parentOf(deviceId);
      return !parentId || !deviceIds.includes(parentId);
    });

  const childDevices =
    type === "device"
      ? [
          ...new Set(
            entries.referenced_entities
              .map(deviceOf)
              .filter(
                (deviceId): deviceId is string =>
                  !!deviceId &&
                  deviceId !== itemId &&
                  parentOf(deviceId) === itemId
              )
          ),
        ]
      : [];

  const rows =
    nextType === "area"
      ? entries.referenced_areas
      : nextType === "device" && type !== "label"
        ? rootsOf(entries.referenced_devices)
        : type === "device"
          ? entries.referenced_entities.filter(
              (entityId) => !childDevices.includes(deviceOf(entityId) || "")
            )
          : type !== "label"
            ? entries.referenced_entities
            : [];

  const devicesInAreas: string[] = [];

  const rowEntries =
    nextType === "entity"
      ? undefined
      : rows.map((rowItem) => {
          const nextEntries = emptyEntries();

          if (nextType === "area") {
            const areaDevices = entries.referenced_devices.filter(
              (deviceId) => {
                const device = devices[deviceId];
                return (
                  !!device &&
                  getDeviceAreaId(device, devices) === rowItem &&
                  entries.referenced_entities.some((entityId) =>
                    belongsTo(entityId, deviceId)
                  )
                );
              }
            );

            devicesInAreas.push(...areaDevices);

            nextEntries.referenced_devices = rootsOf(areaDevices);
            nextEntries.referenced_entities =
              entries.referenced_entities.filter((entityId) => {
                const entity = entityRegistry[entityId];
                if (!entity) {
                  return false;
                }
                return (
                  entity.area_id === rowItem ||
                  !entity.device_id ||
                  areaDevices.includes(entity.device_id)
                );
              });

            return nextEntries;
          }

          nextEntries.referenced_entities = entitiesOf(rowItem);

          return nextEntries;
        });

  const entityRows =
    type === "label"
      ? entries.referenced_entities.filter((entityId) => {
          const entity = entityRegistry[entityId];
          if (!entity) {
            return false;
          }
          return (
            entity.labels.includes(itemId) &&
            !entries.referenced_devices.includes(entity.device_id || "")
          );
        })
      : nextType === "device"
        ? entries.referenced_entities.filter(
            (entityId) => entityRegistry[entityId]?.area_id === itemId
          )
        : [];

  const deviceRows =
    type === "label"
      ? rootsOf(
          entries.referenced_devices.filter(
            (deviceId) =>
              !devicesInAreas.includes(deviceId) &&
              devices[deviceId]?.labels.includes(itemId)
          )
        )
      : childDevices;

  const deviceRowEntries = deviceRows.length
    ? deviceRows.map((deviceId) => ({
        ...emptyEntries(),
        referenced_entities: entitiesOf(deviceId),
      }))
    : undefined;

  return {
    nextType,
    rows,
    rowEntries,
    deviceRows,
    deviceRowEntries,
    entityRows,
  };
};

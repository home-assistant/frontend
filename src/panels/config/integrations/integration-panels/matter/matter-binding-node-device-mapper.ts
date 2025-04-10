import type { HomeAssistant } from "../../../../../types";

export class MatterDeviceMapper {
  private nodeDeviceMap = new Map<string, string>();

  private deviceNodeMap = new Map<string, string>();

  constructor(hass: HomeAssistant) {
    if (!hass.devices) return;

    for (const device of Object.values(hass.devices)) {
      if (!device.identifiers) continue;

      for (const identifier of device.identifiers) {
        if (identifier[0] === "matter") {
          const nodeId = String(parseInt(identifier[1].split("-")[1], 16));
          this.nodeDeviceMap.set(nodeId, device.id);
          this.deviceNodeMap.set(device.id, nodeId);
        }
      }
    }
  }

  getDeviceIdByNodeId(nodeId: string): string | undefined {
    return this.nodeDeviceMap.get(nodeId);
  }

  getNodeIdByDeviceId(deviceId: string): string | undefined {
    return this.deviceNodeMap.get(deviceId);
  }
}

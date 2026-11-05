import type {
  LoRaWANConnection,
  LoRaWANDevice,
  LoRaWANDevices,
  LoRaWANReception,
} from "../../../../../data/lorawan";

export type LoRaWANTopologyNode =
  | { id: string; kind: "connection"; connection: LoRaWANConnection }
  | {
      id: string;
      kind: "gateway";
      connection: LoRaWANConnection;
      gateway_id: string;
    }
  | {
      id: string;
      kind: "device";
      connection: LoRaWANConnection;
      device: LoRaWANDevice;
    };

export interface LoRaWANTopologyLink {
  source: string;
  target: string;
  kind: "membership" | "reception" | "unobserved";
  reception?: LoRaWANReception;
  device?: LoRaWANDevice;
}

export interface LoRaWANTopology {
  nodes: LoRaWANTopologyNode[];
  links: LoRaWANTopologyLink[];
}

export const buildLoRaWANTopology = (
  snapshot: LoRaWANDevices
): LoRaWANTopology => {
  const nodes: LoRaWANTopologyNode[] = [];
  const links: LoRaWANTopologyLink[] = [];
  const gateways = new Set<string>();
  for (const connection of snapshot.connections) {
    nodes.push({
      id: `connection:${connection.entry_id}`,
      kind: "connection",
      connection,
    });
  }
  for (const device of snapshot.devices) {
    const connection = device.connection;
    const connectionId = `connection:${connection.entry_id}`;
    const deviceId = `device:${connection.entry_id}:${device.dev_eui}`;
    nodes.push({ id: deviceId, kind: "device", connection, device });
    const receptions = device.receptions.filter(
      (reception) => reception.gateway_id
    );
    for (const reception of receptions) {
      const gatewayId = `gateway:${connection.entry_id}:${reception.gateway_id}`;
      if (!gateways.has(gatewayId)) {
        gateways.add(gatewayId);
        nodes.push({
          id: gatewayId,
          kind: "gateway",
          connection,
          gateway_id: reception.gateway_id,
        });
        links.push({
          source: connectionId,
          target: gatewayId,
          kind: "membership",
        });
      }
      links.push({
        source: gatewayId,
        target: deviceId,
        kind: "reception",
        reception,
        device,
      });
    }
    if (!receptions.length) {
      links.push({
        source: connectionId,
        target: deviceId,
        kind: "unobserved",
        device,
      });
    }
  }
  return { nodes, links };
};

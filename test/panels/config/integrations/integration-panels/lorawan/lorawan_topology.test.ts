import { describe, expect, it } from "vitest";
import type {
  LoRaWANConnection,
  LoRaWANDevice,
} from "../../../../../../src/data/lorawan";
import { buildLoRaWANTopology } from "../../../../../../src/panels/config/integrations/integration-panels/lorawan/lorawan_topology";

const connection: LoRaWANConnection = {
  entry_id: "home",
  domain: "chirpstack",
  title: "Home",
  configuration_url: null,
};
const device = (overrides: Partial<LoRaWANDevice> = {}): LoRaWANDevice => ({
  dev_eui: "0000000000000001",
  name: "Greenhouse",
  manufacturer: "Seeed Studio",
  model: "S2101",
  application_id: "home",
  device_id: null,
  connection,
  support: "integration_not_configured",
  last_uplink: "2026-10-16T12:00:00Z",
  last_join: null,
  last_status: null,
  receptions: [],
  battery_level: null,
  external_power_source: null,
  downlink_margin: null,
  ...overrides,
});

describe("buildLoRaWANTopology", () => {
  it("retains every gateway reception with its own signal and observation", () => {
    const sensor = device({
      receptions: [
        { gateway_id: "indoor", rssi: -61, snr: 4 },
        { gateway_id: "roof", rssi: -98, snr: 12 },
      ],
    });
    const topology = buildLoRaWANTopology({
      connections: [connection],
      devices: [sensor],
    });
    expect(
      topology.nodes.filter((node) => node.kind === "gateway")
    ).toHaveLength(2);
    expect(
      topology.nodes.filter((node) => node.kind === "device")
    ).toHaveLength(1);
    const links = topology.links.filter((link) => link.kind === "reception");
    expect(links.map((link) => link.reception)).toEqual(sensor.receptions);
    expect(links.every((link) => link.device === sensor)).toBe(true);
  });

  it("shares a gateway between devices on one connection", () => {
    const receptions = [{ gateway_id: "indoor", rssi: -61, snr: 4 }];
    const topology = buildLoRaWANTopology({
      connections: [connection],
      devices: [
        device({ receptions }),
        device({ dev_eui: "0000000000000002", receptions }),
      ],
    });
    expect(
      topology.nodes.filter((node) => node.kind === "gateway")
    ).toHaveLength(1);
    expect(
      topology.links.filter((link) => link.kind === "membership")
    ).toHaveLength(1);
    expect(
      topology.links.filter((link) => link.kind === "reception")
    ).toHaveLength(2);
  });

  it("keeps matching device and gateway IDs on different connections separate", () => {
    const second = { ...connection, entry_id: "garden" };
    const receptions = [{ gateway_id: "indoor", rssi: -61, snr: 4 }];
    const topology = buildLoRaWANTopology({
      connections: [connection, second],
      devices: [
        device({ receptions }),
        device({ connection: second, receptions }),
      ],
    });
    expect(new Set(topology.nodes.map((node) => node.id)).size).toBe(6);
    expect(
      topology.links.find((link) => link.source === "gateway:garden:indoor")
        ?.target
    ).toBe("device:garden:0000000000000001");
  });

  it("keeps empty connections and unobserved devices without inventing gateways", () => {
    const empty = { ...connection, entry_id: "empty" };
    const topology = buildLoRaWANTopology({
      connections: [connection, empty],
      devices: [
        device({ last_uplink: null }),
        device({
          dev_eui: "0000000000000002",
          receptions: [{ gateway_id: "", rssi: -70, snr: 6 }],
        }),
      ],
    });
    expect(
      topology.nodes.filter((node) => node.kind === "connection")
    ).toHaveLength(2);
    expect(
      topology.nodes.filter((node) => node.kind === "gateway")
    ).toHaveLength(0);
    expect(
      topology.links.every(
        (link) =>
          link.kind === "unobserved" && link.source === "connection:home"
      )
    ).toBe(true);
  });
});

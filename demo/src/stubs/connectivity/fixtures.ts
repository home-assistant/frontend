import { bluetoothFixtures } from "./bluetooth/fixtures";
import { infraredFixtures } from "./infrared/fixtures";
import { matterFixtures } from "./matter/fixtures";
import { modbusFixtures } from "./modbus/fixtures";
import { mqttFixtures } from "./mqtt/fixtures";
import { radioFrequencyFixtures } from "./radio_frequency/fixtures";
import { serialFixtures } from "./serial/fixtures";
import { tagsFixtures } from "./tags/fixtures";
import { threadFixtures } from "./thread/fixtures";
import type { ConnectivityFixtures } from "./types";
import { zhaFixtures } from "./zha/fixtures";
import { zwaveJsFixtures } from "./zwave_js/fixtures";

// Every integration reachable from Settings > Connectivity that has frontend
// data to mock. Each owns its own fixtures, so they can be added and removed
// one at a time.
const INTEGRATIONS: ConnectivityFixtures[] = [
  bluetoothFixtures,
  serialFixtures,
  modbusFixtures,
  mqttFixtures,
  matterFixtures,
  infraredFixtures,
  zwaveJsFixtures,
  zhaFixtures,
  radioFrequencyFixtures,
  tagsFixtures,
  threadFixtures,
];

const collect = <T>(
  pick: (fixtures: ConnectivityFixtures) => T[] | undefined
) => INTEGRATIONS.flatMap((fixtures) => pick(fixtures) ?? []);

export const connectivityComponents = collect((f) => f.components);

export const connectivityCommands = collect((f) => f.commands);

export const connectivityConfigEntries = collect((f) => f.configEntries);

export const connectivityManifests = collect((f) => f.manifests);

export const connectivityDevices = collect((f) => f.devices);

export const connectivityEntityRegistryEntries = collect(
  (f) => f.entityRegistryEntries
);

export const connectivityEntities = () =>
  INTEGRATIONS.flatMap((fixtures) => fixtures.entities?.() ?? []);

/** Backend translation resources, merged per category. */
export const connectivityBackendTranslations = INTEGRATIONS.reduce<
  Record<string, Record<string, string>>
>((resources, fixtures) => {
  for (const [category, keys] of Object.entries(
    fixtures.backendTranslations ?? {}
  )) {
    resources[category] = { ...resources[category], ...keys };
  }
  return resources;
}, {});

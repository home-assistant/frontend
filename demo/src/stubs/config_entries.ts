import type {
  ConfigEntry,
  ConfigEntryUpdate,
} from "../../../src/data/config_entries";
import type { ConfigFlowInProgressMessage } from "../../../src/data/config_flow";
import type { IntegrationType } from "../../../src/data/integration";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const baseEntry = {
  source: "user",
  state: "loaded" as const,
  supports_options: false,
  supports_remove_device: false,
  supports_unload: true,
  supports_reconfigure: true,
  supported_subentry_types: {},
  num_subentries: 0,
  pref_disable_new_entities: false,
  pref_disable_polling: false,
  disabled_by: null,
  reason: null,
  error_reason_translation_key: null,
  error_reason_translation_placeholders: null,
};

// Each entry is tagged with its integration type so we can honor the
// `type_filter` that the integrations and helpers panels subscribe with.
export const demoConfigEntries: {
  entry: ConfigEntry;
  type: IntegrationType;
}[] = [
  {
    type: "service",
    entry: {
      ...baseEntry,
      entry_id: "co2signal",
      domain: "co2signal",
      title: "Electricity Maps",
    },
  },
  {
    type: "hub",
    entry: {
      ...baseEntry,
      entry_id: "mock-hue",
      domain: "hue",
      title: "Philips Hue",
      source: "zeroconf",
      supports_options: true,
      supports_remove_device: true,
    },
  },
  {
    type: "hub",
    entry: {
      ...baseEntry,
      entry_id: "mock-sonos",
      domain: "sonos",
      title: "Sonos",
      source: "zeroconf",
      supports_options: true,
    },
  },
  {
    type: "service",
    entry: {
      ...baseEntry,
      entry_id: "mock-met",
      domain: "met",
      title: "Forecast.Home",
    },
  },
  {
    type: "helper",
    entry: {
      ...baseEntry,
      entry_id: "mock-template-helper",
      domain: "template",
      title: "Comfort level",
    },
  },
];

const filterEntries = (typeFilter?: IntegrationType[]): ConfigEntry[] =>
  demoConfigEntries
    .filter((e) => !typeFilter || typeFilter.includes(e.type))
    .map((e) => e.entry);

export const mockConfigEntries = (hass: MockHomeAssistant) => {
  hass.mockWS(
    "config_entries/get",
    (msg: { type_filter?: IntegrationType[] }) => filterEntries(msg.type_filter)
  );

  hass.mockWS(
    "config_entries/subscribe",
    (
      msg: { type_filter?: IntegrationType[] },
      _hass,
      onChange?: (updates: ConfigEntryUpdate[]) => void
    ) => {
      onChange?.(
        filterEntries(msg.type_filter).map((entry) => ({ type: null, entry }))
      );
      return () => undefined;
    }
  );

  hass.mockWS(
    "config_entries/flow/subscribe",
    (
      _msg,
      _hass,
      onChange?: (updates: ConfigFlowInProgressMessage[]) => void
    ) => {
      onChange?.([]);
      return () => undefined;
    }
  );
};

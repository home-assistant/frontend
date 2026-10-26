import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { mockConfigEntries } from "../../../../demo/src/stubs/config_entries";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockHassioSupervisor } from "../../../../demo/src/stubs/hassio_supervisor";
import { ensureArray } from "../../../../src/common/array/ensure-array";
import type { HASSDomEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-selector/ha-selector";
import "../../../../src/components/ha-settings-row";
import type { AreaRegistryEntry } from "../../../../src/data/area/area_registry";
import type { DeviceRegistryEntry } from "../../../../src/data/device/device_registry";
import type { EntityRegistryDisplayEntry } from "../../../../src/data/entity/entity_registry";
import type { Selector } from "../../../../src/data/selector";
import {
  showDialog,
  type ShowDialogParams,
} from "../../../../src/dialogs/make-dialog-manager";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { ProvideHassElement } from "../../../../src/mixins/provide-hass-lit-mixin";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/demo-black-white-row";

const device = (
  id: string,
  name: string,
  areaId: string,
  parentDeviceId: string | null = null
): DeviceRegistryEntry => ({
  area_id: areaId,
  configuration_url: null,
  config_entries: [],
  config_entries_subentries: {},
  connections: [],
  disabled_by: null,
  entry_type: null,
  id,
  identifiers: [["demo", id] as [string, string]],
  manufacturer: null,
  model: null,
  model_id: null,
  name_by_user: null,
  name,
  sw_version: null,
  hw_version: null,
  via_device_id: null,
  serial_number: null,
  labels: [],
  created_at: 0,
  modified_at: 0,
  primary_config_entry: null,
  parent_device_id: parentDeviceId,
});

// A power strip in the backyard with two outlets as child devices, and a lamp
// in the bedroom.
const DEVICES: DeviceRegistryEntry[] = [
  device("power_strip", "Power strip", "backyard"),
  device("outlet_1", "Outlet 1", "backyard", "power_strip"),
  device("outlet_2", "Outlet 2", "backyard", "power_strip"),
  device("bedroom_lamp", "Bedroom lamp", "bedroom"),
];

const ENTITY_REGISTRY: Record<string, EntityRegistryDisplayEntry> = {
  "switch.outlet_1": {
    entity_id: "switch.outlet_1",
    name: "Outlet 1",
    device_id: "outlet_1",
    platform: "demo",
    labels: [],
  },
  "switch.outlet_2": {
    entity_id: "switch.outlet_2",
    name: "Outlet 2",
    device_id: "outlet_2",
    platform: "demo",
    labels: [],
  },
  "light.bedroom_lamp": {
    entity_id: "light.bedroom_lamp",
    name: "Bedroom lamp",
    device_id: "bedroom_lamp",
    platform: "demo",
    labels: [],
  },
  "light.bedside": {
    entity_id: "light.bedside",
    name: "Bedside light",
    area_id: "bedroom",
    platform: "demo",
    labels: [],
  },
  "light.night_light": {
    entity_id: "light.night_light",
    name: "Night light",
    area_id: "bedroom",
    platform: "demo",
    labels: [],
  },
};

const ENTITIES = Object.values(ENTITY_REGISTRY).map((entity) => ({
  entity_id: entity.entity_id,
  state: entity.entity_id.startsWith("light.") ? "on" : "off",
  attributes: { friendly_name: entity.name },
}));

const area = (areaId: string, name: string): AreaRegistryEntry => ({
  area_id: areaId,
  floor_id: null,
  name,
  icon: null,
  picture: null,
  aliases: [],
  labels: [],
  temperature_entity_id: null,
  humidity_entity_id: null,
  created_at: 0,
  modified_at: 0,
});

const AREAS: AreaRegistryEntry[] = [
  area("backyard", "Backyard"),
  area("bedroom", "Bedroom"),
];

// Resolves a target against the demo registries, like core's
// extract_from_target does: a device includes its child devices, and an area
// its devices and entities.
const extractFromTarget = ({ target }: { target: HassServiceTarget }) => {
  const ids = (key: keyof HassServiceTarget): string[] =>
    target[key] ? ensureArray(target[key]) : [];
  const areaIds = ids("area_id").filter((id) =>
    AREAS.some((a) => a.area_id === id)
  );
  const deviceIds = new Set([
    ...ids("device_id").filter((id) => DEVICES.some((d) => d.id === id)),
    ...DEVICES.filter((d) => d.area_id && areaIds.includes(d.area_id)).map(
      (d) => d.id
    ),
  ]);
  DEVICES.forEach((d) => {
    if (d.parent_device_id && deviceIds.has(d.parent_device_id)) {
      deviceIds.add(d.id);
    }
  });
  const entityIds = new Set(ids("entity_id"));
  Object.values(ENTITY_REGISTRY).forEach((entity) => {
    if (
      (entity.device_id && deviceIds.has(entity.device_id)) ||
      (entity.area_id && areaIds.includes(entity.area_id))
    ) {
      entityIds.add(entity.entity_id);
    }
  });
  return {
    referenced_entities: [...entityIds],
    referenced_devices: [...deviceIds],
    referenced_areas: areaIds,
    missing_areas: [],
    missing_devices: [],
    missing_floors: [],
    missing_labels: [],
  };
};

interface Sample {
  name: string;
  description: string;
  selector: Selector;
  value: unknown;
}

const SAMPLES: Sample[] = [
  {
    name: "Target with exclusions",
    description:
      "Each target lists what is excluded from it. An exclusion of an area that no longer exists has no effect and is listed apart.",
    selector: { target: {} },
    value: {
      area_id: ["bedroom", "backyard"],
      exclude: {
        entity_id: ["light.night_light"],
        device_id: ["outlet_2"],
        area_id: ["deleted_area"],
      },
    },
  },
  {
    name: "Target without exclusions",
    description:
      "Exclude offers what the power strip includes, so its outlets can be excluded on their own.",
    selector: { target: {} },
    value: { device_id: ["power_strip"] },
  },
];

@customElement("demo-components-ha-target-picker-exclusions")
class DemoHaTargetPickerExclusions
  extends LitElement
  implements ProvideHassElement
{
  @state() public hass!: HomeAssistant;

  @state() private _values = SAMPLES.map((sample) => sample.value);

  constructor() {
    super();
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("config", "en");
    hass.addEntities(ENTITIES);
    mockEntityRegistry(hass);
    mockDeviceRegistry(hass, DEVICES);
    mockConfigEntries(hass);
    mockHassioSupervisor(hass);
    // Set the areas and entity registry directly, typed against the real
    // registry types, instead of the demo stubs whose types differ.
    const areas: Record<string, AreaRegistryEntry> = {};
    AREAS.forEach((a) => {
      areas[a.area_id] = a;
    });
    hass.updateHass({ areas, entities: ENTITY_REGISTRY });
    hass.mockWS("config/device_registry/list_composite_splits", () => ({}));
    hass.mockWS("extract_from_target", extractFromTarget);
    hass.mockWS("auth/sign_path", (params) => params);
  }

  public provideHass(el) {
    el.hass = this.hass;
  }

  public connectedCallback() {
    super.connectedCallback();
    this.addEventListener("show-dialog", this._dialogManager);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("show-dialog", this._dialogManager);
  }

  private _dialogManager = (e: HASSDomEvent<ShowDialogParams<unknown>>) => {
    const { dialogTag, dialogImport, dialogParams, addHistory, parentElement } =
      e.detail;
    showDialog(
      this,
      dialogTag,
      dialogParams,
      dialogImport,
      parentElement,
      addHistory
    );
  };

  protected render(): TemplateResult {
    return html`
      ${SAMPLES.map(
        (sample, idx) => html`
          <demo-black-white-row .title=${sample.name}>
            ${["light", "dark"].map(
              (slot) => html`
                <ha-settings-row narrow slot=${slot}>
                  <span slot="heading">${sample.name}</span>
                  <span slot="description">${sample.description}</span>
                  <ha-selector
                    .hass=${this.hass}
                    .selector=${sample.selector}
                    .value=${this._values[idx]}
                    .sampleIdx=${idx}
                    @value-changed=${this._handleValueChanged}
                  ></ha-selector>
                </ha-settings-row>
              `
            )}
          </demo-black-white-row>
        `
      )}
    `;
  }

  private _handleValueChanged(ev) {
    const idx = ev.target.sampleIdx;
    this._values = this._values.map((value, i) =>
      i === idx ? ev.detail.value : value
    );
  }

  static styles = css`
    ha-settings-row {
      --settings-row-content-width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-target-picker-exclusions": DemoHaTargetPickerExclusions;
  }
}

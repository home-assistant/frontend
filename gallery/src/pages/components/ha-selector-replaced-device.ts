import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { mockConfigEntries } from "../../../../demo/src/stubs/config_entries";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockHassioSupervisor } from "../../../../demo/src/stubs/hassio_supervisor";
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

// The composite device "old_composite" is intentionally NOT in the registry:
// it was split into "device_light" and "device_switch". References to the old
// id (targets, device selectors) should surface a "replaced" state.
const DEVICES: DeviceRegistryEntry[] = [
  {
    area_id: "bedroom",
    configuration_url: null,
    config_entries: ["config_entry_light"],
    config_entries_subentries: {},
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_light",
    identifiers: [["demo", "light"] as [string, string]],
    manufacturer: null,
    model: null,
    model_id: null,
    name_by_user: null,
    name: "Living room lamp",
    sw_version: null,
    hw_version: null,
    via_device_id: null,
    serial_number: null,
    labels: [],
    created_at: 0,
    modified_at: 0,
    primary_config_entry: null,
    parent_device_id: null,
  },
  {
    area_id: "backyard",
    configuration_url: null,
    config_entries: ["config_entry_switch"],
    config_entries_subentries: {},
    connections: [],
    disabled_by: null,
    entry_type: null,
    id: "device_switch",
    identifiers: [["demo", "switch"] as [string, string]],
    manufacturer: null,
    model: null,
    model_id: null,
    name_by_user: null,
    name: "Garden socket",
    sw_version: null,
    hw_version: null,
    via_device_id: null,
    serial_number: null,
    labels: [],
    created_at: 0,
    modified_at: 0,
    primary_config_entry: null,
    parent_device_id: null,
  },
];

const ENTITIES = [
  {
    entity_id: "light.living_room_lamp",
    state: "on",
    attributes: { friendly_name: "Living room lamp" },
  },
  {
    entity_id: "switch.garden_socket",
    state: "off",
    attributes: { friendly_name: "Garden socket" },
  },
];

// Registry display entries link the demo entities to the split devices so the
// pickers can filter split candidates by domain.
const ENTITY_REGISTRY: Record<string, EntityRegistryDisplayEntry> = {
  "light.living_room_lamp": {
    entity_id: "light.living_room_lamp",
    name: "Living room lamp",
    device_id: "device_light",
    area_id: "bedroom",
    platform: "demo",
    labels: [],
  },
  "switch.garden_socket": {
    entity_id: "switch.garden_socket",
    name: "Garden socket",
    device_id: "device_switch",
    area_id: "backyard",
    platform: "demo",
    labels: [],
  },
};

const AREAS: AreaRegistryEntry[] = [
  {
    area_id: "backyard",
    floor_id: null,
    name: "Backyard",
    icon: null,
    picture: null,
    aliases: [],
    labels: [],
    temperature_entity_id: null,
    humidity_entity_id: null,
    created_at: 0,
    modified_at: 0,
  },
  {
    area_id: "bedroom",
    floor_id: null,
    name: "Bedroom",
    icon: "mdi:bed",
    picture: null,
    aliases: [],
    labels: [],
    temperature_entity_id: null,
    humidity_entity_id: null,
    created_at: 0,
    modified_at: 0,
  },
];

// Maps the removed composite device to the devices that replaced it.
const COMPOSITE_SPLITS = {
  old_composite: {
    split_ids: ["device_light", "device_switch"],
    primary_id: "device_light",
  },
};

interface Sample {
  name: string;
  description: string;
  selector: Selector;
  value: unknown;
}

const SAMPLES: Sample[] = [
  {
    name: "Target",
    description:
      "Migrate adds every replacement device that matches the target filters (here both).",
    selector: { target: {} },
    value: { device_id: ["old_composite"] },
  },
  {
    name: "Device (unfiltered, multiple matches)",
    description:
      "Both replacement devices qualify, so Replace opens a dialog to pick one.",
    selector: { device: {} },
    value: "old_composite",
  },
  {
    name: "Device (filtered to lights, single match)",
    description:
      "Only the light device passes the filter, so Replace swaps to it in one click.",
    selector: { device: { entity: [{ domain: "light" }] } },
    value: "old_composite",
  },
  {
    name: "Device (multiple)",
    description: "Each slot resolves independently to a matching replacement.",
    selector: { device: { multiple: true } },
    value: ["old_composite"],
  },
];

@customElement("demo-components-ha-selector-replaced-device")
class DemoHaSelectorReplacedDevice
  extends LitElement
  implements ProvideHassElement
{
  @state() public hass!: HomeAssistant;

  private _values = SAMPLES.map((sample) => sample.value);

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
    // Provide the demo areas and link the demo entities to the split devices.
    // Set them directly via updateHass (typed against the real registry types)
    // instead of the area stub, whose demo-specific type differs.
    const areas: Record<string, AreaRegistryEntry> = {};
    AREAS.forEach((area) => {
      areas[area.area_id] = area;
    });
    hass.updateHass({ areas, entities: ENTITY_REGISTRY });
    hass.mockWS(
      "config/device_registry/list_composite_splits",
      () => COMPOSITE_SPLITS
    );
    hass.mockWS("extract_from_target", () => ({
      referenced_entities: [],
      referenced_devices: [],
      referenced_areas: [],
    }));
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
    this._values[idx] = ev.detail.value;
    this.requestUpdate();
  }

  static styles = css`
    ha-settings-row {
      --settings-row-content-width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-selector-replaced-device": DemoHaSelectorReplacedDevice;
  }
}

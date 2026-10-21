// ponytail: TEMPORARY demo, do not commit. Delete this file and its hooks
// (`git checkout src` + remove this file) when done.
import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators";
import type { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import type { Brands } from "../../../data/integrations";
import type { HomeAssistant } from "../../../types";
import type { AddIntegrationDialogParams } from "./show-add-integration-dialog";
import { showAddIntegrationDialog } from "./show-add-integration-dialog";

interface DemoState {
  // Replaces what Home Assistant really discovered
  flows?: DataEntryFlowProgress[];
  // true: pretend Zigbee, Z-Wave and Matter are set up. false: none are.
  protocols?: boolean;
  // Force the phone layout
  narrow?: boolean;
  // Open browsing by category or by brand
  browseBy?: "category" | "brand";
}

export const addIntegrationDemo: DemoState = {};

// Fake integrations named to sort first, with every icon a card can end with
export const DEMO_INTEGRATIONS: Brands = {
  demo_all_icons_yaml: {
    name: "1 Demo: cloud, custom, YAML only",
    integration_type: "service",
    iot_class: "cloud_polling",
    config_flow: false,
    is_built_in: false,
  },
  demo_all_icons_overwrites: {
    name: "1 Demo: cloud, overwrites built-in, +",
    integration_type: "hub",
    iot_class: "cloud_push",
    config_flow: true,
    is_built_in: false,
    overwrites_built_in: true,
  },
  demo_all_icons_brand: {
    name: "1 Demo brand: custom, chevron",
    is_built_in: false,
    integrations: {
      demo_all_icons_yaml: {
        name: "1 Demo: cloud, custom, YAML only",
        integration_type: "service",
        iot_class: "cloud_polling",
        config_flow: false,
        is_built_in: false,
      },
      demo_all_icons_overwrites: {
        name: "1 Demo: cloud, overwrites built-in, +",
        integration_type: "hub",
        iot_class: "cloud_push",
        config_flow: true,
        is_built_in: false,
        overwrites_built_in: true,
      },
    },
  },
};

const flow = (
  handler: string,
  source: string,
  name: string,
  extra: Record<string, unknown> = {}
): DataEntryFlowProgress => ({
  flow_id: `demo_${handler}_${name}`,
  handler,
  step_id: "user",
  context: { source, title_placeholders: { name }, ...extra },
});

const FOUND = [
  flow("hue", "zeroconf", "Living room bridge"),
  flow("esphome", "esphome", "Kitchen voice satellite"),
  flow("sonos", "ssdp", "Bedroom speaker"),
  flow("homekit_controller", "zeroconf", "Eve Energy", {
    alternative_domain: "eve",
  }),
  flow("shelly", "zeroconf", "Shelly Plus 1PM hallway"),
  flow("shelly", "zeroconf", "Shelly Plug S desk"),
  flow("tplink", "dhcp", "Kasa smart plug"),
  flow("cast", "zeroconf", "Living room TV"),
  flow("ipp", "zeroconf", "Office printer"),
  flow("roku", "ssdp", "Roku Ultra"),
  flow("samsungtv", "ssdp", "Bedroom TV"),
  flow("wled", "zeroconf", "Kitchen LED strip"),
  flow("yeelight", "zeroconf", "Desk lamp"),
  flow("apple_tv", "zeroconf", "Apple TV"),
  flow("dlna_dmr", "ssdp", "Media renderer"),
  flow("unifi", "ssdp", "UniFi Dream Machine"),
  flow("esphome", "esphome", "Garage door sensor"),
  flow("esphome", "esphome", "Air quality monitor"),
  flow("bluetooth", "usb", "Bluetooth adapter"),
  flow("zha", "usb", "Zigbee coordinator"),
];

const SCENARIOS: {
  label: string;
  hint: string;
  demo: DemoState;
  params?: AddIntegrationDialogParams;
}[] = [
  {
    label: "1. Fresh install",
    hint: "Nothing found, no Zigbee/Z-Wave/Matter: only Browse",
    demo: { flows: [], protocols: false },
  },
  {
    label: "2. Everything",
    hint: "Discovered + Add a device + Browse, opens on discovered",
    demo: { flows: FOUND, protocols: true },
  },
  {
    label: "3. Protocols, nothing found",
    hint: "Add a device + Browse, opens on All brands",
    demo: { flows: [], protocols: true },
  },
  {
    label: "4. Phone layout",
    hint: "Browse pane full width; pick something to open it, back to return",
    demo: { flows: FOUND, protocols: true, narrow: true },
  },
  {
    label: "5. Phone, fresh install",
    hint: "Browse pane with only Browse",
    demo: { flows: [], protocols: false, narrow: true },
  },
  {
    label: "5b. Browse by category",
    hint: "Category tree on the left, a flat list",
    demo: { flows: FOUND, protocols: true, browseBy: "category" },
  },
  {
    label: "5c. Phone, browse by category",
    hint: "Category tree full width; pick one to open its list",
    demo: { flows: [], protocols: true, narrow: true, browseBy: "category" },
  },
  {
    label: "6. Opened on a category",
    hint: "category: ai_voice (falls back to All if it doesn't exist)",
    demo: { flows: FOUND, protocols: true },
    params: { category: "ai_voice" },
  },
  {
    label: "7. Search prefilled",
    hint: "initialFilter: zigbee",
    demo: { flows: FOUND, protocols: true },
    params: { initialFilter: "zigbee" },
  },
  {
    label: "8. Brand with many integrations",
    hint: "brand: philips, with a discovered Hue bridge",
    demo: { flows: FOUND, protocols: true },
    params: { brand: "philips" },
  },
  {
    label: "9. Integration already discovered",
    hint: "domain: hue → confirm discovered / set up another",
    demo: { flows: FOUND, protocols: true },
    params: { domain: "hue" },
  },
  {
    label: "10. Protocol picked",
    hint: "brand: zha → Add Zigbee device row",
    demo: { flows: [], protocols: true },
    params: { brand: "zha" },
  },
  {
    label: "11. From discovered card",
    hint: "brand: _discovered → all found + Manage link",
    demo: { flows: FOUND, protocols: true },
    params: { brand: "_discovered" },
  },
  {
    label: "12. ESPHome serial port",
    hint: "integrationFilter: zha, zwave_js → narrow, no categories",
    demo: { flows: FOUND, protocols: true },
    params: { integrationFilter: { domains: ["zha", "zwave_js"] } },
  },
];

@customElement("demo-add-integration-panel")
class DemoAddIntegrationPanel extends LitElement {
  @state() private _collapsed = false;

  protected render() {
    if (this._collapsed) {
      return html`<button class="toggle" @click=${this._toggle}>
        Add dialog demo
      </button>`;
    }
    return html`<div class="panel">
      <div class="head">
        <b>Add dialog demo</b>
        <button @click=${this._toggle}>–</button>
      </div>
      ${SCENARIOS.map(
        (scenario, index) =>
          html`<button
            class="scenario"
            .index=${index}
            title=${scenario.hint}
            @click=${this._open}
          >
            <span>${scenario.label}</span>
            <small>${scenario.hint}</small>
          </button>`
      )}
    </div>`;
  }

  private _toggle() {
    this._collapsed = !this._collapsed;
  }

  private async _open(ev: Event) {
    const scenario = SCENARIOS[(ev.currentTarget as any).index as number];
    Object.keys(addIntegrationDemo).forEach(
      (key) => delete addIntegrationDemo[key]
    );
    Object.assign(addIntegrationDemo, scenario.demo);
    const app = document.querySelector("home-assistant") as HTMLElement & {
      hass: HomeAssistant;
    };
    // The dialog's texts live in the config fragment, like the dashboard's
    // add device button loads them
    await app.hass.loadFragmentTranslation("config");
    showAddIntegrationDialog(app, scenario.params);
  }

  static styles = css`
    :host {
      position: fixed;
      right: 8px;
      bottom: 8px;
      z-index: 10000;
      font-family: var(--ha-font-family-body, sans-serif);
    }
    .panel {
      width: 260px;
      max-height: 80vh;
      overflow: auto;
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      padding: 8px;
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px;
    }
    button {
      font: inherit;
      color: inherit;
      cursor: pointer;
      background: none;
      border: none;
    }
    .toggle {
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      border-radius: 16px;
      padding: 8px 12px;
    }
    .scenario {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      text-align: start;
      padding: 6px 8px;
      border-radius: 8px;
    }
    .scenario:hover {
      background: var(--secondary-background-color);
    }
    small {
      color: var(--secondary-text-color);
    }
  `;
}

document.body.append(document.createElement("demo-add-integration-panel"));

declare global {
  interface HTMLElementTagNameMap {
    "demo-add-integration-panel": DemoAddIntegrationPanel;
  }
}

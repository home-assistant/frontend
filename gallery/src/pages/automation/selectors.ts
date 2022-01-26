/* eslint-disable lit/no-template-arrow */
import { LitElement, TemplateResult, html } from "lit";
import { customElement, state } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/demo-black-white-row";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockAreaRegistry } from "../../../../demo/src/stubs/area_registry";
import { mockHassioSupervisor } from "../../../../demo/src/stubs/hassio_supervisor";
import "../../../../src/panels/config/automation/trigger/ha-automation-trigger";
import { Selector } from "../../../../src/data/selector";
import "../../../../src/components/ha-selector/ha-selector";

const SCHEMAS: { name: string; selector: Selector }[] = [
  { name: "Addon", selector: { addon: {} } },

  { name: "Entity", selector: { entity: {} } },
  { name: "Device", selector: { device: {} } },
  { name: "Area", selector: { area: {} } },
  { name: "Target", selector: { target: {} } },
  {
    name: "Number",
    selector: {
      number: {
        min: 0,
        max: 10,
      },
    },
  },
  { name: "Boolean", selector: { boolean: {} } },
  { name: "Time", selector: { time: {} } },
  { name: "Action", selector: { action: {} } },
  { name: "Text", selector: { text: { multiline: false } } },
  { name: "Text Multiline", selector: { text: { multiline: true } } },
  { name: "Object", selector: { object: {} } },
  {
    name: "Select",
    selector: {
      select: {
        options: ["Everyone Home", "Some Home", "All gone"],
      },
    },
  },
];

@customElement("demo-automation-selectors")
class DemoHaSelector extends LitElement {
  @state() private hass!: HomeAssistant;

  private data: any = SCHEMAS.map(() => undefined);

  constructor() {
    super();
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("config", "en");
    mockEntityRegistry(hass);
    mockDeviceRegistry(hass);
    mockAreaRegistry(hass);
    mockHassioSupervisor(hass);
  }

  protected render(): TemplateResult {
    const valueChanged = (ev) => {
      const sampleIdx = ev.target.sampleIdx;
      this.data[sampleIdx] = ev.detail.value;
      this.requestUpdate();
    };
    return html`
      ${SCHEMAS.map(
        (info, sampleIdx) => html`
          <demo-black-white-row
            .title=${info.name}
            .value=${{ selector: info.selector, data: this.data[sampleIdx] }}
          >
            ${["light", "dark"].map(
              (slot) =>
                html`
                  <ha-selector
                    slot=${slot}
                    .hass=${this.hass}
                    .selector=${info.selector}
                    .label=${info.name}
                    .value=${this.data[sampleIdx]}
                    .sampleIdx=${sampleIdx}
                    @value-changed=${valueChanged}
                  ></ha-selector>
                `
            )}
          </demo-black-white-row>
        `
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-automation-selectors": DemoHaSelector;
  }
}

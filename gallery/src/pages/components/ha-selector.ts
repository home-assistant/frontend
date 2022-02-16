/* eslint-disable lit/no-template-arrow */
import "@material/mwc-button";
import { LitElement, TemplateResult, css, html } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-selector/ha-selector";
import "../../../../src/components/ha-settings-row";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/demo-black-white-row";
import { BlueprintInput } from "../../../../src/data/blueprint";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockAreaRegistry } from "../../../../demo/src/stubs/area_registry";
import { mockHassioSupervisor } from "../../../../demo/src/stubs/hassio_supervisor";

const SCHEMAS: {
  name: string;
  input: Record<string, BlueprintInput | null>;
}[] = [
  {
    name: "One of each",
    input: {
      entity: { name: "Entity", selector: { entity: {} } },
      attribute: {
        name: "Attribute",
        selector: { attribute: { entity_id: "" } },
      },
      device: { name: "Device", selector: { device: {} } },
      duration: { name: "Duration", selector: { duration: {} } },
      addon: { name: "Addon", selector: { addon: {} } },
      area: { name: "Area", selector: { area: {} } },
      target: { name: "Target", selector: { target: {} } },
      number_box: {
        name: "Number Box",
        selector: {
          number: {
            min: 0,
            max: 10,
            mode: "box",
          },
        },
      },
      number_slider: {
        name: "Number Slider",
        selector: {
          number: {
            min: 0,
            max: 10,
            mode: "slider",
          },
        },
      },
      boolean: { name: "Boolean", selector: { boolean: {} } },
      time: { name: "Time", selector: { time: {} } },
      action: { name: "Action", selector: { action: {} } },
      text: {
        name: "Text",
        selector: { text: {} },
      },
      password: {
        name: "Password",
        selector: { text: { type: "password" } },
      },
      text_multiline: {
        name: "Text multiline",
        selector: {
          text: { multiline: true },
        },
      },
      object: { name: "Object", selector: { object: {} } },
      select: {
        name: "Select",
        selector: { select: { options: ["Option 1", "Option 2"] } },
      },
      icon: { name: "Icon", selector: { icon: {} } },
      media: { name: "Media", selector: { media: {} } },
    },
  },
];

@customElement("demo-components-ha-selector")
class DemoHaSelector extends LitElement {
  @state() private hass!: HomeAssistant;

  private data = SCHEMAS.map(() => ({}));

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
    return html`
      ${SCHEMAS.map((info, idx) => {
        const data = this.data[idx];
        const valueChanged = (ev) => {
          this.data[idx] = {
            ...data,
            [ev.target.key]: ev.detail.value,
          };
          this.requestUpdate();
        };
        return html`
          <demo-black-white-row .title=${info.name} .value=${this.data[idx]}>
            ${["light", "dark"].map((slot) =>
              Object.entries(info.input).map(
                ([key, value]) =>
                  html`
                    <ha-settings-row narrow slot=${slot}>
                      <span slot="heading">${value?.name || key}</span>
                      <span slot="description">${value?.description}</span>
                      <ha-selector
                        .hass=${this.hass}
                        .selector=${value!.selector}
                        .key=${key}
                        .value=${data[key] ?? value!.default}
                        @value-changed=${valueChanged}
                      ></ha-selector>
                    </ha-settings-row>
                  `
              )
            )}
          </demo-black-white-row>
        `;
      })}
    `;
  }

  static styles = css`
    paper-input,
    ha-selector {
      width: 60;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-selector": DemoHaSelector;
  }
}

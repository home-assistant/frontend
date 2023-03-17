import { mdiFanOff, mdiFanSpeed1, mdiFanSpeed2, mdiFanSpeed3 } from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-control-select";
import type { ControlSelectOption } from "../../../../src/components/ha-control-select";

const fullOptions: ControlSelectOption[] = [
  {
    value: "off",
    label: "Off",
    path: mdiFanOff,
  },
  {
    value: "low",
    label: "Low",
    path: mdiFanSpeed1,
  },
  {
    value: "medium",
    label: "Medium",
    path: mdiFanSpeed2,
  },
  {
    value: "high",
    label: "High",
    path: mdiFanSpeed3,
  },
];

const iconOptions: ControlSelectOption[] = [
  {
    value: "off",
    path: mdiFanOff,
  },
  {
    value: "low",
    path: mdiFanSpeed1,
  },
  {
    value: "medium",
    path: mdiFanSpeed2,
  },
  {
    value: "high",
    path: mdiFanSpeed3,
  },
];

const labelOptions: ControlSelectOption[] = [
  {
    value: "off",
    label: "Off",
  },
  {
    value: "low",
    label: "Low",
  },
  {
    value: "medium",
    label: "Medium",
  },
  {
    value: "high",
    label: "High",
  },
];

const selects: {
  id: string;
  label: string;
  class?: string;
  options: ControlSelectOption[];
  disabled?: boolean;
}[] = [
  {
    id: "label",
    label: "Select with labels",
    options: labelOptions,
  },
  {
    id: "icon",
    label: "Select with icons",
    options: iconOptions,
  },
  {
    id: "icon",
    label: "Disabled select",
    options: iconOptions,
    disabled: true,
  },
  {
    id: "custom",
    label: "Select and custom style",
    class: "custom",
    options: fullOptions,
  },
];

@customElement("demo-components-ha-control-select")
export class DemoHaControlSelect extends LitElement {
  @state() private value?: string = "off";

  handleValueChanged(e: CustomEvent) {
    this.value = e.detail.value as string;
  }

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <div class="card-content">
          <p><b>Slider values</b></p>
          <table>
            <tbody>
              <tr>
                <td>value</td>
                <td>${this.value ?? "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ha-card>
      ${repeat(selects, (select) => {
        const { id, label, options, ...config } = select;
        return html`
          <ha-card>
            <div class="card-content">
              <label id=${id}>${label}</label>
              <pre>Config: ${JSON.stringify(config)}</pre>
              <ha-control-select
                .value=${this.value}
                .options=${options}
                class=${ifDefined(config.class)}
                @value-changed=${this.handleValueChanged}
                aria-labelledby=${id}
                disabled=${ifDefined(config.disabled)}
              >
              </ha-control-select>
            </div>
          </ha-card>
        `;
      })}
      <ha-card>
        <div class="card-content">
          <p class="title"><b>Vertical</b></p>
          <div class="vertical-selects">
            ${repeat(selects, (select) => {
              const { id, label, options, ...config } = select;
              return html`
                <ha-control-select
                  .value=${this.value}
                  .options=${options}
                  vertical
                  class=${ifDefined(config.class)}
                  @value-changed=${this.handleValueChanged}
                  aria-labelledby=${id}
                  disabled=${ifDefined(config.disabled)}
                >
                </ha-control-select>
              `;
            })}
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
      pre {
        margin-top: 0;
        margin-bottom: 8px;
      }
      p {
        margin: 0;
      }
      label {
        font-weight: 600;
      }
      .custom {
        --mdc-icon-size: 24px;
        --control-select-color: var(--state-fan-active-color);
        --control-select-thickness: 100px;
        --control-select-border-radius: 24px;
      }
      .vertical-selects {
        height: 300px;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
      }
      p.title {
        margin-bottom: 12px;
      }
      .vertical-selects > *:not(:last-child) {
        margin-right: 4px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-control-select": DemoHaControlSelect;
  }
}

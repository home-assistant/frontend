import {
  html,
  LitElement,
  TemplateResult,
  property,
  customElement,
  css,
  CSSResult,
} from "lit-element";

import "../components/ha-slider";
import "../components/entity/state-info";

import { HomeAssistant, AnalogOutputEntity } from "../types";
import { computeRTLDirection } from "../common/util/compute_rtl";
import { setValue } from "../data/input_text";

@customElement("state-card-analog_output")
class StateCardAnalogOutput extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public stateObj!: AnalogOutputEntity;

  protected render(): TemplateResult {
    const stateObj = this.stateObj;

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            "analog_output"
          )}</hui-warning
        >
      `;
    }

    return html`
      <div class="horizontal justified layout" id="analog_output_card">
        <div class="flex">
          <state-badge .stateObj=${stateObj}></state-badge>
          ${stateObj.attributes.mode === "slider"
            ? html`
                <ha-slider
                  .dir="${computeRTLDirection(this.hass!)}"
                  .step="${Number(stateObj.attributes.step)}"
                  .min="${Number(stateObj.attributes.min)}"
                  .max="${Number(stateObj.attributes.max)}"
                  .value="${Number(stateObj.state)}"
                  pin
                  @change="${this._selectedValueChanged}"
                  ignore-bar-touch
                  id="input"
                ></ha-slider>
                <span class="state">
                  ${Number(stateObj.state)}
                  ${stateObj.attributes.unit_of_measurement}
                </span>
              `
            : html`
                <paper-input
                  no-label-float
                  auto-validate
                  .pattern="[0-9]+([\\.][0-9]+)?"
                  .step="${Number(stateObj.attributes.step)}"
                  .min="${Number(stateObj.attributes.min)}"
                  .max="${Number(stateObj.attributes.max)}"
                  .value="${Number(stateObj.state)}"
                  type="number"
                  @change="${this._selectedValueChanged}"
                  id="input"
                ></paper-input>
              `}
          <ha-entity-toggle
            .hass=${this.hass}
            .stateObj=${stateObj}
          ></ha-entity-toggle>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .flex {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        width: 100%;
      }
      .state {
        min-width: 45px;
        text-align: end;
      }
      paper-input {
        text-align: end;
        margin-right: 30px;
      }
      ha-slider {
        max-width: 200px;
      }
    `;
  }

  private get _inputElement(): { value: string } {
    // linter recommended the following syntax
    return (this.shadowRoot!.getElementById("input") as unknown) as {
      value: string;
    };
  }

  private _selectedValueChanged(): void {
    const element = this._inputElement;
    const stateObj = this.stateObj;

    if (element.value !== stateObj.state) {
      setValue(this.hass!, stateObj.entity_id, element.value!);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-analog_output": StateCardAnalogOutput;
  }
}

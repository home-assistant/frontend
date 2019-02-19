import {
  html,
  LitElement,
  TemplateResult,
  property,
  customElement,
  css,
  CSSResult,
} from "lit-element";
import { PaperInputElement } from "@polymer/paper-input/paper-input";

import "../components/hui-generic-entity-row";
import "../../../components/ha-slider";
import "../components/hui-warning";

import { computeRTLDirection } from "../../../common/util/compute_rtl";
import { EntityRow, EntityConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { setValue } from "../../../data/input_text";

@customElement("hui-input-number-entity-row")
class HuiInputNumberEntityRow extends LitElement implements EntityRow {
  @property() public hass?: HomeAssistant;
  @property() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Configuration error");
    }
    this._config = config;
  }

  protected firstUpdated(): void {
    const element = this.shadowRoot!.querySelector(".state") as HTMLElement;

    if (!element) {
      return;
    }

    element.hidden = this.clientWidth <= 350;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    return html`
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        <div>
          ${stateObj.attributes.mode === "slider"
            ? html`
                <div class="flex">
                  <ha-slider
                    .dir="${this._computeRTLDirection}"
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
                </div>
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
        </div>
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .flex {
        display: flex;
        align-items: center;
      }
      .state {
        min-width: 45px;
        text-align: center;
      }
      paper-input {
        text-align: right;
      }
    `;
  }

  private get _inputElement(): { value: string } {
    return (this.shadowRoot!.getElementById("input") as unknown) as {
      value: string;
    };
  }

  private _selectedValueChanged(): void {
    const element = this._inputElement;
    const stateObj = this.hass!.states[this._config!.entity];

    if (element.value !== stateObj.state) {
      setValue(this.hass!, stateObj.entity_id, element.value!);
    }
  }

  private _computeRTLDirection(): string {
    return computeRTLDirection(this.hass!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-number-entity-row": HuiInputNumberEntityRow;
  }
}

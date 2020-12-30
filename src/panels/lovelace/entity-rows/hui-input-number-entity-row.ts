import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import "../../../components/ha-slider";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import { setValue } from "../../../data/input_text";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-input-number-entity-row")
class HuiInputNumberEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityConfig;

  private _loaded?: boolean;

  private _updated?: boolean;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this._updated && !this._loaded) {
      this._initialLoad();
    }
  }

  protected firstUpdated(): void {
    this._updated = true;
    if (this.isConnected && !this._loaded) {
      this._initialLoad();
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        ${stateObj.attributes.mode === "slider"
          ? html`
              <div class="flex">
                <ha-slider
                  .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
                  .dir=${computeRTLDirection(this.hass)}
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
                  ${computeStateDisplay(
                    this.hass.localize,
                    stateObj,
                    this.hass.locale,
                    stateObj.state
                  )}
                </span>
              </div>
            `
          : html`
              <div class="flex state">
                <paper-input
                  no-label-float
                  auto-validate
                  .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
                  pattern="[0-9]+([\\.][0-9]+)?"
                  .step="${Number(stateObj.attributes.step)}"
                  .min="${Number(stateObj.attributes.min)}"
                  .max="${Number(stateObj.attributes.max)}"
                  .value="${Number(stateObj.state)}"
                  type="number"
                  @change="${this._selectedValueChanged}"
                  id="input"
                ></paper-input>
                ${stateObj.attributes.unit_of_measurement}
              </div>
            `}
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .flex {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-grow: 2;
      }
      .state {
        min-width: 45px;
        text-align: end;
      }
      paper-input {
        text-align: end;
      }
      ha-slider {
        width: 100%;
        max-width: 200px;
      }
      :host {
        cursor: pointer;
      }
    `;
  }

  private async _initialLoad(): Promise<void> {
    this._loaded = true;
  }

  private get _inputElement(): { value: string } {
    // linter recommended the following syntax
    return this.shadowRoot!.getElementById("input") as unknown as {
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-number-entity-row": HuiInputNumberEntityRow;
  }
}

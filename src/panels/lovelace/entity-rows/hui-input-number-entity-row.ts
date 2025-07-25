import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-slider";
import "../../../components/ha-textfield";
import { isUnavailableState } from "../../../data/entity";
import { setValue } from "../../../data/input_text";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-input-number-entity-row")
class HuiInputNumberEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityConfig;

  private _loaded?: boolean;

  private _updated?: boolean;

  private _resizeObserver?: ResizeObserver;

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
    this._attachObserver();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
  }

  protected firstUpdated(): void {
    this._updated = true;
    if (this.isConnected && !this._loaded) {
      this._initialLoad();
    }
    this._attachObserver();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
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
                  labeled
                  .disabled=${isUnavailableState(stateObj.state)}
                  .step=${Number(stateObj.attributes.step)}
                  .min=${Number(stateObj.attributes.min)}
                  .max=${Number(stateObj.attributes.max)}
                  .value=${stateObj.state}
                  @change=${this._selectedValueChanged}
                ></ha-slider>
                <span class="state">
                  ${this.hass.formatEntityState(stateObj)}
                </span>
              </div>
            `
          : html`
              <div class="flex state">
                <ha-textfield
                  .disabled=${isUnavailableState(stateObj.state)}
                  pattern="[0-9]+([\\.][0-9]+)?"
                  .step=${Number(stateObj.attributes.step)}
                  .min=${Number(stateObj.attributes.min)}
                  .max=${Number(stateObj.attributes.max)}
                  .value=${Number(stateObj.state).toString()}
                  .suffix=${stateObj.attributes.unit_of_measurement || ""}
                  type="number"
                  @change=${this._selectedValueChanged}
                >
                </ha-textfield>
              </div>
            `}
      </hui-generic-entity-row>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
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
    ha-textfield {
      text-align: end;
    }
    ha-slider {
      width: 100%;
      max-width: 200px;
    }
  `;

  private async _initialLoad(): Promise<void> {
    this._loaded = true;
    await this.updateComplete;
    this._measureCard();
  }

  private _measureCard() {
    if (!this.isConnected) {
      return;
    }
    const element = this.shadowRoot!.querySelector(".state") as HTMLElement;
    if (!element) {
      return;
    }
    element.hidden = this.clientWidth <= 300;
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }
    if (this.isConnected) {
      this._resizeObserver.observe(this);
    }
  }

  private _selectedValueChanged(ev: Event): void {
    const stateObj = this.hass!.states[this._config!.entity];

    if ((ev.target as HTMLInputElement).value !== stateObj.state) {
      setValue(
        this.hass!,
        stateObj.entity_id,
        (ev.target as HTMLInputElement).value
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-number-entity-row": HuiInputNumberEntityRow;
  }
}

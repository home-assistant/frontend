import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { HassEntity } from "home-assistant-js-websocket";
import { customElement, property } from "lit/decorators";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import { computeRTLDirection } from "../common/util/compute_rtl";
import { debounce } from "../common/util/debounce";
import "../components/ha-slider";
import "../components/ha-textfield";
import "../components/entity/state-info";
import { isUnavailableState } from "../data/entity";
import { setValue } from "../data/input_text";
import { HomeAssistant } from "../types";
import { installResizeObserver } from "../panels/lovelace/common/install-resize-observer";

@customElement("state-card-input_number")
class StateCardInputNumber extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  private _loaded?: boolean;

  private _updated?: boolean;

  private _resizeObserver?: ResizeObserver;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this._updated && !this._loaded) {
      this._initialLoad();
    }
    this._attachObserver();
  }

  public disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
  }

  protected firstUpdated(): void {
    this._updated = true;
    if (this.isConnected && !this._loaded) {
      this._initialLoad();
    }
    this._attachObserver();
  }

  protected render(): TemplateResult {
    return html`
      <state-info
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .inDialog=${this.inDialog}
      ></state-info>
      ${this.stateObj.attributes.mode === "slider"
        ? html`
            <div class="flex">
              <ha-slider
                .disabled=${isUnavailableState(this.stateObj.state)}
                .dir=${computeRTLDirection(this.hass)}
                .step=${Number(this.stateObj.attributes.step)}
                .min=${Number(this.stateObj.attributes.min)}
                .max=${Number(this.stateObj.attributes.max)}
                .value=${this.stateObj.state}
                pin
                @change=${this._selectedValueChanged}
                ignore-bar-touch
              ></ha-slider>
              <span class="state">
                ${computeStateDisplay(
                  this.hass.localize,
                  this.stateObj,
                  this.hass.locale,
                  this.hass.entities,
                  this.stateObj.state
                )}
              </span>
            </div>
          `
        : html`
            <div class="flex state">
              <ha-textfield
                .disabled=${isUnavailableState(this.stateObj.state)}
                pattern="[0-9]+([\\.][0-9]+)?"
                .step=${Number(this.stateObj.attributes.step)}
                .min=${Number(this.stateObj.attributes.min)}
                .max=${Number(this.stateObj.attributes.max)}
                .value=${Number(this.stateObj.state).toString()}
                .suffix=${this.stateObj.attributes.unit_of_measurement || ""}
                type="number"
                @change=${this._selectedValueChanged}
              >
              </ha-textfield>
            </div>
          `}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
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
  }

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
      await installResizeObserver();
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }
    if (this.isConnected) {
      this._resizeObserver.observe(this);
    }
  }

  private _selectedValueChanged(ev: Event): void {
    if ((ev.target as HTMLInputElement).value !== this.stateObj.state) {
      setValue(
        this.hass!,
        this.stateObj.entity_id,
        (ev.target as HTMLInputElement).value
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-input_number": StateCardInputNumber;
  }
}

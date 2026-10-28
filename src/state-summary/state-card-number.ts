import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { debounce } from "../common/util/debounce";
import type { HASSDomTargetEvent } from "../common/dom/fire_event";
import "../components/entity/state-info";
import type { HaSlider } from "../components/ha-slider";
import "../components/ha-slider";
import type { HaInput } from "../components/input/ha-input";
import "../components/input/ha-input";
import { UNAVAILABLE } from "../data/entity/entity";
import { showNumberSlider } from "../data/number";
import { haStyle } from "../resources/styles";
import { consume } from "../common/decorators/consume";
import { transform } from "../common/decorators/transform";
import { apiContext, formattersContext } from "../data/context";
import type { HomeAssistantApi, HomeAssistantFormatters } from "../types";

@customElement("state-card-number")
class StateCardNumber extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityState"] | undefined
  >({
    transformer: (formatters) => formatters?.formatEntityState,
  })
  private _formatEntityState?: HomeAssistantFormatters["formatEntityState"];

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

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

  protected render() {
    return html`
      <state-info
        .stateObj=${this.stateObj}
        .inDialog=${this.inDialog}
      ></state-info>
      ${
        showNumberSlider(this.stateObj)
          ? html`
              <div class="flex">
                <ha-slider
                  labeled
                  .disabled=${this.stateObj.state === UNAVAILABLE}
                  .step=${Number(this.stateObj.attributes.step)}
                  .min=${Number(this.stateObj.attributes.min)}
                  .max=${Number(this.stateObj.attributes.max)}
                  .value=${this.stateObj.state}
                  @change=${this._selectedValueChanged}
                >
                </ha-slider>
                <span class="state">
                  ${this._formatEntityState?.(this.stateObj)}
                </span>
              </div>
            `
          : html` <div class="flex state">
              <ha-input
                .disabled=${this.stateObj.state === UNAVAILABLE}
                pattern="[0-9]+([\\.][0-9]+)?"
                .step=${Number(this.stateObj.attributes.step)}
                .min=${Number(this.stateObj.attributes.min)}
                .max=${Number(this.stateObj.attributes.max)}
                .value=${Number(this.stateObj.state).toString()}
                type="number"
                @change=${this._selectedValueChanged}
              >
                ${
                  this.stateObj.attributes.unit_of_measurement
                    ? html`<span slot="end"
                        >${this.stateObj.attributes.unit_of_measurement}</span
                      >`
                    : nothing
                }
              </ha-input>
            </div>`
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
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }
    if (this.isConnected) {
      this._resizeObserver.observe(this);
    }
  }

  private async _selectedValueChanged(
    ev: HASSDomTargetEvent<HaSlider | HaInput>
  ) {
    const value = String(ev.target.value);
    if (value === this.stateObj.state) {
      return;
    }
    await this._api.callService("number", "set_value", {
      value: value,
      entity_id: this.stateObj.entity_id,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
        ha-input::part(wa-input) {
          text-align: end;
        }
        ha-slider {
          width: 100%;
          max-width: 200px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-number": StateCardNumber;
  }
}

import { mdiStop, mdiValveClosed, mdiValveOpen } from "@mdi/js";
import { html, LitElement, nothing, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { stateColor } from "../../../common/entity/state_color";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-svg-icon";
import {
  canClose,
  canOpen,
  canStop,
  ValveEntityFeature,
  type ValveEntity,
} from "../../../data/valve";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  ValveOpenCloseCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";
import "../../../components/ha-control-switch";

export const supportsValveOpenCloseCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "valve" &&
    (supportsFeature(stateObj, ValveEntityFeature.OPEN) ||
      supportsFeature(stateObj, ValveEntityFeature.CLOSE))
  );
};

@customElement("hui-valve-open-close-card-feature")
class HuiValveOpenCloseCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: ValveOpenCloseCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as ValveEntity | undefined;
  }

  static getStubConfig(): ValveOpenCloseCardFeatureConfig {
    return {
      type: "valve-open-close",
    };
  }

  public setConfig(config: ValveOpenCloseCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _onOpenValve(): void {
    this.hass!.callService("valve", "open_valve", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  private _onCloseValve(): void {
    this.hass!.callService("valve", "close_valve", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    this._onOpenValve();
  }

  private _onCloseTap(ev): void {
    ev.stopPropagation();
    this._onCloseValve();
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("valve", "stop_valve", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  private _valueChanged(ev): void {
    ev.stopPropagation();
    const checked = ev.target.checked as boolean;

    if (checked) {
      this._onOpenValve();
    } else {
      this._onCloseValve();
    }
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsValveOpenCloseCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    // Determine colors and active states for toggle-style UI
    const openColor = stateColor(this, this._stateObj, "open");
    const closedColor = stateColor(this, this._stateObj, "closed");
    const openIcon = mdiValveOpen;
    const closedIcon = mdiValveClosed;

    const isOpen =
      this._stateObj.state === "open" ||
      this._stateObj.state === "closing" ||
      this._stateObj.state === "opening";
    const isClosed = this._stateObj.state === "closed";

    if (
      this._stateObj.attributes.assumed_state ||
      this._stateObj.state === UNKNOWN
    ) {
      return html`
        <ha-control-button-group>
          ${supportsFeature(this._stateObj, ValveEntityFeature.CLOSE)
            ? html`
                <ha-control-button
                  .label=${this.hass.localize("ui.card.valve.close_valve")}
                  @click=${this._onCloseTap}
                  .disabled=${!canClose(this._stateObj)}
                  class=${classMap({
                    active: isClosed,
                  })}
                  style=${styleMap({
                    "--color": closedColor,
                  })}
                >
                  <ha-svg-icon .path=${mdiValveClosed}></ha-svg-icon>
                </ha-control-button>
              `
            : nothing}
          ${supportsFeature(this._stateObj, ValveEntityFeature.STOP)
            ? html`
                <ha-control-button
                  .label=${this.hass.localize("ui.card.valve.stop_valve")}
                  @click=${this._onStopTap}
                  .disabled=${!canStop(this._stateObj)}
                >
                  <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
                </ha-control-button>
              `
            : nothing}
          ${supportsFeature(this._stateObj, ValveEntityFeature.OPEN)
            ? html`
                <ha-control-button
                  .label=${this.hass.localize("ui.card.valve.open_valve")}
                  @click=${this._onOpenTap}
                  .disabled=${!canOpen(this._stateObj)}
                  class=${classMap({
                    active: isOpen,
                  })}
                  style=${styleMap({
                    "--color": openColor,
                  })}
                >
                  <ha-svg-icon .path=${mdiValveOpen}></ha-svg-icon>
                </ha-control-button>
              `
            : nothing}
        </ha-control-button-group>
      `;
    }

    return html`
      <ha-control-switch
        .pathOn=${openIcon}
        .pathOff=${closedIcon}
        .checked=${isOpen}
        @change=${this._valueChanged}
        .label=${this.hass.localize("ui.card.common.toggle")}
        .disabled=${this._stateObj.state === UNAVAILABLE}
      >
      </ha-control-switch>
    `;
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        ha-control-button.active {
          --control-button-icon-color: white;
          --control-button-background-color: var(--color);
          --control-button-background-opacity: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-valve-open-close-card-feature": HuiValveOpenCloseCardFeature;
  }
}

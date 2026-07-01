import { consume } from "@lit/context";
import { mdiStop, mdiValveClosed, mdiValveOpen } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-switch";
import "../../../components/ha-svg-icon";
import { apiContext } from "../../../data/context";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity/entity";
import {
  canClose,
  canOpen,
  canStop,
  ValveEntityFeature,
  type ValveEntity,
} from "../../../data/valve";
import type { HomeAssistant, HomeAssistantApi } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  ValveOpenCloseCardFeatureConfig,
} from "./types";

const supportsValveOpenCloseCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "valve" &&
    (supportsFeature(stateObj, ValveEntityFeature.OPEN) ||
      supportsFeature(stateObj, ValveEntityFeature.CLOSE))
  );
};

export const supportsValveOpenCloseCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsValveOpenCloseCardFeatureFromState(stateObj);
};

@customElement("hui-valve-open-close-card-feature")
class HuiValveOpenCloseCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: ValveEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _config?: ValveOpenCloseCardFeatureConfig;

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
    this._api.callService("valve", "open_valve", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  private _onCloseValve(): void {
    this._api.callService("valve", "close_valve", {
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
    this._api.callService("valve", "stop_valve", {
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
      !this.context ||
      !this._stateObj ||
      !supportsValveOpenCloseCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    // Determine colors and active states for toggle-style UI
    const openColor = stateColorCss(this._stateObj, "open");
    const closedColor = stateColorCss(this._stateObj, "closed");
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
                  .label=${this._localize("ui.card.valve.close_valve")}
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
                  .label=${this._localize("ui.card.valve.stop_valve")}
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
                  .label=${this._localize("ui.card.valve.open_valve")}
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
        .label=${this._localize("ui.card.common.toggle")}
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

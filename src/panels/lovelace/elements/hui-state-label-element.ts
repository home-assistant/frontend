import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { isUnavailableState } from "../../../data/entity";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import { computeTooltip } from "../common/compute-tooltip";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import "../components/hui-warning-element";
import type { LovelacePictureElementEditor } from "../types";
import type { LovelaceElement, StateLabelElementConfig } from "./types";

@customElement("hui-state-label-element")
class HuiStateLabelElement extends LitElement implements LovelaceElement {
  public static async getConfigElement(): Promise<LovelacePictureElementEditor> {
    await import(
      "../editor/config-elements/elements/hui-state-label-element-editor"
    );
    return document.createElement("hui-state-label-element-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): StateLabelElementConfig {
    const includeDomains = ["light", "switch", "sensor"];
    const maxEntities = 1;
    const entityFilter = (stateObj: HassEntity): boolean =>
      !isUnavailableState(stateObj.state);
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains,
      entityFilter
    );

    return { type: "state-label", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StateLabelElementConfig;

  public setConfig(config: StateLabelElementConfig): void {
    if (!config.entity) {
      throw Error("Entity required");
    }

    this._config = {
      tap_action: { action: "more-info" },
      hold_action: { action: "more-info" },
      ...config,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity!];

    if (!stateObj) {
      return html`
        <hui-warning-element
          .label=${createEntityNotFoundWarning(this.hass, this._config.entity!)}
        ></hui-warning-element>
      `;
    }

    if (
      this._config.attribute &&
      !(this._config.attribute in stateObj.attributes)
    ) {
      return html`
        <hui-warning-element
          label=${this.hass.localize(
            "ui.panel.lovelace.warning.attribute_not_found",
            { attribute: this._config.attribute, entity: this._config.entity }
          )}
        ></hui-warning-element>
      `;
    }

    return html`
      <div
        .title=${computeTooltip(this.hass, this._config)}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) ? "0" : undefined
        )}
      >
        ${this._config.prefix}${!this._config.attribute
          ? this.hass.formatEntityState(stateObj)
          : stateObj.attributes[this._config.attribute]}${this._config.suffix}
      </div>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static styles = css`
    :host {
      cursor: pointer;
    }
    div {
      padding: 8px;
      white-space: nowrap;
    }
    div:focus {
      outline: none;
      background: var(--divider-color);
      border-radius: var(--ha-border-radius-pill);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-label-element": HuiStateLabelElement;
  }
}

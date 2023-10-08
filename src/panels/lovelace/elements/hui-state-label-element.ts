import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { computeTooltip } from "../common/compute-tooltip";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import "../components/hui-warning-element";
import { LovelaceElement, StateLabelElementConfig } from "./types";

@customElement("hui-state-label-element")
class HuiStateLabelElement extends LitElement implements LovelaceElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StateLabelElementConfig;

  public setConfig(config: StateLabelElementConfig): void {
    if (!config.entity) {
      throw Error("Entity required");
    }

    this._config = { hold_action: { action: "more-info" }, ...config };
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
          .label=${createEntityNotFoundWarning(this.hass, this._config.entity)}
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
            "attribute",
            this._config.attribute,
            "entity",
            this._config.entity
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

  static get styles(): CSSResultGroup {
    return css`
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
        border-radius: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-label-element": HuiStateLabelElement;
  }
}

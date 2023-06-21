import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { DOMAINS_INPUT_ROW } from "../../../common/const";
import { toggleAttribute } from "../../../common/dom/toggle_attribute";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/entity/state-badge";
import "../../../components/ha-relative-time";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { EntitiesCardEntityConfig } from "../cards/types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { createEntityNotFoundWarning } from "./hui-warning";

class HuiGenericEntityRow extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public config?: EntitiesCardEntityConfig;

  @property() public secondaryText?: string;

  @property({ type: Boolean }) public hideName = false;

  // Allows to control if this row should capture the user interaction, e.g. with its
  // toggle switch, button or input field. Some domains dynamically decide what to show
  // => static determination will not work => the caller has to pass the desired value in.
  // Same applies for custom components that want to override the default behavior.
  // Default behavior is controlled by DOMAINS_INPUT_ROW.
  @property({ type: Boolean }) public catchInteraction?;

  protected render() {
    if (!this.hass || !this.config) {
      return nothing;
    }
    const stateObj = this.config.entity
      ? this.hass.states[this.config.entity]
      : undefined;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this.config.entity)}
        </hui-warning>
      `;
    }

    const domain = computeDomain(this.config.entity);
    // By default, we always show a pointer, since if there is no explicit configuration provided,
    // the frontend always assumes "more-info" in the action handler. We only need to hide the pointer
    // if the tap action is explicitly set to "none".
    const pointer = !(
      this.config.tap_action && this.config.tap_action.action === "none"
    );

    const hasSecondary = this.secondaryText || this.config.secondary_info;
    const name = this.config.name ?? computeStateName(stateObj);

    return html`
      <state-badge
        class=${classMap({
          pointer,
        })}
        .hass=${this.hass}
        .stateObj=${stateObj}
        .overrideIcon=${this.config.icon}
        .overrideImage=${this.config.image}
        .stateColor=${this.config.state_color}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this.config!.hold_action),
          hasDoubleClick: hasAction(this.config!.double_tap_action),
        })}
        tabindex=${ifDefined(pointer ? "0" : undefined)}
      ></state-badge>
      ${!this.hideName
        ? html`<div
            class="info ${classMap({
              pointer,
              "text-content": !hasSecondary,
            })}"
            @action=${this._handleAction}
            .actionHandler=${actionHandler({
              hasHold: hasAction(this.config!.hold_action),
              hasDoubleClick: hasAction(this.config!.double_tap_action),
            })}
            .title=${name}
          >
            ${this.config.name || computeStateName(stateObj)}
            ${hasSecondary
              ? html`
                  <div class="secondary">
                    ${this.secondaryText ||
                    (this.config.secondary_info === "entity-id"
                      ? stateObj.entity_id
                      : this.config.secondary_info === "last-changed"
                      ? html`
                          <ha-relative-time
                            .hass=${this.hass}
                            .datetime=${stateObj.last_changed}
                            capitalize
                          ></ha-relative-time>
                        `
                      : this.config.secondary_info === "last-updated"
                      ? html`
                          <ha-relative-time
                            .hass=${this.hass}
                            .datetime=${stateObj.last_updated}
                            capitalize
                          ></ha-relative-time>
                        `
                      : this.config.secondary_info === "last-triggered"
                      ? stateObj.attributes.last_triggered
                        ? html`
                            <ha-relative-time
                              .hass=${this.hass}
                              .datetime=${stateObj.attributes.last_triggered}
                              capitalize
                            ></ha-relative-time>
                          `
                        : this.hass.localize(
                            "ui.panel.lovelace.cards.entities.never_triggered"
                          )
                      : this.config.secondary_info === "position" &&
                        stateObj.attributes.current_position !== undefined
                      ? `${this.hass.localize("ui.card.cover.position")}: ${
                          stateObj.attributes.current_position
                        }`
                      : this.config.secondary_info === "tilt-position" &&
                        stateObj.attributes.current_tilt_position !== undefined
                      ? `${this.hass.localize(
                          "ui.card.cover.tilt_position"
                        )}: ${stateObj.attributes.current_tilt_position}`
                      : this.config.secondary_info === "brightness" &&
                        stateObj.attributes.brightness
                      ? html`${Math.round(
                          (stateObj.attributes.brightness / 255) * 100
                        )}
                        %`
                      : "")}
                  </div>
                `
              : ""}
          </div>`
        : nothing}
      ${this.catchInteraction ?? !DOMAINS_INPUT_ROW.includes(domain)
        ? html`<div
            class="text-content value ${classMap({
              pointer,
            })}"
            @action=${this._handleAction}
            .actionHandler=${actionHandler({
              hasHold: hasAction(this.config!.hold_action),
              hasDoubleClick: hasAction(this.config!.double_tap_action),
            })}
          >
            <div class="state"><slot></slot></div>
          </div>`
        : html`<slot></slot>`}
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    toggleAttribute(
      this,
      "no-secondary",
      !this.secondaryText && !this.config?.secondary_info
    );
    if (changedProps.has("hass")) {
      toggleAttribute(this, "rtl", computeRTL(this.hass!));
    }
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this.config!, ev.detail.action!);
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        align-items: center;
        flex-direction: row;
      }
      .info {
        margin-left: 16px;
        margin-right: 8px;
        flex: 1 1 30%;
      }
      .info,
      .info > * {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .flex ::slotted(*) {
        margin-left: 8px;
        min-width: 0;
      }
      .flex ::slotted([slot="secondary"]) {
        margin-left: 0;
      }
      .secondary,
      ha-relative-time {
        color: var(--secondary-text-color);
      }
      state-badge {
        flex: 0 0 40px;
      }
      :host([rtl]) .flex {
        margin-left: 0;
        margin-right: 16px;
      }
      :host([rtl]) .flex ::slotted(*) {
        margin-left: 0;
        margin-right: 8px;
      }
      .pointer {
        cursor: pointer;
      }
      .state {
        text-align: right;
      }
      .state.rtl {
        text-align: left;
      }
      .value {
        direction: ltr;
      }
    `;
  }
}
customElements.define("hui-generic-entity-row", HuiGenericEntityRow);

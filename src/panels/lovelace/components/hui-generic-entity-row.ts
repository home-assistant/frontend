import { computeStateName } from "../../../common/entity/compute_state_name";
import {
  LitElement,
  html,
  css,
  CSSResult,
  PropertyValues,
  property,
  TemplateResult,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";
import { UnsubscribeFunc } from "home-assistant-js-websocket";

import "../../../components/entity/state-badge";
import "../../../components/ha-relative-time";
import "../../../components/ha-icon";
import "../components/hui-warning";

import { HomeAssistant } from "../../../types";
import { computeRTL } from "../../../common/util/compute_rtl";
import { toggleAttribute } from "../../../common/dom/toggle_attribute";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { classMap } from "lit-html/directives/class-map";
import { EntitiesCardEntityConfig } from "../cards/types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { handleAction } from "../common/handle-action";
import { subscribeRenderTemplate } from "../../../data/ws-templates";

class HuiGenericEntityRow extends LitElement {
  @property() public showSecondary: boolean = true;
  @property() private _hass?: HomeAssistant;
  @property() private _config?: EntitiesCardEntityConfig;
  @property() private _content?: string = "";
  @property() private _unsubRenderTemplate?: Promise<UnsubscribeFunc>;

  public set config(config: EntitiesCardEntityConfig) {
    this._config = config;
    this._disconnect().then(() => {
      if (this._hass) {
        this._connect();
      }
    });
  }

  public disconnectedCallback() {
    this._disconnect();
  }

  public set hass(hass) {
    this._hass = hass;
    this._connect();
  }

  protected render(): TemplateResult {
    if (!this._hass || !this._config) {
      return html``;
    }
    const stateObj = this._config.entity
      ? this._hass.states[this._config.entity]
      : undefined;

    if (!stateObj) {
      return html`
        <hui-warning
          >${this._hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    const pointer =
      (this._config.tap_action && this._config.tap_action.action !== "none") ||
      (this._config.entity &&
        !DOMAINS_HIDE_MORE_INFO.includes(computeDomain(this._config.entity)));

    return html`
      <state-badge
        class=${classMap({
          pointer,
        })}
        .hass=${this._hass}
        .stateObj=${stateObj}
        .overrideIcon=${this._config.icon}
        .overrideImage=${this._config.image}
        .stateColor=${this._config.state_color}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) ? "0" : undefined
        )}
      ></state-badge>
      <div class="flex">
        <div
          class=${classMap({
            info: true,
            pointer,
            padName: this.showSecondary && !this._config.secondary_info,
            padSecondary: Boolean(
              !this.showSecondary || this._config.secondary_info
            ),
          })}
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this._config!.hold_action),
            hasDoubleClick: hasAction(this._config!.double_tap_action),
          })}
        >
          ${this._config.name || computeStateName(stateObj)}
          <div class="secondary">
            ${!this.showSecondary
              ? html`
                  <slot name="secondary"></slot>
                `
              : this._config.secondary_info === "entity-id"
              ? stateObj.entity_id
              : this._config.secondary_info === "last-changed"
              ? html`
                  <ha-relative-time
                    .hass=${this._hass}
                    .datetime=${stateObj.last_changed}
                  ></ha-relative-time>
                `
              : this._config.secondary_info === "last-triggered"
              ? stateObj.attributes.last_triggered
                ? html`
                    <ha-relative-time
                      .hass=${this._hass}
                      .datetime=${stateObj.attributes.last_triggered}
                    ></ha-relative-time>
                  `
                : this._hass.localize(
                    "ui.panel.lovelace.cards.entities.never_triggered"
                  )
              : this._config.secondary_info === "markdown"
              ? html`
                  <ha-markdown
                    class="markdown"
                    .content=${this._content}
                  ></ha-markdown>
                `
              : ""}
          </div>
        </div>

        <slot></slot>
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("_hass")) {
      toggleAttribute(this, "rtl", computeRTL(this._hass!));
    }
  }

  private async _connect() {
    if (
      !this._unsubRenderTemplate &&
      this._hass &&
      this._config &&
      this._config.content
    ) {
      this._unsubRenderTemplate = subscribeRenderTemplate(
        this._hass.connection,
        (result) => {
          this._content = result;
        },
        {
          template: this._config.content,
          entity_ids: this._config.entity_ids,
          variables: { config: this._config },
        }
      );
      this._unsubRenderTemplate.catch(() => {
        this._content = this._config!.content;
        this._unsubRenderTemplate = undefined;
      });
    }
  }

  private async _disconnect() {
    if (this._unsubRenderTemplate) {
      try {
        const unsub = await this._unsubRenderTemplate;
        this._unsubRenderTemplate = undefined;
        await unsub();
      } catch (e) {
        if (e.code === "not_found") {
          // If we get here, the connection was probably already closed. Ignore.
        } else {
          throw e;
        }
      }
    }
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this._hass!, this._config!, ev.detail.action!);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        align-items: center;
      }
      .flex {
        flex: 1;
        margin-left: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-width: 0;
      }
      .info {
        flex: 1 0 60px;
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
        display: block;
        color: var(--secondary-text-color);
      }
      state-badge {
        flex: 0 0 40px;
      }
      state-badge:focus {
        outline: none;
        background: var(--divider-color);
        border-radius: 100%;
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
      .padName {
        padding: 12px 0px;
      }
      .padSecondary {
        padding: 4px 0px;
      }
      ha-markdown {
        display: block;
        -ms-user-select: initial;
        -webkit-user-select: initial;
        -moz-user-select: initial;
      }
      ha-markdown > *:first-child {
        margin-top: 0;
      }
      ha-markdown > *:last-child {
        margin-bottom: 0;
      }
      ha-markdown a {
        color: var(--primary-color);
      }
      ha-markdown img {
        max-width: 100%;
      }
    `;
  }
}
customElements.define("hui-generic-entity-row", HuiGenericEntityRow);

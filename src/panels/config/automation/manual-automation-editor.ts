import "@material/mwc-button/mwc-button";
import { mdiHelpCircle, mdiSort, mdiTextBoxEdit } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-alert";
import {
  Condition,
  ManualAutomationConfig,
  Trigger,
} from "../../../data/automation";
import { Action } from "../../../data/script";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "./action/ha-automation-action";
import "./condition/ha-automation-condition";
import "./trigger/ha-automation-trigger";

@customElement("manual-automation-editor")
export class HaManualAutomationEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public config!: ManualAutomationConfig;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _reOrderMode = false;

  private _toggleReOrderMode() {
    this._reOrderMode = !this._reOrderMode;
  }

  protected render() {
    return html`
      <div class="header">
        <h2 id="triggers-heading" class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.header"
          )}
        </h2>
        <ha-icon-button
          .path=${this._reOrderMode ? mdiTextBoxEdit : mdiSort}
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.actions.re_order"
          )}
          @click=${this._toggleReOrderMode}
        ></ha-icon-button>
        <a
          href=${documentationUrl(this.hass, "/docs/automation/trigger/")}
          target="_blank"
          rel="noreferrer"
        >
          <ha-icon-button
            .path=${mdiHelpCircle}
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.learn_more"
            )}
          ></ha-icon-button>
        </a>
      </div>

      <ha-automation-trigger
        role="region"
        aria-labelledby="triggers-heading"
        .triggers=${this.config.trigger}
        @value-changed=${this._triggerChanged}
        .hass=${this.hass}
        .reOrderMode=${this._reOrderMode}
      ></ha-automation-trigger>

      <div class="header">
        <h2 id="conditions-heading" class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.header"
          )}
        </h2>
        <ha-icon-button
          .path=${this._reOrderMode ? mdiTextBoxEdit : mdiSort}
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.actions.re_order"
          )}
          @click=${this._toggleReOrderMode}
        ></ha-icon-button>
        <a
          href=${documentationUrl(this.hass, "/docs/automation/condition/")}
          target="_blank"
          rel="noreferrer"
        >
          <ha-icon-button
            .path=${mdiHelpCircle}
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.learn_more"
            )}
          ></ha-icon-button>
        </a>
      </div>

      <ha-automation-condition
        role="region"
        aria-labelledby="conditions-heading"
        .conditions=${this.config.condition || []}
        @value-changed=${this._conditionChanged}
        .hass=${this.hass}
        .reOrderMode=${this._reOrderMode}
      ></ha-automation-condition>

      <div class="header">
        <h2 id="actions-heading" class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.actions.header"
          )}
        </h2>
        <div>
          <ha-icon-button
            .path=${this._reOrderMode ? mdiTextBoxEdit : mdiSort}
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.actions.re_order"
            )}
            @click=${this._toggleReOrderMode}
          ></ha-icon-button>
          <a
            href=${documentationUrl(this.hass, "/docs/automation/action/")}
            target="_blank"
            rel="noreferrer"
          >
            <ha-icon-button
              .path=${mdiHelpCircle}
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.actions.learn_more"
              )}
            ></ha-icon-button>
          </a>
        </div>
      </div>

      <ha-automation-action
        role="region"
        aria-labelledby="actions-heading"
        .actions=${this.config.action}
        @value-changed=${this._actionChanged}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .reOrderMode=${this._reOrderMode}
      ></ha-automation-action>
    `;
  }

  private _triggerChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.config!, trigger: ev.detail.value as Trigger[] },
    });
  }

  private _conditionChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.config!,
        condition: ev.detail.value as Condition[],
      },
    });
  }

  private _actionChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.config!, action: ev.detail.value as Action[] },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        ha-card {
          overflow: hidden;
        }
        .link-button-row {
          padding: 14px;
        }

        p {
          margin-bottom: 0;
        }
        ha-entity-toggle {
          margin-right: 8px;
        }
        ha-select,
        .max {
          margin-top: 16px;
          width: 200px;
        }
        .header {
          display: flex;
          align-items: center;
        }
        .header:first-child {
          margin-top: -16px;
        }
        .header .name {
          font-size: 20px;
          font-weight: 400;
          flex: 1;
        }
        .header a {
          color: var(--secondary-text-color);
        }
        h3 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 0 0 8px;
          --expansion-panel-content-padding: 0;
        }
        .card-content {
          padding: 16px;
        }
        .settings-icon {
          display: none;
        }
        @media (min-width: 870px) {
          .settings-icon {
            display: inline-block;
            color: var(--secondary-text-color);
            opacity: 0.9;
            margin-right: 8px;
          }
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: var(--ha-card-border-radius);
          border-top-left-radius: var(--ha-card-border-radius);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "manual-automation-editor": HaManualAutomationEditor;
  }
}

import "@material/mwc-button/mwc-button";
import { mdiHelpCircle } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
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

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public config!: ManualAutomationConfig;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render() {
    return html`
      ${this.disabled
        ? html`<ha-alert alert-type="warning">
            ${this.hass.localize("ui.panel.config.automation.editor.read_only")}
            <mwc-button slot="action" @click=${this._duplicate}>
              ${this.hass.localize("ui.panel.config.automation.editor.migrate")}
            </mwc-button>
          </ha-alert>`
        : ""}
      ${this.stateObj?.state === "off"
        ? html`
            <ha-alert alert-type="info">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.disabled"
              )}
              <mwc-button slot="action" @click=${this._enable}>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.enable"
                )}
              </mwc-button>
            </ha-alert>
          `
        : ""}
      ${this.config.description
        ? html`<ha-markdown
            class="description"
            breaks
            .content=${this.config.description}
          ></ha-markdown>`
        : ""}
      <div class="header">
        <h2 id="triggers-heading" class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.header"
          )}
        </h2>
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
        .disabled=${this.disabled}
      ></ha-automation-trigger>

      <div class="header">
        <h2 id="conditions-heading" class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.header"
          )}
        </h2>
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
        .disabled=${this.disabled}
      ></ha-automation-condition>

      <div class="header">
        <h2 id="actions-heading" class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.actions.header"
          )}
        </h2>
        <div>
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
        .disabled=${this.disabled}
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

  private async _enable(): Promise<void> {
    if (!this.hass || !this.stateObj) {
      return;
    }
    await this.hass.callService("automation", "turn_on", {
      entity_id: this.stateObj.entity_id,
    });
  }

  private _duplicate() {
    fireEvent(this, "duplicate");
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
        .description {
          margin: 0;
        }
        p {
          margin-bottom: 0;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "manual-automation-editor": HaManualAutomationEditor;
  }
}

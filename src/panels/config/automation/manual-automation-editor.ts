import "@material/mwc-button/mwc-button";
import { mdiHelpCircle, mdiRobot } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-card";
import "../../../components/ha-textarea";
import "../../../components/ha-textfield";
import "../../../components/ha-icon-button";
import {
  AUTOMATION_DEFAULT_MODE,
  Condition,
  ManualAutomationConfig,
  Trigger,
} from "../../../data/automation";
import { Action, isMaxMode, MODES } from "../../../data/script";
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

  protected render() {
    return html`
      <ha-card outlined>
        ${this.stateObj && this.stateObj.state === "off"
          ? html`<div class="disabled-bar">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.disabled"
              )}
            </div>`
          : ""}

        <ha-expansion-panel leftChevron>
          <h3 slot="header">
            <ha-svg-icon class="settings-icon" .path=${mdiRobot}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.automation_settings"
            )}
          </h3>
          <div class="card-content">
            <ha-textarea
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.description.label"
              )}
              .placeholder=${this.hass.localize(
                "ui.panel.config.automation.editor.description.placeholder"
              )}
              name="description"
              autogrow
              .value=${this.config.description || ""}
              @change=${this._valueChanged}
            ></ha-textarea>
            <ha-select
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.modes.label"
              )}
              .value=${this.config.mode || AUTOMATION_DEFAULT_MODE}
              @selected=${this._modeChanged}
              fixedMenuPosition
              .helper=${html`
                <a
                  style="color: var(--secondary-text-color)"
                  href=${documentationUrl(this.hass, "/docs/automation/modes/")}
                  target="_blank"
                  rel="noreferrer"
                  >${this.hass.localize(
                    "ui.panel.config.automation.editor.modes.learn_more"
                  )}</a
                >
              `}
            >
              ${MODES.map(
                (mode) => html`
                  <mwc-list-item .value=${mode}>
                    ${this.hass.localize(
                      `ui.panel.config.automation.editor.modes.${mode}`
                    ) || mode}
                  </mwc-list-item>
                `
              )}
            </ha-select>
            ${this.config.mode && isMaxMode(this.config.mode)
              ? html`
                  <br /><ha-textfield
                    .label=${this.hass.localize(
                      `ui.panel.config.automation.editor.max.${this.config.mode}`
                    )}
                    type="number"
                    name="max"
                    .value=${this.config.max || "10"}
                    @change=${this._valueChanged}
                    class="max"
                  >
                  </ha-textfield>
                `
              : html``}
          </div>
        </ha-expansion-panel>
      </ha-card>

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
      ></ha-automation-condition>

      <div class="header">
        <h2 id="actions-heading" class="name">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.actions.header"
          )}
        </h2>
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

      <ha-automation-action
        role="region"
        aria-labelledby="actions-heading"
        .actions=${this.config.action}
        @value-changed=${this._actionChanged}
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></ha-automation-action>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as any;
    const name = target.name;
    if (!name) {
      return;
    }
    let newVal = target.value;
    if (target.type === "number") {
      newVal = Number(newVal);
    }
    if ((this.config![name] || "") === newVal) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this.config!, [name]: newVal },
    });
  }

  private _modeChanged(ev) {
    const mode = ev.target.value;

    if (
      mode === this.config!.mode ||
      (!this.config!.mode && mode === MODES[0])
    ) {
      return;
    }
    const value = {
      ...this.config!,
      mode,
    };

    if (!isMaxMode(mode)) {
      delete value.max;
    }

    fireEvent(this, "value-changed", {
      value,
    });
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
        ha-textarea,
        ha-textfield {
          display: block;
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
        .card-content ha-textarea:first-child {
          margin-top: -16px;
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

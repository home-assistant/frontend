import "@material/mwc-button/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-input/paper-textarea";
import { PaperListboxElement } from "@polymer/paper-listbox";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  LitElement,
  property,
} from "lit-element";
import { html } from "lit-html";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-card";
import {
  Condition,
  ManualAutomationConfig,
  Trigger,
  triggerAutomation,
} from "../../../data/automation";
import { Action, MODES, MODES_MAX } from "../../../data/script";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "../ha-config-section";
import "./action/ha-automation-action";
import "./condition/ha-automation-condition";
import "./trigger/ha-automation-trigger";

@customElement("manual-automation-editor")
export class HaManualAutomationEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public config!: ManualAutomationConfig;

  @property() public stateObj?: HassEntity;

  protected render() {
    return html`<ha-config-section .isWide=${this.isWide}>
        ${!this.narrow
          ? html` <span slot="header">${this.config.alias}</span> `
          : ""}
        <span slot="introduction">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.introduction"
          )}
        </span>
        <ha-card>
          <div class="card-content">
            <paper-input
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.alias"
              )}
              name="alias"
              .value=${this.config.alias}
              @value-changed=${this._valueChanged}
            >
            </paper-input>
            <paper-textarea
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.description.label"
              )}
              .placeholder=${this.hass.localize(
                "ui.panel.config.automation.editor.description.placeholder"
              )}
              name="description"
              .value=${this.config.description}
              @value-changed=${this._valueChanged}
            ></paper-textarea>
            <p>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.modes.description",
                "documentation_link",
                html`<a
                  href="${documentationUrl(
                    this.hass,
                    "/docs/automation/modes/"
                  )}"
                  target="_blank"
                  rel="noreferrer"
                  >${this.hass.localize(
                    "ui.panel.config.automation.editor.modes.documentation"
                  )}</a
                >`
              )}
            </p>
            <paper-dropdown-menu-light
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.modes.label"
              )}
              no-animations
            >
              <paper-listbox
                slot="dropdown-content"
                .selected=${this.config.mode
                  ? MODES.indexOf(this.config.mode)
                  : 0}
                @iron-select=${this._modeChanged}
              >
                ${MODES.map(
                  (mode) => html`
                    <paper-item .mode=${mode}>
                      ${this.hass.localize(
                        `ui.panel.config.automation.editor.modes.${mode}`
                      ) || mode}
                    </paper-item>
                  `
                )}
              </paper-listbox>
            </paper-dropdown-menu-light>
            ${this.config.mode && MODES_MAX.includes(this.config.mode)
              ? html`<paper-input
                  .label=${this.hass.localize(
                    `ui.panel.config.automation.editor.max.${this.config.mode}`
                  )}
                  type="number"
                  name="max"
                  .value=${this.config.max || "10"}
                  @value-changed=${this._valueChanged}
                >
                </paper-input>`
              : html``}
          </div>
          ${this.stateObj
            ? html`
                <div class="card-actions layout horizontal justified center">
                  <div class="layout horizontal center">
                    <ha-entity-toggle
                      .hass=${this.hass}
                      .stateObj=${this.stateObj!}
                    ></ha-entity-toggle>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.enable_disable"
                    )}
                  </div>
                  <mwc-button
                    @click=${this._excuteAutomation}
                    .stateObj=${this.stateObj}
                  >
                    ${this.hass.localize("ui.card.automation.trigger")}
                  </mwc-button>
                </div>
              `
            : ""}
        </ha-card>
      </ha-config-section>

      <ha-config-section .isWide=${this.isWide}>
        <span slot="header">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.header"
          )}
        </span>
        <span slot="introduction">
          <p>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.introduction"
            )}
          </p>
          <a
            href="${documentationUrl(this.hass, "/docs/automation/trigger/")}"
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.learn_more"
            )}
          </a>
        </span>
        <ha-automation-trigger
          .triggers=${this.config.trigger}
          @value-changed=${this._triggerChanged}
          .hass=${this.hass}
        ></ha-automation-trigger>
      </ha-config-section>

      <ha-config-section .isWide=${this.isWide}>
        <span slot="header">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.conditions.header"
          )}
        </span>
        <span slot="introduction">
          <p>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.introduction"
            )}
          </p>
          <a
            href="${documentationUrl(this.hass, "/docs/scripts/conditions/")}"
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.learn_more"
            )}
          </a>
        </span>
        <ha-automation-condition
          .conditions=${this.config.condition || []}
          @value-changed=${this._conditionChanged}
          .hass=${this.hass}
        ></ha-automation-condition>
      </ha-config-section>

      <ha-config-section .isWide=${this.isWide}>
        <span slot="header">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.actions.header"
          )}
        </span>
        <span slot="introduction">
          <p>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.actions.introduction"
            )}
          </p>
          <a
            href="${documentationUrl(this.hass, "/docs/automation/action/")}"
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize(
              "ui.panel.config.automation.editor.actions.learn_more"
            )}
          </a>
        </span>
        <ha-automation-action
          .actions=${this.config.action}
          @value-changed=${this._actionChanged}
          .hass=${this.hass}
        ></ha-automation-action>
      </ha-config-section>`;
  }

  private _excuteAutomation(ev: Event) {
    triggerAutomation(this.hass, (ev.target as any).stateObj.entity_id);
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as any;
    const name = target.name;
    if (!name) {
      return;
    }
    let newVal = ev.detail.value;
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

  private _modeChanged(ev: CustomEvent) {
    const mode = ((ev.target as PaperListboxElement)?.selectedItem as any)
      ?.mode;

    if (mode === this.config!.mode) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.config!,
        mode,
        max: !MODES_MAX.includes(mode) ? undefined : this.config.max,
      },
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

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ha-card {
          overflow: hidden;
        }
        span[slot="introduction"] a {
          color: var(--primary-color);
        }
        p {
          margin-bottom: 0;
        }
        ha-entity-toggle {
          margin-right: 8px;
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

import "@material/mwc-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";

import {
  mdiGestureDoubleTap,
  mdiGestureTap,
  mdiGestureTapHold,
  mdiPencil,
} from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import type { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";

import "../../../components/ha-svg-icon";

import { fireEvent } from "../../../common/dom/fire_event";
import { ActionConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

export interface EditActionEvent {
  type: string;
}

export interface UpdateActionEvent {
  type: string;
  config: ActionConfig | undefined;
}

declare global {
  interface HASSDomEvents {
    "edit-action": EditActionEvent;
    "update-action": UpdateActionEvent;
  }
}

@customElement("hui-actions-editor")
export class HuiActionsEditor extends LitElement {
  @property({ attribute: false }) protected hass?: HomeAssistant;

  @property({ attribute: false }) protected tapAction?: ActionConfig;

  @property({ attribute: false }) protected holdAction?: ActionConfig;

  @property({ attribute: false }) protected doubleTapAction?: ActionConfig;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    const actions = [
      "more-info",
      "toggle",
      "navigate",
      "url",
      "call-service",
      "none",
    ];

    return html`
      <h3>
        ${this.hass.localize("ui.panel.lovelace.editor.card.generic.actions")}
      </h3>
      <div class="actions">
        ${this.tapAction
          ? html` <div class="action">
              <div>
                <ha-svg-icon .path=${mdiGestureTap}></ha-svg-icon>
                <span
                  >${this.hass.localize(
                    "ui.panel.lovelace.editor.card.generic.tap_action"
                  )}</span
                >
              </div>
              <div class="dropdown">
                <paper-dropdown-menu
                  .type=${"tap_action"}
                  .config=${"tapAction"}
                  @iron-select=${this._actionPicked}
                >
                  <paper-listbox
                    slot="dropdown-content"
                    attr-for-selected="value"
                    .selected=${this.tapAction?.action ?? "default"}
                  >
                    <paper-item .value=${"default"}
                      >${this.hass.localize(
                        "ui.panel.lovelace.editor.action-editor.actions.default_action"
                      )}</paper-item
                    >
                    ${actions.map((action) => {
                      return html`
                        <paper-item .value=${action}
                          >${this.hass!.localize(
                            `ui.panel.lovelace.editor.action-editor.actions.${action}`
                          )}</paper-item
                        >
                      `;
                    })}
                  </paper-listbox>
                </paper-dropdown-menu>
                <mwc-icon-button
                  .label=${this.hass!.localize(
                    "ui.components.entity.entity-picker.edit"
                  )}
                  class="edit-icon"
                  .type=${"tap_action"}
                  @click=${this._editAction}
                >
                  <ha-svg-icon
                    .path=${mdiPencil}
                    .type=${"tap_action"}
                  ></ha-svg-icon>
                </mwc-icon-button>
              </div>
            </div>`
          : ""}
        ${this.holdAction
          ? html` <div class="action">
              <div>
                <ha-svg-icon .path=${mdiGestureTapHold}></ha-svg-icon>
                <span
                  >${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.generic.hold_action"
                  )}</span
                >
              </div>
              <div class="dropdown">
                <paper-dropdown-menu
                  .type=${"hold_action"}
                  .config=${"holdAction"}
                  @iron-select=${this._actionPicked}
                >
                  <paper-listbox
                    slot="dropdown-content"
                    attr-for-selected="value"
                    .selected=${this.holdAction?.action ?? "default"}
                  >
                    <paper-item .value=${"default"}
                      >${this.hass.localize(
                        "ui.panel.lovelace.editor.action-editor.actions.default_action"
                      )}</paper-item
                    >
                    ${actions.map((action) => {
                      return html`
                        <paper-item .value=${action}
                          >${this.hass!.localize(
                            `ui.panel.lovelace.editor.action-editor.actions.${action}`
                          )}</paper-item
                        >
                      `;
                    })}
                  </paper-listbox>
                </paper-dropdown-menu>
                <mwc-icon-button
                  .label=${this.hass!.localize(
                    "ui.components.entity.entity-picker.edit"
                  )}
                  class="edit-icon"
                  .type=${"hold_action"}
                  @click=${this._editAction}
                >
                  <ha-svg-icon
                    .path=${mdiPencil}
                    .type=${"hold_action"}
                  ></ha-svg-icon>
                </mwc-icon-button>
              </div>
            </div>`
          : ""}
        ${this.doubleTapAction
          ? html` <div class="action">
              <div>
                <ha-svg-icon .path=${mdiGestureDoubleTap}></ha-svg-icon>
                <span
                  >${this.hass!.localize(
                    "ui.panel.lovelace.editor.card.generic.double_tap_action"
                  )}</span
                >
              </div>
              <div class="dropdown">
                <paper-dropdown-menu
                  .type=${"double_tap_action"}
                  .config=${"doubleTapAction"}
                  @iron-select=${this._actionPicked}
                >
                  <paper-listbox
                    slot="dropdown-content"
                    attr-for-selected="value"
                    .selected=${this.doubleTapAction?.action ?? "default"}
                  >
                    <paper-item .value=${"default"}
                      >${this.hass.localize(
                        "ui.panel.lovelace.editor.action-editor.actions.default_action"
                      )}</paper-item
                    >
                    ${actions.map((action) => {
                      return html`
                        <paper-item .value=${action}
                          >${this.hass!.localize(
                            `ui.panel.lovelace.editor.action-editor.actions.${action}`
                          )}</paper-item
                        >
                      `;
                    })}
                  </paper-listbox>
                </paper-dropdown-menu>
                <mwc-icon-button
                  .label=${this.hass!.localize(
                    "ui.components.entity.entity-picker.edit"
                  )}
                  class="edit-icon"
                  .type=${"double_tap_action"}
                  @click=${this._editAction}
                >
                  <ha-svg-icon
                    .path=${mdiPencil}
                    .type=${"double_tap_action"}
                  ></ha-svg-icon>
                </mwc-icon-button>
              </div>
            </div>`
          : ""}
      </div>
    `;
  }

  private _actionPicked(ev: CustomEvent): void {
    const config = this[(ev.currentTarget as any).config];
    ev.stopPropagation();

    if (!config || !this.hass) {
      return;
    }
    const item = ev.detail.item;
    const value = item.value;
    if (config.action === value) {
      return;
    }
    if (value === "default") {
      fireEvent(this, "update-action", {
        config: undefined,
        type: (ev.currentTarget as any).type!,
      });
      if (config.action) {
        (this.shadowRoot!.querySelector(
          "paper-listbox"
        ) as PaperListboxElement).select(config.action);
      }
      return;
    }

    fireEvent(this, "update-action", {
      config: { ...config, action: value },
      type: (ev.currentTarget as any).type!,
    });
  }

  private _editAction(ev: CustomEvent): void {
    fireEvent(this, "edit-action", {
      type: (ev.currentTarget as any).type!,
    });
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .dropdown {
          display: flex;
          align-items: center;
        }

        paper-dropdown-menu {
          margin-top: -24px;
        }

        .action {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .edit-icon {
          --mdc-icon-button-size: 36px;
          color: var(--secondary-text-color);
        }

        @media (max-width: 500px) {
          .action div {
            width: 50%;
          }
        }

        @media (max-width: 350px) {
          .action {
            display: block;
          }

          .action div {
            width: 100%;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-actions-editor": HuiActionsEditor;
  }
}

import "@material/mwc-icon-button";
import {
  mdiClose,
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

import { fireEvent } from "../../../common/dom/fire_event";
import { ActionConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

import "../../../components/ha-svg-icon";

export interface EditActionEvent {
  type: string;
}

declare global {
  interface HASSDomEvents {
    "edit-action": EditActionEvent;
    "clear-action": EditActionEvent;
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

    return html`
      <h3>
        ${this.hass!.localize("ui.panel.lovelace.editor.card.generic.actions")}
      </h3>
      <div class="actions">
        <div class="action">
          <div>
            <ha-svg-icon .path=${mdiGestureTap}></ha-svg-icon>
            <span
              >${this.hass!.localize(
                "ui.panel.lovelace.editor.card.generic.tap_action"
              )}
              -
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.action-editor.actions.${this.tapAction?.action}`
              ) ||
              this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.actions.none"
              )}</span
            >
          </div>
          <div>
            <mwc-icon-button
              aria-label=${this.hass!.localize(
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
            <mwc-icon-button
              aria-label=${this.hass!.localize(
                "ui.components.entity.entity-picker.clear"
              )}
              class="remove-icon"
              .type=${"tap_action"}
              @click=${this._clearAction}
            >
              <ha-svg-icon
                .path=${mdiClose}
                .type=${"tap_action"}
              ></ha-svg-icon>
            </mwc-icon-button>
          </div>
        </div>
        <div class="action">
          <div>
            <ha-svg-icon .path=${mdiGestureTapHold}></ha-svg-icon>
            <span
              >${this.hass!.localize(
                "ui.panel.lovelace.editor.card.generic.hold_action"
              )}
              -
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.action-editor.actions.${this.holdAction?.action}`
              ) ||
              this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.actions.none"
              )}</span
            >
          </div>
          <div>
            <mwc-icon-button
              aria-label=${this.hass!.localize(
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
            <mwc-icon-button
              aria-label=${this.hass!.localize(
                "ui.components.entity.entity-picker.clear"
              )}
              class="remove-icon"
              .type=${"hold_action"}
              @click=${this._clearAction}
            >
              <ha-svg-icon
                .path=${mdiClose}
                .type=${"hold_action"}
              ></ha-svg-icon>
            </mwc-icon-button>
          </div>
        </div>
        <div class="action">
          <div>
            <ha-svg-icon .path=${mdiGestureDoubleTap}></ha-svg-icon>
            <span
              >${this.hass!.localize(
                "ui.panel.lovelace.editor.card.generic.double_tap_action"
              )}
              -
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.action-editor.actions.${this.doubleTapAction?.action}`
              ) ||
              this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.actions.none"
              )}</span
            >
          </div>
          <div>
            <mwc-icon-button
              aria-label=${this.hass!.localize(
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
            <mwc-icon-button
              aria-label=${this.hass!.localize(
                "ui.components.entity.entity-picker.clear"
              )}
              class="remove-icon"
              .type=${"double_tap_action"}
              @click=${this._clearAction}
            >
              <ha-svg-icon
                .path=${mdiClose}
                .type=${"double_tap_action"}
              ></ha-svg-icon>
            </mwc-icon-button>
          </div>
        </div>
      </div>
    `;
  }

  private _clearAction(ev: CustomEvent): void {
    fireEvent(this, "clear-action", { type: (ev.currentTarget as any).type! });
  }

  private _editAction(ev: CustomEvent): void {
    fireEvent(this, "edit-action", { type: (ev.currentTarget as any).type! });
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .action {
          display: flex;
          align-items: center;
          text-transform: capitalize;
          justify-content: space-between;
        }

        .remove-icon,
        .edit-icon {
          --mdc-icon-button-size: 36px;
          color: var(--secondary-text-color);
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

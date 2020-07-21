import "../../../../components/ha-icon-button";
import "@polymer/paper-item/paper-item";
import "@material/mwc-list/mwc-list-item";
import "../../../../components/ha-button-menu";
import { mdiDotsVertical } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import { Condition } from "../../../../data/automation";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../../types";
import "./ha-automation-condition-editor";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";

export interface ConditionElement extends LitElement {
  condition: Condition;
}

export const handleChangeEvent = (
  element: ConditionElement,
  ev: CustomEvent
) => {
  ev.stopPropagation();
  const name = (ev.target as any)?.name;
  if (!name) {
    return;
  }
  const newVal = ev.detail.value;

  if ((element.condition[name] || "") === newVal) {
    return;
  }

  let newCondition: Condition;
  if (!newVal) {
    newCondition = { ...element.condition };
    delete newCondition[name];
  } else {
    newCondition = { ...element.condition, [name]: newVal };
  }
  fireEvent(element, "value-changed", { value: newCondition });
};

@customElement("ha-automation-condition-row")
export default class HaAutomationConditionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public condition!: Condition;

  @internalProperty() private _yamlMode = false;

  protected render() {
    if (!this.condition) {
      return html``;
    }
    return html`
      <ha-card>
        <div class="card-content">
          <div class="card-menu">
            <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
              <mwc-icon-button
                .title=${this.hass.localize("ui.common.menu")}
                .label=${this.hass.localize("ui.common.overflow_menu")}
                slot="trigger"
                ><ha-svg-icon path=${mdiDotsVertical}></ha-svg-icon
              ></mwc-icon-button>
              <mwc-list-item>
                ${this._yamlMode
                  ? this.hass.localize(
                      "ui.panel.config.automation.editor.edit_ui"
                    )
                  : this.hass.localize(
                      "ui.panel.config.automation.editor.edit_yaml"
                    )}
              </mwc-list-item>
              <mwc-list-item disabled>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.duplicate"
                )}
              </mwc-list-item>
              <mwc-list-item>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.delete"
                )}
              </mwc-list-item>
            </ha-button-menu>
          </div>
          <ha-automation-condition-editor
            .yamlMode=${this._yamlMode}
            .hass=${this.hass}
            .condition=${this.condition}
          ></ha-automation-condition-editor>
        </div>
      </ha-card>
    `;
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._switchYamlMode();
        break;
      case 1:
        break;
      case 2:
        this._onDelete();
        break;
    }
  }

  private _onDelete() {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.automation.editor.conditions.delete_confirm"
      ),
      dismissText: this.hass.localize("ui.common.no"),
      confirmText: this.hass.localize("ui.common.yes"),
      confirm: () => {
        fireEvent(this, "value-changed", { value: null });
      },
    });
  }

  private _switchYamlMode() {
    this._yamlMode = !this._yamlMode;
  }

  static get styles(): CSSResult {
    return css`
      .card-menu {
        float: right;
        z-index: 3;
        --mdc-theme-text-primary-on-background: var(--primary-text-color);
      }
      .rtl .card-menu {
        float: left;
      }
      mwc-list-item[disabled] {
        --mdc-theme-text-primary-on-background: var(--disabled-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-row": HaAutomationConditionRow;
  }
}

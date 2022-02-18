import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import { Condition } from "../../../../data/automation";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import "./ha-automation-condition-editor";

export interface ConditionElement extends LitElement {
  condition: Condition;
}

export const handleChangeEvent = (
  element: ConditionElement,
  ev: CustomEvent
) => {
  ev.stopPropagation();
  const name = (ev.currentTarget as any)?.name;
  if (!name) {
    return;
  }
  const newVal = ev.detail?.value || (ev.currentTarget as any)?.value;

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

  @state() private _yamlMode = false;

  @state() private _warnings?: string[];

  protected render() {
    if (!this.condition) {
      return html``;
    }
    return html`
      <ha-card>
        <div class="card-content">
          <div class="card-menu">
            <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
              >
              </ha-icon-button>
              <mwc-list-item>
                ${this._yamlMode
                  ? this.hass.localize(
                      "ui.panel.config.automation.editor.edit_ui"
                    )
                  : this.hass.localize(
                      "ui.panel.config.automation.editor.edit_yaml"
                    )}
              </mwc-list-item>
              <mwc-list-item>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.duplicate"
                )}
              </mwc-list-item>
              <mwc-list-item class="warning">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.delete"
                )}
              </mwc-list-item>
            </ha-button-menu>
          </div>
          ${this._warnings
            ? html`<ha-alert
                alert-type="warning"
                .title=${this.hass.localize(
                  "ui.errors.config.editor_not_supported"
                )}
              >
                ${this._warnings!.length > 0 && this._warnings![0] !== undefined
                  ? html` <ul>
                      ${this._warnings!.map(
                        (warning) => html`<li>${warning}</li>`
                      )}
                    </ul>`
                  : ""}
                ${this.hass.localize("ui.errors.config.edit_in_yaml_supported")}
              </ha-alert>`
            : ""}
          <ha-automation-condition-editor
            @ui-mode-not-available=${this._handleUiModeNotAvailable}
            @value-changed=${this._handleChangeEvent}
            .yamlMode=${this._yamlMode}
            .hass=${this.hass}
            .condition=${this.condition}
          ></ha-automation-condition-editor>
        </div>
      </ha-card>
    `;
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    // Prevent possible parent action-row from switching to yamlMode
    ev.stopPropagation();
    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this._yamlMode) {
      this._yamlMode = true;
    }
  }

  private _handleChangeEvent(ev: CustomEvent) {
    if (ev.detail.yaml) {
      this._warnings = undefined;
    }
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._switchYamlMode();
        break;
      case 1:
        fireEvent(this, "duplicate");
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
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      confirm: () => {
        fireEvent(this, "value-changed", { value: null });
      },
    });
  }

  private _switchYamlMode() {
    this._warnings = undefined;
    this._yamlMode = !this._yamlMode;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-row": HaAutomationConditionRow;
  }
}

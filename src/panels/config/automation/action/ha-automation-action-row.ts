import "@material/mwc-icon-button";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiArrowDown, mdiArrowUp, mdiDotsVertical } from "@mdi/js";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import type { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
} from "lit-element";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import type { Action } from "../../../../data/script";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "./types/ha-automation-action-choose";
import "./types/ha-automation-action-condition";
import "./types/ha-automation-action-delay";
import "./types/ha-automation-action-device_id";
import "./types/ha-automation-action-event";
import "./types/ha-automation-action-repeat";
import "./types/ha-automation-action-scene";
import "./types/ha-automation-action-service";
import "./types/ha-automation-action-wait_for_trigger";
import "./types/ha-automation-action-wait_template";

const OPTIONS = [
  "condition",
  "delay",
  "device_id",
  "event",
  "scene",
  "service",
  "wait_template",
  "wait_for_trigger",
  "repeat",
  "choose",
];

const getType = (action: Action) => {
  return OPTIONS.find((option) => option in action);
};

declare global {
  // for fire event
  interface HASSDomEvents {
    "move-action": { direction: "up" | "down" };
  }
}

export interface ActionElement extends LitElement {
  action: Action;
}

export const handleChangeEvent = (element: ActionElement, ev: CustomEvent) => {
  ev.stopPropagation();
  const name = (ev.target as any)?.name;
  if (!name) {
    return;
  }
  const newVal = ev.detail.value;

  if ((element.action[name] || "") === newVal) {
    return;
  }

  let newAction: Action;
  if (!newVal) {
    newAction = { ...element.action };
    delete newAction[name];
  } else {
    newAction = { ...element.action, [name]: newVal };
  }
  fireEvent(element, "value-changed", { value: newAction });
};

@customElement("ha-automation-action-row")
export default class HaAutomationActionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public action!: Action;

  @property() public index!: number;

  @property() public totalActions!: number;

  @internalProperty() private _warnings?: string[];

  @internalProperty() private _uiModeAvailable = true;

  @internalProperty() private _yamlMode = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    this._uiModeAvailable = Boolean(getType(this.action));
    if (!this._uiModeAvailable && !this._yamlMode) {
      this._yamlMode = true;
    }

    if (this._yamlMode && this._yamlEditor) {
      this._yamlEditor.setValue(this.action);
    }
  }

  protected render() {
    const type = getType(this.action);
    const selected = type ? OPTIONS.indexOf(type) : -1;
    const yamlMode = this._yamlMode;

    return html`
      <ha-card>
        <div class="card-content">
          <div class="card-menu">
            ${this.index !== 0
              ? html`
                  <mwc-icon-button
                    .title=${this.hass.localize(
                      "ui.panel.config.automation.editor.move_up"
                    )}
                    .label=${this.hass.localize(
                      "ui.panel.config.automation.editor.move_up"
                    )}
                    @click=${this._moveUp}
                  >
                    <ha-svg-icon .path=${mdiArrowUp}></ha-svg-icon>
                  </mwc-icon-button>
                `
              : ""}
            ${this.index !== this.totalActions - 1
              ? html`
                  <mwc-icon-button
                    .title=${this.hass.localize(
                      "ui.panel.config.automation.editor.move_down"
                    )}
                    .label=${this.hass.localize(
                      "ui.panel.config.automation.editor.move_down"
                    )}
                    @click=${this._moveDown}
                  >
                    <ha-svg-icon .path=${mdiArrowDown}></ha-svg-icon>
                  </mwc-icon-button>
                `
              : ""}
            <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
              <mwc-icon-button
                slot="trigger"
                .title=${this.hass.localize("ui.common.menu")}
                .label=${this.hass.localize("ui.common.overflow_menu")}
                ><ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
              </mwc-icon-button>
              <mwc-list-item .disabled=${!this._uiModeAvailable}>
                ${yamlMode
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
            ? html`<div class="warning">
                UI editor is not supported for this config:
                <br />
                <ul>
                  ${this._warnings.map((warning) => html`<li>${warning}</li>`)}
                </ul>
                You can still edit your config in YAML.
              </div>`
            : ""}
          ${yamlMode
            ? html`
                ${selected === -1
                  ? html`
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.actions.unsupported_action",
                        "action",
                        type
                      )}
                    `
                  : ""}
                <h2>Edit in YAML</h2>
                <ha-yaml-editor
                  .defaultValue=${this.action}
                  @value-changed=${this._onYamlChange}
                ></ha-yaml-editor>
              `
            : html`
                <paper-dropdown-menu-light
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.actions.type_select"
                  )}
                  no-animations
                >
                  <paper-listbox
                    slot="dropdown-content"
                    .selected=${selected}
                    @iron-select=${this._typeChanged}
                  >
                    ${OPTIONS.map(
                      (opt) => html`
                        <paper-item .action=${opt}>
                          ${this.hass.localize(
                            `ui.panel.config.automation.editor.actions.type.${opt}.label`
                          )}
                        </paper-item>
                      `
                    )}
                  </paper-listbox>
                </paper-dropdown-menu-light>
                <div @ui-mode-not-available=${this._handleUiModeNotAvailable}>
                  ${dynamicElement(`ha-automation-action-${type}`, {
                    hass: this.hass,
                    action: this.action,
                  })}
                </div>
              `}
        </div>
      </ha-card>
    `;
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this._yamlMode) {
      this._yamlMode = true;
    }
  }

  private _moveUp() {
    fireEvent(this, "move-action", { direction: "up" });
  }

  private _moveDown() {
    fireEvent(this, "move-action", { direction: "down" });
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
        "ui.panel.config.automation.editor.actions.delete_confirm"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      confirm: () => {
        fireEvent(this, "value-changed", { value: null });
      },
    });
  }

  private _typeChanged(ev: CustomEvent) {
    const type = ((ev.target as PaperListboxElement)?.selectedItem as any)
      ?.action;

    if (!type) {
      return;
    }

    this._uiModeAvailable = OPTIONS.includes(type);
    if (!this._uiModeAvailable && !this._yamlMode) {
      this._yamlMode = false;
    }

    if (type !== getType(this.action)) {
      const elClass = customElements.get(`ha-automation-action-${type}`);

      fireEvent(this, "value-changed", {
        value: {
          ...elClass.defaultConfig,
        },
      });
    }
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  private _switchYamlMode() {
    this._yamlMode = !this._yamlMode;
  }

  static get styles(): CSSResult[] {
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
        .warning {
          margin-bottom: 8px;
        }
        .warning ul {
          margin: 4px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-row": HaAutomationActionRow;
  }
}

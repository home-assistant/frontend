import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import type { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import type { Trigger } from "../../../../data/automation";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "./types/ha-automation-trigger-device";
import "./types/ha-automation-trigger-event";
import "./types/ha-automation-trigger-geo_location";
import "./types/ha-automation-trigger-homeassistant";
import "./types/ha-automation-trigger-mqtt";
import "./types/ha-automation-trigger-numeric_state";
import "./types/ha-automation-trigger-state";
import "./types/ha-automation-trigger-sun";
import "./types/ha-automation-trigger-tag";
import "./types/ha-automation-trigger-template";
import "./types/ha-automation-trigger-time";
import "./types/ha-automation-trigger-time_pattern";
import "./types/ha-automation-trigger-webhook";
import "./types/ha-automation-trigger-zone";

const OPTIONS = [
  "device",
  "event",
  "state",
  "geo_location",
  "homeassistant",
  "mqtt",
  "numeric_state",
  "sun",
  "tag",
  "template",
  "time",
  "time_pattern",
  "webhook",
  "zone",
];

export interface TriggerElement extends LitElement {
  trigger: Trigger;
}

export const handleChangeEvent = (element: TriggerElement, ev: CustomEvent) => {
  ev.stopPropagation();
  const name = (ev.target as any)?.name;
  if (!name) {
    return;
  }
  const newVal = ev.detail.value;

  if ((element.trigger[name] || "") === newVal) {
    return;
  }

  let newTrigger: Trigger;
  if (!newVal) {
    newTrigger = { ...element.trigger };
    delete newTrigger[name];
  } else {
    newTrigger = { ...element.trigger, [name]: newVal };
  }
  fireEvent(element, "value-changed", { value: newTrigger });
};

@customElement("ha-automation-trigger-row")
export default class HaAutomationTriggerRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: Trigger;

  @state() private _warnings?: string[];

  @state() private _yamlMode = false;

  protected render() {
    const selected = OPTIONS.indexOf(this.trigger.platform);
    const yamlMode = this._yamlMode || selected === -1;

    return html`
      <ha-card>
        <div class="card-content">
          <div class="card-menu">
            <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
              <mwc-icon-button
                slot="trigger"
                .title=${this.hass.localize("ui.common.menu")}
                .label=${this.hass.localize("ui.common.overflow_menu")}
                ><ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon
              ></mwc-icon-button>
              <mwc-list-item .disabled=${selected === -1}>
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
                ${this.hass.localize("ui.errors.config.editor_not_supported")}:
                <br />
                ${this._warnings!.length > 0 && this._warnings![0] !== undefined
                  ? html` <ul>
                      ${this._warnings!.map(
                        (warning) => html`<li>${warning}</li>`
                      )}
                    </ul>`
                  : ""}
                ${this.hass.localize("ui.errors.config.edit_in_yaml_supported")}
              </div>`
            : ""}
          ${yamlMode
            ? html`
                ${selected === -1
                  ? html`
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.triggers.unsupported_platform",
                        "platform",
                        this.trigger.platform
                      )}
                    `
                  : ""}
                <h2>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.edit_yaml"
                  )}
                </h2>
                <ha-yaml-editor
                  .defaultValue=${this.trigger}
                  @value-changed=${this._onYamlChange}
                ></ha-yaml-editor>
              `
            : html`
                <paper-dropdown-menu-light
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.triggers.type_select"
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
                        <paper-item .platform=${opt}>
                          ${this.hass.localize(
                            `ui.panel.config.automation.editor.triggers.type.${opt}.label`
                          )}
                        </paper-item>
                      `
                    )}
                  </paper-listbox>
                </paper-dropdown-menu-light>
                <paper-input
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.triggers.id"
                  )}
                  .value=${this.trigger.id}
                  @value-changed=${this._idChanged}
                >
                </paper-input>
                <div @ui-mode-not-available=${this._handleUiModeNotAvailable}>
                  ${dynamicElement(
                    `ha-automation-trigger-${this.trigger.platform}`,
                    { hass: this.hass, trigger: this.trigger }
                  )}
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
        "ui.panel.config.automation.editor.triggers.delete_confirm"
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
      ?.platform;

    if (!type) {
      return;
    }

    const elClass = customElements.get(`ha-automation-trigger-${type}`);

    if (type !== this.trigger.platform) {
      const value = {
        platform: type,
        ...elClass.defaultConfig,
      };
      if (this.trigger.id) {
        value.id = this.trigger.id;
      }
      fireEvent(this, "value-changed", {
        value,
      });
    }
  }

  private _idChanged(ev: CustomEvent) {
    const newId = ev.detail.value;
    if (newId === this.trigger.id) {
      return;
    }
    const value = { ...this.trigger };
    if (!newId) {
      delete value.id;
    } else {
      value.id = newId;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    fireEvent(this, "value-changed", { value: ev.detail.value });
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
    "ha-automation-trigger-row": HaAutomationTriggerRow;
  }
}

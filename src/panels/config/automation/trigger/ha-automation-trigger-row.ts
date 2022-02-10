import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import "@material/mwc-select";
import type { Select } from "@material/mwc-select";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stringCompare } from "../../../../common/string/compare";
import { handleStructError } from "../../../../common/structs/handle-errors";
import { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-alert";
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
  const name = (ev.currentTarget as any)?.name;
  if (!name) {
    return;
  }
  const newVal = (ev.target as any)?.value;

  if ((element.trigger[name] || "") === newVal) {
    return;
  }

  let newTrigger: Trigger;
  if (newVal === undefined || newVal === "") {
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

  @state() private _requestShowId = false;

  private _processedTypes = memoizeOne(
    (localize: LocalizeFunc): [string, string][] =>
      OPTIONS.map(
        (action) =>
          [
            action,
            localize(
              `ui.panel.config.automation.editor.triggers.type.${action}.label`
            ),
          ] as [string, string]
      ).sort((a, b) => stringCompare(a[1], b[1]))
  );

  protected render() {
    const selected = OPTIONS.indexOf(this.trigger.platform);
    const yamlMode = this._yamlMode || selected === -1;
    const showId = "id" in this.trigger || this._requestShowId;

    return html`
      <ha-card>
        <div class="card-content">
          <div class="card-menu">
            <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
              ></ha-icon-button>
              <mwc-list-item>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.triggers.edit_id"
                )}
              </mwc-list-item>
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
            ? html`<ha-alert
                alert-type="warning"
                .title=${this.hass.localize(
                  "ui.errors.config.editor_not_supported"
                )}
              >
                ${this._warnings.length && this._warnings[0] !== undefined
                  ? html` <ul>
                      ${this._warnings.map(
                        (warning) => html`<li>${warning}</li>`
                      )}
                    </ul>`
                  : ""}
                ${this.hass.localize("ui.errors.config.edit_in_yaml_supported")}
              </ha-alert>`
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
                  .hass=${this.hass}
                  .defaultValue=${this.trigger}
                  @value-changed=${this._onYamlChange}
                ></ha-yaml-editor>
              `
            : html`
                <mwc-select
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.triggers.type_select"
                  )}
                  .value=${this.trigger.platform}
                  naturalMenuWidth
                  @selected=${this._typeChanged}
                >
                  ${this._processedTypes(this.hass.localize).map(
                    ([opt, label]) => html`
                      <mwc-list-item .value=${opt}>${label}</mwc-list-item>
                    `
                  )}
                </mwc-select>

                ${showId
                  ? html`
                      <paper-input
                        .label=${this.hass.localize(
                          "ui.panel.config.automation.editor.triggers.id"
                        )}
                        .value=${this.trigger.id}
                        @value-changed=${this._idChanged}
                      >
                      </paper-input>
                    `
                  : ""}
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
        this._requestShowId = true;
        break;
      case 1:
        this._switchYamlMode();
        break;
      case 2:
        fireEvent(this, "duplicate");
        break;
      case 3:
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
    const type = (ev.target as Select).value;

    if (!type) {
      return;
    }

    const elClass = customElements.get(
      `ha-automation-trigger-${type}`
    ) as CustomElementConstructor & {
      defaultConfig: Omit<Trigger, "platform">;
    };

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
    if (newId === (this.trigger.id ?? "")) {
      return;
    }
    this._requestShowId = true;
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
    this._warnings = undefined;
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
        mwc-select {
          margin-bottom: 16px;
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

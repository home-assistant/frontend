import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-select";
import type { Select } from "@material/mwc-select";
import { mdiArrowDown, mdiArrowUp, mdiDotsVertical } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stringCompare } from "../../../../common/string/compare";
import { handleStructError } from "../../../../common/structs/handle-errors";
import { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-alert";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import { Action, getActionType } from "../../../../data/script";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "./types/ha-automation-action-activate_scene";
import "./types/ha-automation-action-choose";
import "./types/ha-automation-action-condition";
import "./types/ha-automation-action-delay";
import "./types/ha-automation-action-device_id";
import "./types/ha-automation-action-event";
import "./types/ha-automation-action-play_media";
import "./types/ha-automation-action-repeat";
import "./types/ha-automation-action-service";
import "./types/ha-automation-action-wait_for_trigger";
import "./types/ha-automation-action-wait_template";

const OPTIONS = [
  "condition",
  "delay",
  "event",
  "play_media",
  "activate_scene",
  "service",
  "wait_template",
  "wait_for_trigger",
  "repeat",
  "choose",
  "device_id",
];

const getType = (action: Action | undefined) => {
  if (!action) {
    return undefined;
  }
  if ("service" in action || "scene" in action) {
    return getActionType(action);
  }
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

  @property({ type: Boolean }) public narrow = false;

  @state() private _warnings?: string[];

  @state() private _uiModeAvailable = true;

  @state() private _yamlMode = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  private _processedTypes = memoizeOne(
    (localize: LocalizeFunc): [string, string][] =>
      OPTIONS.map(
        (action) =>
          [
            action,
            localize(
              `ui.panel.config.automation.editor.actions.type.${action}.label`
            ),
          ] as [string, string]
      ).sort((a, b) => stringCompare(a[1], b[1]))
  );

  protected willUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    this._uiModeAvailable = getType(this.action) !== undefined;
    if (!this._uiModeAvailable && !this._yamlMode) {
      this._yamlMode = true;
    }
  }

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    if (this._yamlMode) {
      const yamlEditor = this._yamlEditor;
      if (yamlEditor && yamlEditor.value !== this.action) {
        yamlEditor.setValue(this.action);
      }
    }
  }

  protected render() {
    const type = getType(this.action);
    const yamlMode = this._yamlMode;

    return html`
      <ha-card>
        <div class="card-content">
          <div class="card-menu">
            ${this.index !== 0
              ? html`
                  <ha-icon-button
                    .label=${this.hass.localize(
                      "ui.panel.config.automation.editor.move_up"
                    )}
                    .path=${mdiArrowUp}
                    @click=${this._moveUp}
                  ></ha-icon-button>
                `
              : ""}
            ${this.index !== this.totalActions - 1
              ? html`
                  <ha-icon-button
                    .label=${this.hass.localize(
                      "ui.panel.config.automation.editor.move_down"
                    )}
                    .path=${mdiArrowDown}
                    @click=${this._moveDown}
                  ></ha-icon-button>
                `
              : ""}
            <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
              ></ha-icon-button>
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
          ${yamlMode
            ? html`
                ${type === undefined
                  ? html`
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.actions.unsupported_action",
                        "action",
                        type
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
                  .defaultValue=${this.action}
                  @value-changed=${this._onYamlChange}
                ></ha-yaml-editor>
              `
            : html`
                <mwc-select
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.actions.type_select"
                  )}
                  .value=${getType(this.action)}
                  naturalMenuWidth
                  @selected=${this._typeChanged}
                >
                  ${this._processedTypes(this.hass.localize).map(
                    ([opt, label]) => html`
                      <mwc-list-item .value=${opt}>${label}</mwc-list-item>
                    `
                  )}
                </mwc-select>

                <div @ui-mode-not-available=${this._handleUiModeNotAvailable}>
                  ${dynamicElement(`ha-automation-action-${type}`, {
                    hass: this.hass,
                    action: this.action,
                    narrow: this.narrow,
                  })}
                </div>
              `}
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
    const type = (ev.target as Select).value;

    if (!type) {
      return;
    }

    this._uiModeAvailable = OPTIONS.includes(type);
    if (!this._uiModeAvailable && !this._yamlMode) {
      this._yamlMode = false;
    }

    if (type !== getType(this.action)) {
      const elClass = customElements.get(
        `ha-automation-action-${type}`
      ) as CustomElementConstructor & { defaultConfig: Action };

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
    this._warnings = undefined;
    this._yamlMode = !this._yamlMode;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .card-menu {
          position: absolute;
          right: 16px;
          z-index: 3;
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }
        .rtl .card-menu {
          right: initial;
          left: 16px;
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
        mwc-select {
          margin-bottom: 16px;
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

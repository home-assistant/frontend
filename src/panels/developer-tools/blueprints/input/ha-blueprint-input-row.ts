import type { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiContentCopy,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiGroup,
  mdiPlaylistEdit,
  mdiRenameBox,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import type {
  BlueprintInputSection,
  BlueprintClipboard,
  BlueprintInput,
} from "../../../../data/blueprint";
import { INPUT_ICONS } from "../../../../data/blueprint";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "./ha-blueprint-input-editor";
import "../../../../components/ha-alert";

const preventDefault = (ev) => ev.preventDefault();

@customElement("ha-blueprint-input-row")
export default class HaBlueprintInputRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public input!: [
    string,
    BlueprintInput | BlueprintInputSection | null,
  ];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public first?: boolean;

  @property({ type: Boolean }) public last?: boolean;

  @property({ type: Number }) public index!: number;

  @storage({
    key: "blueprintClipboard",
    state: false,
    subscribe: true,
    storage: "sessionStorage",
  })
  public _clipboard?: BlueprintClipboard;

  @state() private _yamlMode = false;

  @state() private _warnings?: string[];

  @state() private _testing = false;

  @state() private _testingResult?: boolean;

  private _inputIsSection(x: any): x is BlueprintInputSection {
    return "input" in x;
  }

  protected render() {
    if (!this.input || !this.input[1]) {
      return nothing;
    }

    const icon = this._inputIsSection(this.input[1])
      ? mdiGroup
      : INPUT_ICONS[Object.keys(this.input[1].selector!)[0]];

    return html`
      <ha-card outlined>
        <ha-expansion-panel leftChevron>
          <h3 slot="header">
            <ha-svg-icon class="input-icon" .path=${icon}></ha-svg-icon>
            ${this.input[0]}
          </h3>

          <slot name="icons" slot="icons"></slot>

          <ha-button-menu
            slot="icons"
            @action=${this._handleAction}
            @click=${preventDefault}
            @closed=${stopPropagation}
            fixed
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            >
            </ha-icon-button>

            <ha-list-item graphic="icon" .disabled=${this.disabled}>
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.inputs.rename"
              )}
              <ha-svg-icon slot="graphic" .path=${mdiRenameBox}></ha-svg-icon>
            </ha-list-item>

            <li divider role="separator"></li>

            <ha-list-item graphic="icon" .disabled=${this.disabled}>
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.actions.duplicate"
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiContentDuplicate}
              ></ha-svg-icon>
            </ha-list-item>

            <ha-list-item graphic="icon" .disabled=${this.disabled}>
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.inputs.copy"
              )}
              <ha-svg-icon slot="graphic" .path=${mdiContentCopy}></ha-svg-icon>
            </ha-list-item>

            <ha-list-item graphic="icon" .disabled=${this.disabled}>
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.inputs.cut"
              )}
              <ha-svg-icon slot="graphic" .path=${mdiContentCut}></ha-svg-icon>
            </ha-list-item>

            <ha-list-item
              graphic="icon"
              .disabled=${this.disabled || this.first}
            >
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.move_up"
              )}
              <ha-svg-icon slot="graphic" .path=${mdiArrowUp}></ha-svg-icon
            ></ha-list-item>

            <ha-list-item
              graphic="icon"
              .disabled=${this.disabled || this.last}
            >
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.move_down"
              )}
              <ha-svg-icon slot="graphic" .path=${mdiArrowDown}></ha-svg-icon
            ></ha-list-item>

            <ha-list-item graphic="icon" .disabled=${this._warnings}>
              ${this.hass.localize(
                `ui.panel.developer-tools.tabs.blueprints.editor.edit_${!this._yamlMode ? "yaml" : "ui"}`
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiPlaylistEdit}
              ></ha-svg-icon>
            </ha-list-item>

            <li divider role="separator"></li>

            <ha-list-item
              class="warning"
              graphic="icon"
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.actions.delete"
              )}
              <ha-svg-icon
                class="warning"
                slot="graphic"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </ha-list-item>
          </ha-button-menu>

          <div class=${classMap({ "card-content": true })}>
            ${this._warnings
              ? html`<ha-alert
                  alert-type="warning"
                  .title=${this.hass.localize(
                    "ui.errors.config.editor_not_supported"
                  )}
                >
                  ${this._warnings!.length > 0 &&
                  this._warnings![0] !== undefined
                    ? html` <ul>
                        ${this._warnings!.map(
                          (warning) => html`<li>${warning}</li>`
                        )}
                      </ul>`
                    : ""}
                  ${this.hass.localize(
                    "ui.errors.config.edit_in_yaml_supported"
                  )}
                </ha-alert>`
              : ""}
            <ha-blueprint-input-editor
              @ui-mode-not-available=${this._handleUiModeNotAvailable}
              @value-changed=${this._handleChangeEvent}
              .yamlMode=${this._yamlMode}
              .disabled=${this.disabled}
              .hass=${this.hass}
              .input=${this.input[1]}
            ></ha-blueprint-input-editor>
          </div>
        </ha-expansion-panel>
        <div
          class="testing ${classMap({
            active: this._testing,
            pass: this._testingResult === true,
            error: this._testingResult === false,
          })}"
        >
          ${this._testingResult
            ? this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.inputs.testing_pass"
              )
            : this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.inputs.testing_error"
              )}
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
    ev.stopPropagation();
    if (ev.detail.yaml) {
      this._warnings = undefined;
    }

    fireEvent(this, "value-changed", {
      value: [this.input[0], ev.detail.value],
    });
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._renameInput();
        break;
      case 1:
        fireEvent(this, "duplicate");
        break;
      case 2:
        this._setClipboard();
        break;
      case 3:
        this._setClipboard();
        fireEvent(this, "value-changed", { value: null });
        break;
      case 4:
        fireEvent(this, "move-up");
        break;
      case 5:
        fireEvent(this, "move-down");
        break;
      case 6:
        if (this._yamlMode) {
          this._switchUiMode();
        } else {
          this._switchYamlMode();
        }
        this.expand();
        break;
      case 7:
        this._onDelete();
        break;
    }
  }

  private _setClipboard() {
    this._clipboard = {
      ...this._clipboard,
      input: deepClone(this.input),
    };
  }

  private _onDelete() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.developer-tools.tabs.blueprints.editor.inputs.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.developer-tools.tabs.blueprints.editor.inputs.delete_confirm_text"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: () => {
        fireEvent(this, "value-changed", { value: null });
      },
    });
  }

  private _switchUiMode() {
    this._warnings = undefined;
    this._yamlMode = false;
  }

  private _switchYamlMode() {
    this._warnings = undefined;
    this._yamlMode = true;
  }

  private async _renameInput(): Promise<void> {
    const id = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.developer-tools.tabs.blueprints.editor.inputs.change_id"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.developer-tools.tabs.blueprints.editor.inputs.id"
      ),
      inputType: "string",
      placeholder: this.input[0],
      defaultValue: this.input[0],
      confirmText: this.hass.localize("ui.common.submit"),
    });
    if (!id) {
      // This shouldn't be possible
      return;
    }

    const value = [id, this.input[1]];
    fireEvent(this, "value-changed", {
      value,
    });
  }

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-button-menu {
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }
        .disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 0 0 8px;
          --expansion-panel-content-padding: 0;
        }
        h3 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }
        .input-icon {
          display: none;
        }
        @media (min-width: 870px) {
          .input-icon {
            display: inline-block;
            color: var(--secondary-text-color);
            opacity: 0.9;
            margin-right: 8px;
            margin-inline-end: 8px;
            margin-inline-start: initial;
          }
        }
        .card-content {
          padding: 16px;
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: var(--ha-card-border-radius, 12px);
          border-top-left-radius: var(--ha-card-border-radius, 12px);
        }
        ha-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
        ha-list-item.hidden {
          display: none;
        }
        .testing {
          position: absolute;
          top: 0px;
          right: 0px;
          left: 0px;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 14px;
          background-color: var(--divider-color, #e0e0e0);
          color: var(--text-primary-color);
          max-height: 0px;
          overflow: hidden;
          transition: max-height 0.3s;
          text-align: center;
          border-top-right-radius: var(--ha-card-border-radius, 12px);
          border-top-left-radius: var(--ha-card-border-radius, 12px);
        }
        .testing.active {
          max-height: 100px;
        }
        .testing.error {
          background-color: var(--accent-color);
        }
        .testing.pass {
          background-color: var(--success-color);
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-input-row": HaBlueprintInputRow;
  }
}

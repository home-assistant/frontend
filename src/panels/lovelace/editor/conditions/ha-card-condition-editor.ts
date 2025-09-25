import type { ActionDetail } from "@material/mwc-list";
import {
  mdiContentCopy,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiFlask,
  mdiPlaylistEdit,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefault } from "../../../../common/dom/prevent_default";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-alert";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-yaml-editor";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { ICON_CONDITION } from "../../common/icon-condition";
import type {
  Condition,
  LegacyCondition,
} from "../../common/validate-condition";
import {
  checkConditionsMet,
  validateConditionalConfig,
} from "../../common/validate-condition";
import type { LovelaceConditionEditorConstructor } from "./types";
import { storage } from "../../../../common/decorators/storage";

@customElement("ha-card-condition-editor")
export class HaCardConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) condition!: Condition | LegacyCondition;

  @storage({
    key: "dashboardConditionClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: Condition | LegacyCondition;

  @state() public _yamlMode = false;

  @state() public _uiAvailable = false;

  @state() public _uiWarnings: string[] = [];

  @state() _condition?: Condition;

  @state() private _testingResult?: boolean;

  private get _editor() {
    if (!this._condition) return undefined;
    return customElements.get(
      `ha-card-condition-${this._condition.condition}`
    ) as LovelaceConditionEditorConstructor | undefined;
  }

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("condition")) {
      this._condition = {
        ...this.condition,
      } as Condition;
      const validator = this._editor?.validateUIConfig;
      if (validator) {
        try {
          validator(this._condition, this.hass);
          this._uiAvailable = true;
          this._uiWarnings = [];
        } catch (err) {
          this._uiWarnings = handleStructError(
            this.hass,
            err as Error
          ).warnings;
          this._uiAvailable = false;
        }
      } else {
        this._uiAvailable = false;
        this._uiWarnings = [];
      }

      if (!this._uiAvailable && !this._yamlMode) {
        this._yamlMode = true;
      }
    }
  }

  protected render() {
    const condition = this._condition;

    if (!condition) return nothing;

    return html`
      <div class="container">
        <ha-expansion-panel left-chevron>
          <ha-svg-icon
            slot="leading-icon"
            class="condition-icon"
            .path=${ICON_CONDITION[condition.condition]}
          ></ha-svg-icon>
          <h3 slot="header">
            ${this.hass.localize(
              `ui.panel.lovelace.editor.condition-editor.condition.${condition.condition}.label`
            ) || condition.condition}
          </h3>
          <ha-button-menu
            slot="icons"
            @action=${this._handleAction}
            @click=${preventDefault}
            @closed=${stopPropagation}
            fixed
            .corner=${"BOTTOM_END"}
            menu-corner="END"
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            >
            </ha-icon-button>

            <ha-list-item graphic="icon">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.condition-editor.test"
              )}
              <ha-svg-icon slot="graphic" .path=${mdiFlask}></ha-svg-icon>
            </ha-list-item>

            <ha-list-item graphic="icon">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.edit_card.duplicate"
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiContentDuplicate}
              ></ha-svg-icon>
            </ha-list-item>

            <ha-list-item graphic="icon">
              ${this.hass.localize("ui.panel.lovelace.editor.edit_card.copy")}
              <ha-svg-icon slot="graphic" .path=${mdiContentCopy}></ha-svg-icon>
            </ha-list-item>

            <ha-list-item graphic="icon">
              ${this.hass.localize("ui.panel.lovelace.editor.edit_card.cut")}
              <ha-svg-icon slot="graphic" .path=${mdiContentCut}></ha-svg-icon>
            </ha-list-item>

            <ha-list-item graphic="icon" .disabled=${!this._uiAvailable}>
              ${this.hass.localize(
                `ui.panel.lovelace.editor.edit_view.edit_${!this._yamlMode ? "yaml" : "ui"}`
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiPlaylistEdit}
              ></ha-svg-icon>
            </ha-list-item>

            <li divider role="separator"></li>

            <ha-list-item class="warning" graphic="icon">
              ${this.hass!.localize("ui.common.delete")}
              <ha-svg-icon
                class="warning"
                slot="graphic"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </ha-list-item>
          </ha-button-menu>
          ${!this._uiAvailable
            ? html`
                <ha-alert
                  alert-type="warning"
                  .title=${this.hass.localize(
                    "ui.errors.config.editor_not_supported"
                  )}
                >
                  ${this._uiWarnings!.length > 0 &&
                  this._uiWarnings![0] !== undefined
                    ? html`
                        <ul>
                          ${this._uiWarnings!.map(
                            (warning) => html`<li>${warning}</li>`
                          )}
                        </ul>
                      `
                    : nothing}
                  ${this.hass.localize(
                    "ui.errors.config.edit_in_yaml_supported"
                  )}
                </ha-alert>
              `
            : nothing}
          <div class="content">
            ${this._yamlMode
              ? html`
                  <ha-yaml-editor
                    .hass=${this.hass}
                    .defaultValue=${this.condition}
                    @value-changed=${this._onYamlChange}
                  ></ha-yaml-editor>
                `
              : html`
                  ${dynamicElement(`ha-card-condition-${condition.condition}`, {
                    hass: this.hass,
                    condition: condition,
                  })}
                `}
          </div>
        </ha-expansion-panel>
        <div
          class="testing ${classMap({
            active: this._testingResult !== undefined,
            pass: this._testingResult === true,
            error: this._testingResult === false,
          })}"
        >
          ${this._testingResult
            ? this.hass.localize(
                "ui.panel.lovelace.editor.condition-editor.testing_pass"
              )
            : this._testingResult === false
              ? this.hass.localize(
                  "ui.panel.lovelace.editor.condition-editor.testing_error"
                )
              : nothing}
        </div>
      </div>
    `;
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._testCondition();
        break;
      case 1:
        this._duplicateCondition();
        break;
      case 2:
        this._copyCondition();
        break;
      case 3:
        this._cutCondition();
        break;
      case 4:
        this._yamlMode = !this._yamlMode;
        break;
      case 5:
        this._delete();
        break;
    }
  }

  private _timeout?: number;

  private async _testCondition() {
    if (this._timeout) {
      window.clearTimeout(this._timeout);
      this._timeout = undefined;
    }
    this._testingResult = undefined;
    const condition = this.condition;

    const validateResult = validateConditionalConfig([this.condition]);

    if (!validateResult) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.lovelace.editor.condition-editor.invalid_config_title"
        ),
        text: this.hass.localize(
          "ui.panel.lovelace.editor.condition-editor.invalid_config_text"
        ),
      });
      return;
    }

    this._testingResult = checkConditionsMet([condition], this.hass);

    this._timeout = window.setTimeout(() => {
      this._testingResult = undefined;
    }, 2500);
  }

  private _duplicateCondition() {
    fireEvent(this, "duplicate-condition", {
      value: deepClone(this.condition),
    });
  }

  private _copyCondition() {
    this._clipboard = deepClone(this.condition);
  }

  private _cutCondition() {
    this._copyCondition();
    this._delete();
  }

  private _delete() {
    fireEvent(this, "value-changed", { value: null });
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    // @ts-ignore
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  static styles = [
    haStyle,
    css`
      ha-button-menu {
        --mdc-theme-text-primary-on-background: var(--primary-text-color);
      }
      ha-expansion-panel {
        --expansion-panel-summary-padding: 0 0 0 8px;
        --expansion-panel-content-padding: 0;
      }
      .condition-icon {
        display: none;
      }
      @media (min-width: 870px) {
        .condition-icon {
          display: inline-block;
          color: var(--secondary-text-color);
          opacity: 0.9;
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
        }
      }
      h3 {
        margin: 0;
        font-size: inherit;
        font-weight: inherit;
      }
      .content {
        padding: 12px;
      }
      .disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      .testing {
        position: absolute;
        top: 0px;
        right: 0px;
        left: 0px;
        text-transform: uppercase;
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-bold);
        background-color: var(--divider-color, #e0e0e0);
        color: var(--text-primary-color);
        max-height: 0px;
        overflow: hidden;
        transition: max-height 0.3s;
        text-align: center;
        border-top-right-radius: calc(
          var(--ha-card-border-radius, 12px) - var(--ha-card-border-width, 1px)
        );
        border-top-left-radius: calc(
          var(--ha-card-border-radius, 12px) - var(--ha-card-border-width, 1px)
        );
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
      .container {
        position: relative;
        border-radius: var(--ha-card-border-radius, 12px);
        border: 1px solid var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-editor": HaCardConditionEditor;
  }

  interface HASSDomEvents {
    "duplicate-condition": { value: Condition | LegacyCondition };
  }
}

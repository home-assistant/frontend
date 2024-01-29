import { preventDefault } from "@fullcalendar/core/internal";
import { ActionDetail } from "@material/mwc-list";
import { mdiCheck, mdiDelete, mdiDotsVertical, mdiFlask } from "@mdi/js";
import { LitElement, PropertyValues, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
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
import {
  Condition,
  LegacyCondition,
  checkConditionsMet,
  validateConditionalConfig,
} from "../../common/validate-condition";
import type { LovelaceConditionEditorConstructor } from "./types";

@customElement("ha-card-condition-editor")
export class HaCardConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) condition!: Condition | LegacyCondition;

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
        condition: "state",
        ...this.condition,
      };
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
      <ha-card outlined>
        <ha-expansion-panel leftChevron>
          <h3 slot="header">
            <ha-svg-icon
              class="condition-icon"
              .path=${ICON_CONDITION[condition.condition]}
            ></ha-svg-icon>
            ${
              this.hass.localize(
                `ui.panel.lovelace.editor.condition-editor.condition.${condition.condition}.label`
              ) || condition.condition
            }
          </h3>
            <ha-button-menu
              slot="icons"
              @action=${this._handleAction}
              @click=${preventDefault}
              @closed=${stopPropagation}
              fixed
              .corner=${"BOTTOM_END"}
              .menuCorner=${"END"}
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

              <ha-list-item graphic="icon" .disabled=${!this._uiAvailable}>
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_card.edit_ui"
                )}
                ${
                  !this._yamlMode
                    ? html`
                        <ha-svg-icon
                          class="selected_menu_item"
                          slot="graphic"
                          .path=${mdiCheck}
                        ></ha-svg-icon>
                      `
                    : ``
                }
              </ha-list-item>

              <ha-list-item graphic="icon">
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_card.edit_yaml"
                )}
                ${
                  this._yamlMode
                    ? html`
                        <ha-svg-icon
                          class="selected_menu_item"
                          slot="graphic"
                          .path=${mdiCheck}
                        ></ha-svg-icon>
                      `
                    : ``
                }
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
          </div>
          ${
            !this._uiAvailable
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
              : nothing
          }
          <div class="content">
            ${
              this._yamlMode
                ? html`
                    <ha-yaml-editor
                      .hass=${this.hass}
                      .defaultValue=${this.condition}
                      @value-changed=${this._onYamlChange}
                    ></ha-yaml-editor>
                  `
                : html`
                    ${dynamicElement(
                      `ha-card-condition-${condition.condition}`,
                      {
                        hass: this.hass,
                        condition: condition,
                      }
                    )}
                  `
            }
          </div>
        </ha-expansion-panel>
        <div
          class="testing ${classMap({
            active: this._testingResult !== undefined,
            pass: this._testingResult === true,
            error: this._testingResult === false,
          })}"
        >
          ${
            this._testingResult
              ? this.hass.localize(
                  "ui.panel.lovelace.editor.condition-editor.testing_pass"
                )
              : this.hass.localize(
                  "ui.panel.lovelace.editor.condition-editor.testing_error"
                )
          }
        </div>
      </ha-card>
    `;
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._testCondition();
        break;
      case 1:
        this._yamlMode = false;
        break;
      case 2:
        this._yamlMode = true;
        break;
      case 3:
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
      .selected_menu_item {
        color: var(--primary-color);
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-editor": HaCardConditionEditor;
  }
}

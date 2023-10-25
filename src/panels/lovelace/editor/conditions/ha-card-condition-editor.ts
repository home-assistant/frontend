import { preventDefault } from "@fullcalendar/core/internal";
import { ActionDetail } from "@material/mwc-list";
import { mdiCheck, mdiDelete, mdiDotsVertical } from "@mdi/js";
import { LitElement, PropertyValues, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-yaml-editor";
import "../../../../components/ha-alert";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { ICON_CONDITION } from "../../common/icon-condition";
import { Condition, LegacyCondition } from "../../common/validate-condition";
import type { LovelaceConditionEditorConstructor } from "./types";

@customElement("ha-card-condition-editor")
export class HaCardConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) condition!: Condition | LegacyCondition;

  @state() public _yamlMode = false;

  @state() public _uiAvailable = false;

  @state() public _uiWarnings: string[] = [];

  @state() _condition?: Condition;

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
      </ha-card>
    `;
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._yamlMode = false;
        break;
      case 1:
        this._yamlMode = true;
        break;
      case 2:
        this._delete();
        break;
    }
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-editor": HaCardConditionEditor;
  }
}

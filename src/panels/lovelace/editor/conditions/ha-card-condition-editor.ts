import { preventDefault } from "@fullcalendar/core/internal";
import { ActionDetail } from "@material/mwc-list";
import { mdiCheck, mdiDelete, mdiDotsVertical } from "@mdi/js";
import { LitElement, PropertyValues, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-yaml-editor";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { ICON_CONDITION } from "../../common/icon-condition";
import { Condition } from "../../common/validate-condition";
import type { LovelaceConditionEditorConstructor } from "./types";
import { handleStructError } from "../../../../common/structs/handle-errors";

@customElement("ha-card-condition-editor")
export default class HaCardConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) condition!: Condition;

  @state() public _yamlMode = false;

  @state() public _uiAvailable = false;

  @state() public _uiWarnings: string[] = [];

  private get _editor() {
    const element = customElements.get(
      `ha-card-condition-${this.condition.condition}`
    ) as LovelaceConditionEditorConstructor | undefined;

    return element;
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("condition")) {
      const validator = this._editor && this._editor.validateUIConfig;
      if (validator) {
        try {
          validator(this.condition, this.hass);
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
    const condition = this.condition;

    return html`
      <div class="header">
        <ha-svg-icon
          class="icon"
          .path=${ICON_CONDITION[condition.condition]}
        ></ha-svg-icon>
        <span class="title">
          ${this.hass.localize(
            `ui.panel.lovelace.editor.card.conditional.condition.${condition.condition}.label`
          ) || condition.condition}
        </span>
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
            ${this.hass.localize("ui.panel.lovelace.editor.edit_card.edit_ui")}
            ${!this._yamlMode
              ? html`
                  <ha-svg-icon
                    class="selected_menu_item"
                    slot="graphic"
                    .path=${mdiCheck}
                  ></ha-svg-icon>
                `
              : ``}
          </ha-list-item>

          <ha-list-item graphic="icon">
            ${this.hass.localize(
              "ui.panel.lovelace.editor.edit_card.edit_yaml"
            )}
            ${this._yamlMode
              ? html`
                  <ha-svg-icon
                    class="selected_menu_item"
                    slot="graphic"
                    .path=${mdiCheck}
                  ></ha-svg-icon>
                `
              : ``}
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
              ${this.hass.localize("ui.errors.config.edit_in_yaml_supported")}
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
      .header {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
      .header span {
        flex: 1;
        font-size: 16px;
      }
      .content {
        padding: 12px;
      }
      .header .icon {
        padding: 12px;
      }
      .selected_menu_item {
        color: var(--primary-color);
      }
      li[role="separator"] {
        border-bottom-color: var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-editor": HaCardConditionEditor;
  }
}

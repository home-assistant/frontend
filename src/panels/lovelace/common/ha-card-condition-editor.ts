import { mdiCodeBraces, mdiDelete, mdiListBoxOutline } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-icon-button";
import "../../../components/ha-yaml-editor";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "./types/ha-card-condition-responsive";
import "./types/ha-card-condition-state";
import { Condition } from "./validate-condition";

@customElement("ha-card-condition-editor")
export default class HaCardConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) condition!: Condition;

  @state() public _yamlMode = false;

  protected render() {
    const condition = this.condition;
    const element = customElements.get(
      `ha-card-condition-${condition.condition}`
    ) as any | undefined;
    const supported = element !== undefined;

    const valid =
      element &&
      (!element.validateUIConfig || element.validateUIConfig(this.condition));

    const yamlMode = this._yamlMode || !supported || !valid;

    return html`
      <div class="header">
        <ha-icon-button
          @click=${this._toggleMode}
          .disabled=${!supported || !valid}
          .label=${this.hass!.localize(
            yamlMode
              ? "ui.panel.lovelace.editor.edit_card.show_visual_editor"
              : "ui.panel.lovelace.editor.edit_card.show_code_editor"
          )}
          .path=${yamlMode ? mdiListBoxOutline : mdiCodeBraces}
        ></ha-icon-button>
        <ha-icon-button
          .label=${this.hass!.localize("ui.common.delete")}
          .path=${mdiDelete}
          @click=${this._delete}
        >
        </ha-icon-button>
      </div>
      ${!valid
        ? html`
            <ha-alert alert-type="warning">
              ${this.hass.localize("ui.errors.config.editor_not_supported")}
            </ha-alert>
          `
        : nothing}
      <div class="content">
        ${yamlMode
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

  private _toggleMode() {
    this._yamlMode = !this._yamlMode;
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
        justify-content: space-between;
      }
      .content {
        padding: 12px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-editor": HaCardConditionEditor;
  }
}

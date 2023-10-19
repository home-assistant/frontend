import { preventDefault } from "@fullcalendar/core/internal";
import { ActionDetail } from "@material/mwc-list";
import { mdiCheck, mdiDelete, mdiDotsVertical } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
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
import { Condition, LegacyCondition } from "../../common/validate-condition";
import type { LovelaceConditionEditorConstructor } from "./types";
import { ICON_CONDITION } from "../../common/icon-condition";

@customElement("ha-card-condition-editor")
export default class HaCardConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) condition!: Condition | LegacyCondition;

  @state() public _yamlMode = false;

  protected render() {
    const condition: Condition = {
      condition: "state",
      ...this.condition,
    };
    const element = customElements.get(
      `ha-card-condition-${condition.condition}`
    ) as LovelaceConditionEditorConstructor | undefined;
    const supported = element !== undefined;

    const valid =
      element &&
      (!element.validateUIConfig || element.validateUIConfig(condition));

    const yamlMode = this._yamlMode || !supported || !valid;

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

          <ha-list-item graphic="icon" .disabled=${!supported || !valid}>
            ${this.hass.localize("ui.panel.lovelace.editor.edit_card.edit_ui")}
            ${!yamlMode
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
            ${yamlMode
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

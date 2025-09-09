import { mdiBroom, mdiMinus, mdiPlus } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant } from "../../types";
import "../ha-md-list";
import "./ha-target-picker-item-row";

@customElement("ha-target-picker-item-group")
export class HaTargetPickerItemGroup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public type!: "entity" | "device" | "area" | "label" | "floor";

  @property({ attribute: false }) public items!: string[];

  @property({ type: Boolean }) public collapsed = false;

  protected render() {
    return html` <div class="heading">
        ${this.hass.localize(
          `ui.components.target-picker.selected.${this.type}`,
          {
            count: this.items.length,
          }
        )}
        <div class="icons">
          <ha-icon-button
            title=${this.hass.localize(
              `ui.components.target-picker.remove_${this.type}s`
            )}
            .path=${mdiBroom}
            @click=${this._removeGroup}
          ></ha-icon-button>
          <ha-icon-button
            title=${this.hass.localize(
              this.collapsed
                ? "ui.components.target-picker.expand"
                : "ui.components.target-picker.collapse"
            )}
            .path=${this.collapsed ? mdiPlus : mdiMinus}
            @click=${this._toggleCollapsed}
          ></ha-icon-button>
        </div>
      </div>
      ${this.collapsed
        ? nothing
        : html`
            <ha-md-list>
              ${this.items.map(
                (item) =>
                  html`
              <ha-target-picker-item-row
                .hass=${this.hass}
                .type=${this.type}
                .item=${item}
              ></ha-target-picker-item-row>
            </ha-md-list-item>`
              )}
            </ha-md-list>
          `}`;
  }

  private _toggleCollapsed() {
    this.collapsed = !this.collapsed;
  }

  private _removeGroup() {
    fireEvent(this, "remove-target-group", this.type);
  }

  static styles = css`
    :host {
      display: block;
    }
    .heading {
      background-color: var(--ha-color-fill-neutral-quiet-resting);
      padding: 4px 8px;
      font-weight: var(--ha-font-weight-bold);
      color: var(--secondary-text-color);
      display: flex;
      justify-content: space-between;
    }
    .icons {
      display: flex;
    }
    .icons ha-icon-button {
      --mdc-icon-size: 16px;
      --mdc-icon-button-size: 24px;
    }
    ha-md-list {
      padding: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker-item-group": HaTargetPickerItemGroup;
  }
}

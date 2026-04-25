import { mdiDelete, mdiPencil } from "@mdi/js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-settings-row";
import "../../../components/ha-svg-icon";
import type { CustomShortcutItem } from "../../../data/frontend";
import { NavigationPathInfoController } from "../../../data/navigation-path-controller";
import type { HomeAssistant } from "../../../types";

declare global {
  interface HASSDomEvents {
    "edit-shortcut": { index: number };
    "delete-shortcut": { index: number };
  }
  interface HTMLElementTagNameMap {
    "home-shortcut-list-item": HomeShortcutListItem;
  }
}

@customElement("home-shortcut-list-item")
export class HomeShortcutListItem extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public item!: CustomShortcutItem;

  @property({ type: Number }) public index = 0;

  private _navInfo = new NavigationPathInfoController(this);

  protected willUpdate(changedProps: PropertyValues<this>): void {
    if (
      (changedProps.has("hass") || changedProps.has("item")) &&
      this.hass &&
      this.item
    ) {
      this._navInfo.update(this.hass, this.item.path);
    }
  }

  protected render() {
    if (!this.item) return nothing;

    const info = this._navInfo.info;
    const label = this.item.label || info.label || this.item.path;
    const icon = this.item.icon || info.icon;
    const iconPath = icon ? undefined : info.iconPath;
    const color = this.item.color
      ? computeCssColor(this.item.color)
      : "var(--primary-color)";

    const iconStyle = { "--mdc-icon-size": "24px", color };

    return html`
      <ha-settings-row slim>
        ${icon
          ? html`<ha-icon
              slot="prefix"
              .icon=${icon}
              style=${styleMap(iconStyle)}
            ></ha-icon>`
          : html`<ha-svg-icon
              slot="prefix"
              .path=${iconPath}
              style=${styleMap(iconStyle)}
            ></ha-svg-icon>`}
        <span slot="heading">${label}</span>
        <ha-icon-button
          .path=${mdiPencil}
          .label=${this.hass.localize("ui.common.edit")}
          @click=${this._edit}
        ></ha-icon-button>
        <ha-icon-button
          .path=${mdiDelete}
          .label=${this.hass.localize("ui.common.delete")}
          @click=${this._delete}
        ></ha-icon-button>
      </ha-settings-row>
    `;
  }

  private _edit() {
    fireEvent(this, "edit-shortcut", { index: this.index });
  }

  private _delete() {
    fireEvent(this, "delete-shortcut", { index: this.index });
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-settings-row {
      padding: 0;
      gap: var(--ha-space-3);
      min-height: 40px;
      --settings-row-prefix-display: contents;
      --settings-row-content-display: contents;
      --settings-row-body-padding-top: var(--ha-space-1);
      --settings-row-body-padding-bottom: var(--ha-space-1);
    }
    ha-icon,
    ha-svg-icon {
      --mdc-icon-size: 24px;
      flex-shrink: 0;
    }
    [slot="heading"] {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    ha-icon-button {
      --ha-icon-button-size: 40px;
    }
  `;
}

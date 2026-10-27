import { mdiDelete, mdiDotsVertical, mdiPencil } from "@mdi/js";
import "@home-assistant/webawesome/dist/components/divider/divider";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import type { LovelaceViewSidebarConfig } from "../../../data/lovelace/config/view";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { LovelacePath } from "../editor/lovelace-path";
import { deleteAtPath, getAtPath } from "../editor/lovelace-path";
import { showEditSidebarDialog } from "../editor/sidebar-editor/show-edit-sidebar-dialog";
import type { Lovelace } from "../types";

@customElement("hui-sidebar-edit-header")
export class HuiSidebarEditHeader extends LitElement {
  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public path!: LovelacePath;

  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render() {
    return html`
      <div class="actions">
        <span class="title">
          ${this._localize("ui.panel.lovelace.editor.sidebar.title")}
        </span>
        <ha-dropdown
          placement="bottom-end"
          @wa-select=${this._handleDropdownSelect}
        >
          <ha-icon-button
            slot="trigger"
            .label=${this._localize("ui.panel.lovelace.editor.sidebar.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-dropdown-item value="edit">
            <ha-svg-icon slot="icon" .path=${mdiPencil}></ha-svg-icon>
            ${this._localize("ui.common.edit")}
          </ha-dropdown-item>
          <wa-divider></wa-divider>
          <ha-dropdown-item value="delete" variant="danger">
            <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
            ${this._localize("ui.common.delete")}
          </ha-dropdown-item>
        </ha-dropdown>
      </div>
    `;
  }

  private _handleDropdownSelect(ev: HaDropdownSelectEvent): void {
    const action = ev.detail?.item?.value;
    switch (action) {
      case "edit":
        showEditSidebarDialog(this, {
          lovelace: this.lovelace,
          path: this.path,
        });
        break;
      case "delete":
        this._deleteSidebar();
        break;
    }
  }

  private async _deleteSidebar() {
    const sidebar = getAtPath<LovelaceViewSidebarConfig>(
      this.lovelace.config,
      this.path
    );
    if (sidebar?.sections?.length) {
      const confirm = await showConfirmationDialog(this, {
        title: this._localize("ui.panel.lovelace.editor.sidebar.delete_title"),
        text: this._localize("ui.panel.lovelace.editor.sidebar.delete_text"),
        confirmText: this._localize("ui.common.delete"),
        destructive: true,
      });
      if (!confirm) return;
    }
    this.lovelace.saveConfig(deleteAtPath(this.lovelace.config, this.path));
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      height: 34px;
    }
    .actions {
      position: absolute;
      height: 36px;
      bottom: -2px;
      inset-inline-end: 0;
      display: flex;
      align-items: center;
      padding-inline-start: var(--ha-space-3);
      border-radius: var(
        --ha-section-border-radius,
        var(--ha-border-radius-xl)
      );
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      background: var(--secondary-background-color);
      color: var(--primary-text-color);
      --ha-icon-button-size: 36px;
      --mdc-icon-size: 20px;
    }
    .title {
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sidebar-edit-header": HuiSidebarEditHeader;
  }
}

import { mdiDragHorizontalVariant } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent, type HASSDomEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-navigation-picker";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type { CustomShortcutItem } from "../../../data/frontend";
import type { HomeAssistant } from "../../../types";
import { showEditShortcutDialog } from "../dialogs/show-dialog-edit-shortcut";
import "./home-shortcut-list-item";

// Paths already covered by built-in summaries
const SUMMARY_PANEL_PATHS = [
  "/home",
  "/light",
  "/climate",
  "/security",
  "/energy",
  "/maintenance",
];

@customElement("home-custom-shortcuts-editor")
export class HomeCustomShortcutsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public shortcuts: CustomShortcutItem[] = [];

  protected render() {
    const excludePaths = [
      ...SUMMARY_PANEL_PATHS,
      ...this.shortcuts.map((s) => s.path),
    ];

    return html`
      <ha-sortable handle-selector=".handle" @item-moved=${this._shortcutMoved}>
        <div class="home-list">
          ${repeat(
            this.shortcuts,
            (item) => item.path,
            (item, index) => html`
              <div class="home-list-item shortcut-row">
                <div class="handle">
                  <ha-svg-icon .path=${mdiDragHorizontalVariant}></ha-svg-icon>
                </div>
                <home-shortcut-list-item
                  class="shortcut-content"
                  .hass=${this.hass}
                  .item=${item}
                  .index=${index}
                  @edit-shortcut=${this._editShortcut}
                  @delete-shortcut=${this._removeShortcut}
                ></home-shortcut-list-item>
              </div>
            `
          )}
        </div>
      </ha-sortable>
      <ha-navigation-picker
        .hass=${this.hass}
        .addButtonLabel=${this.hass.localize(
          "ui.panel.home.editor.add_custom_shortcut"
        )}
        .excludePaths=${excludePaths}
        @value-changed=${this._addShortcut}
      ></ha-navigation-picker>
    `;
  }

  private _update(next: CustomShortcutItem[]): void {
    fireEvent(this, "value-changed", { value: next });
  }

  private _addShortcut(ev: CustomEvent): void {
    ev.stopPropagation();
    const path = ev.detail.value as string;
    if (!path) return;

    (ev.currentTarget as any).value = "";

    if (this.shortcuts.some((item) => item.path === path)) return;

    this._update([...this.shortcuts, { path }]);
  }

  private _editShortcut(ev: HASSDomEvent<{ index: number }>): void {
    const { index } = ev.detail;
    const item = this.shortcuts[index];
    if (!item) return;

    showEditShortcutDialog(this, {
      item,
      saveCallback: (updated) => {
        const next = [...this.shortcuts];
        next[index] = updated;
        this._update(next);
      },
    });
  }

  private _removeShortcut(ev: HASSDomEvent<{ index: number }>): void {
    const { index } = ev.detail;
    const next = [...this.shortcuts];
    next.splice(index, 1);
    this._update(next);
  }

  private _shortcutMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const next = [...this.shortcuts];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    this._update(next);
  }

  static styles = css`
    .home-list {
      display: flex;
      flex-direction: column;
    }
    .shortcut-row {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }
    .shortcut-content {
      flex: 1;
      min-width: 0;
    }
    .handle {
      cursor: grab;
      color: var(--secondary-text-color);
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }
    ha-navigation-picker {
      display: block;
      padding-top: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "home-custom-shortcuts-editor": HomeCustomShortcutsEditor;
  }
}

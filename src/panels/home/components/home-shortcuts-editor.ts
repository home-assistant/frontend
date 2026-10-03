import { mdiDragHorizontalVariant } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import {
  fireEvent,
  type HASSDomEvent,
  type HASSDomTargetEvent,
} from "../../../common/dom/fire_event";
import type { HaNavigationPicker } from "../../../components/ha-navigation-picker";
import "../../../components/ha-icon";
import "../../../components/ha-navigation-picker";
import "../../../components/ha-settings-row";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import {
  resolveShortcutItems,
  type CustomShortcutItem,
  type ShortcutItem,
} from "../../../data/home_shortcuts";
import {
  getSummaryLabel,
  HOME_SUMMARIES_COLORS,
  HOME_SUMMARIES_ICONS,
  type HomeSummary,
} from "../../lovelace/strategies/home/helpers/home-summaries";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import { showEditShortcutDialog } from "../dialogs/show-dialog-edit-shortcut";
import "./home-shortcut-list-item";

// Weather is rendered via a tile card (not a home-summary card), so it has
// no entry in HOME_SUMMARIES_ICONS / HOME_SUMMARIES_COLORS. The editor still
// needs to display it as a row, so it carries its own icon/color here.
const WEATHER_ICON = "mdi:weather-partly-cloudy";
const WEATHER_COLOR = "teal";

@customElement("home-shortcuts-editor")
export class HomeShortcutsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public shortcuts: ShortcutItem[] = [];

  private _resolveShortcuts = memoizeOne(resolveShortcutItems);

  private get _resolved(): ShortcutItem[] {
    return this._resolveShortcuts(this.shortcuts);
  }

  private _itemKey(item: ShortcutItem): string {
    return item.type === "summary"
      ? `summary:${item.key}`
      : `custom:${item.path}`;
  }

  protected render() {
    const resolved = this._resolved;
    const excludePaths = resolved
      .filter((i): i is CustomShortcutItem => i.type === "custom")
      .map((i) => i.path);

    return html`
      <ha-sortable handle-selector=".handle" @item-moved=${this._moved}>
        <div class="list">
          ${repeat(
            resolved,
            (item) => this._itemKey(item),
            (item, index) => {
              if (item.type === "summary") {
                const meta = this._summaryMeta(item.key);
                if (!meta) return nothing;
                const label = this._getSummaryLabel(item.key);
                const color = computeCssColor(meta.color);
                return html`
                  <div class="row">
                    <div class="handle">
                      <ha-svg-icon
                        .path=${mdiDragHorizontalVariant}
                      ></ha-svg-icon>
                    </div>
                    <ha-settings-row slim>
                      <ha-icon
                        slot="prefix"
                        .icon=${meta.icon}
                        style=${styleMap({
                          "--mdc-icon-size": "24px",
                          color,
                        })}
                      ></ha-icon>
                      <span slot="heading">${label}</span>
                      <ha-switch
                        .checked=${!item.hidden}
                        .summaryKey=${item.key}
                        @change=${this._summaryToggleChanged}
                      ></ha-switch>
                    </ha-settings-row>
                  </div>
                `;
              }
              return html`
                <div class="row">
                  <div class="handle">
                    <ha-svg-icon
                      .path=${mdiDragHorizontalVariant}
                    ></ha-svg-icon>
                  </div>
                  <home-shortcut-list-item
                    class="row-content"
                    .hass=${this.hass}
                    .item=${item}
                    .index=${index}
                    @edit-shortcut=${this._editShortcut}
                    @delete-shortcut=${this._deleteShortcut}
                  ></home-shortcut-list-item>
                </div>
              `;
            }
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

  private _getSummaryLabel(key: string): string {
    if (key === "weather") {
      return this.hass.localize(
        "ui.panel.lovelace.strategy.home.summary_list.weather"
      );
    }
    return getSummaryLabel(this.hass.localize, key as HomeSummary);
  }

  private _summaryMeta(
    key: string
  ): { icon: string; color: string } | undefined {
    if (key === "weather") {
      return { icon: WEATHER_ICON, color: WEATHER_COLOR };
    }
    if (key in HOME_SUMMARIES_ICONS) {
      const summary = key as HomeSummary;
      return {
        icon: HOME_SUMMARIES_ICONS[summary],
        color: HOME_SUMMARIES_COLORS[summary],
      };
    }
    return undefined;
  }

  private _valueChanged(next: ShortcutItem[]): void {
    fireEvent(this, "value-changed", { value: next });
  }

  private _moved(ev: HASSDomEvent<HASSDomEvents["item-moved"]>): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const next = [...this._resolved];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    this._valueChanged(next);
  }

  private _summaryToggleChanged(
    ev: HASSDomTargetEvent<
      HTMLElement & { checked: boolean; summaryKey: string }
    >
  ): void {
    const { checked, summaryKey } = ev.target;
    const next = this._resolved.map((item) =>
      item.type === "summary" && item.key === summaryKey
        ? { ...item, hidden: checked ? undefined : true }
        : item
    );
    this._valueChanged(next);
  }

  private _addShortcut(ev: ValueChangedEvent<string>): void {
    ev.stopPropagation();
    const path = ev.detail.value;
    if (!path) return;

    (ev.currentTarget as HaNavigationPicker).value = "";

    if (this._resolved.some((i) => i.type === "custom" && i.path === path)) {
      return;
    }

    this._valueChanged([...this._resolved, { type: "custom", path }]);
  }

  private _editShortcut(ev: HASSDomEvent<{ index: number }>): void {
    const { index } = ev.detail;
    const item = this._resolved[index];
    if (!item || item.type !== "custom") return;

    showEditShortcutDialog(this, {
      item,
      saveCallback: (updated) => {
        const next = [...this._resolved];
        next[index] = updated;
        this._valueChanged(next);
      },
    });
  }

  private _deleteShortcut(ev: HASSDomEvent<{ index: number }>): void {
    const { index } = ev.detail;
    const next = [...this._resolved];
    next.splice(index, 1);
    this._valueChanged(next);
  }

  static styles = css`
    :host {
      display: block;
    }
    .list {
      display: flex;
      flex-direction: column;
    }
    .row {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }
    .row-content {
      flex: 1;
      min-width: 0;
    }
    ha-settings-row {
      flex: 1;
      min-width: 0;
      padding: 0;
      gap: var(--ha-space-3);
      min-height: 40px;
      --settings-row-prefix-display: contents;
      --settings-row-content-display: contents;
      --settings-row-body-padding-top: var(--ha-space-1);
      --settings-row-body-padding-bottom: var(--ha-space-1);
    }
    [slot="heading"] {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
    "home-shortcuts-editor": HomeShortcutsEditor;
  }
}

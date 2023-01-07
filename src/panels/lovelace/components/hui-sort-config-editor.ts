import { html, LitElement, TemplateResult, css, CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import { SortableEvent } from "sortablejs";
import { repeat } from "lit/directives/repeat";
import { mdiClose, mdiDrag } from "@mdi/js";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-help-tooltip";
import "../../../components/ha-service-control";
import { HomeAssistant } from "../../../types";
import "../../../components/ha-navigation-picker";
import { SortConfig } from "../cards/types";
import { SortableInstance } from "../../../resources/sortable";
import { loadSortable } from "../../../resources/sortable.ondemand";
import { sortableStyles } from "../../../resources/ha-sortable-style";
import "./hui-sort-config-picker";
import type { HuiSortConfigPicker } from "./hui-sort-config-picker";

@customElement("hui-sort-config-editor")
export class HuiSortConfigEditor extends LitElement {
  @property() public config?: SortConfig[];

  @property() public label?: string;

  @property() protected hass?: HomeAssistant;

  private _sortConfigKeys = new WeakMap<SortConfig, string>();

  private _sortable?: SortableInstance;

  public disconnectedCallback() {
    this._destroySortable();
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private _getKey(action: SortConfig) {
    if (!this._sortConfigKeys.has(action)) {
      this._sortConfigKeys.set(action, Math.random().toString());
    }

    return this._sortConfigKeys.get(action)!;
  }

  private _sortConfigMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) {
      return;
    }

    const newConfig = this.config!.concat();

    newConfig.splice(ev.newIndex!, 0, newConfig.splice(ev.oldIndex!, 1)[0]);

    fireEvent(this, "value-changed", { value: newConfig });
  }

  private _sortConfigRemoved(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newSortConfigs = this.config!.concat();

    newSortConfigs.splice(index, 1);

    fireEvent(this, "value-changed", { value: newSortConfigs });
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <h3>
        ${this.label ??
        this.hass!.localize(
          "ui.panel.lovelace.editor.sort-config-editor.title"
        )}
      </h3>

      <div class="sort-configs">
        ${repeat(
          this.config ?? [],
          (sortConf) => this._getKey(sortConf),
          (sortConf, index) => html`
            <div class="sort-config">
              <div class="handle">
                <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
              </div>
              <hui-sort-config-picker
                .hass=${this.hass}
                .config=${sortConf}
                .index=${index}
                @value-changed=${this._sortConfigChanged}
              >
              </hui-sort-config-picker>
              <ha-icon-button
                .label=${this.hass!.localize(
                  "ui.components.entity.entity-picker.clear"
                )}
                .path=${mdiClose}
                class="remove-icon"
                .index=${index}
                @click=${this._sortConfigRemoved}
              ></ha-icon-button>
            </div>
          `
        )}
        <hui-sort-config-picker
          .label=${this.hass!.localize(
            "ui.panel.lovelace.editor.sort-config-editor.new_config"
          )}
          .hass=${this.hass}
          @value-changed=${this._sortConfigAdded}
        >
        </hui-sort-config-picker>
      </div>
    `;
  }

  protected firstUpdated(): void {
    this._createSortable();
  }

  private async _createSortable() {
    const Sortable = await loadSortable();
    this._sortable = new Sortable(
      this.shadowRoot!.querySelector(".sort-configs")!,
      {
        animation: 150,
        fallbackClass: "sortable-fallback",
        handle: ".handle",
        onChoose: (evt: SortableEvent) => {
          (evt.item as any).placeholder =
            document.createComment("sort-placeholder");
          evt.item.after((evt.item as any).placeholder);
        },
        onEnd: (evt: SortableEvent) => {
          // put back in original location
          if ((evt.item as any).placeholder) {
            (evt.item as any).placeholder.replaceWith(evt.item);
            delete (evt.item as any).placeholder;
          }
          this._sortConfigMoved(evt);
        },
      }
    );
  }

  private _sortConfigChanged(ev): void {
    ev.stopPropagation();
    if (!this.hass) {
      return;
    }

    const value = ev.detail.value;
    const index = (ev.target as any).index;
    const newSortConfigs =
      this.config !== undefined ? this.config.concat() : [];

    if (value === "" || value === undefined) {
      newSortConfigs.splice(index, 1);
    } else {
      newSortConfigs[index] = value!;
    }

    fireEvent(this, "value-changed", {
      value: newSortConfigs,
    });
  }

  private _sortConfigAdded(ev): void {
    ev.stopPropagation();
    if (!this.hass) {
      return;
    }

    const value = ev.detail.value;
    if (value === "") {
      return;
    }

    const newSortConfigs =
      this.config !== undefined ? this.config!.concat(value) : [value];

    // TODO: This should remove the currently selected type, but it does not work yet
    (ev.target as HuiSortConfigPicker).config = undefined;

    fireEvent(this, "value-changed", {
      value: newSortConfigs,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      sortableStyles,
      css`
        hui-sort-config-picker {
          margin-top: 8px;
        }

        .sort-config {
          display: flex;
          align-items: center;
        }

        .sort-config .handle {
          padding-right: 8px;
          cursor: move;
          padding-inline-end: 8px;
          padding-inline-start: initial;
          direction: var(--direction);
        }

        .sort-config .handle > * {
          pointer-events: none;
        }

        .sort-config hui-sort-config-picker {
          flex-grow: 1;
        }

        .remove-icon {
          --mdc-icon-button-size: 36px;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sort-config-editor": HuiSortConfigEditor;
  }
}

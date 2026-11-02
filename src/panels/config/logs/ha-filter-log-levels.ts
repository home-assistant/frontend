import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import { styleMap } from "lit/directives/style-map";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../../../common/controllers/filter-panel-controller";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/item/ha-list-item-option";
import "../../../components/list/ha-list-selectable";
import type { SystemLogLevel } from "../../../data/system_log";
import { LOG_LEVELS } from "./util";

@customElement("ha-filter-log-levels")
export class HaFilterLogLevels extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ attribute: false }) public value?: SystemLogLevel[];

  /** Number of log entries per level. */
  @property({ attribute: false }) public counts?: Partial<
    Record<SystemLogLevel, number>
  >;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  protected render() {
    const count = this.value?.length ?? 0;

    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this._localize("ui.panel.config.logs.level_filter.caption")}
          ${
            count
              ? html`<div class="badge">${count}</div>
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    .label=${this._localize(
                      "ui.components.subpage-data-table.clear_filter"
                    )}
                    @click=${this._clearFilter}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
      </ha-expansion-panel>
      ${this._panel.showContent ? this._renderContent() : nothing}
    `;
  }

  private _renderContent() {
    const value = this.value ?? [];

    return html`<div class="content" ${ref(this._content)}>
      <ha-list-selectable
        multi
        controlled
        aria-label=${this._localize("ui.panel.config.logs.level_filter.caption")}
        @ha-list-item-selected=${this._handleItemToggled}
        @ha-list-item-deselected=${this._handleItemToggled}
      >
        ${LOG_LEVELS.map(
          ({ level, path, color }) =>
            html`<ha-list-item-option
              appearance="checkbox"
              selection-position="end"
              .value=${level}
              .selected=${value.includes(level)}
            >
              <ha-svg-icon
                slot="start"
                .path=${path}
                style=${styleMap({ color })}
              ></ha-svg-icon>
              <span slot="headline"
                >${this._localize(
                  `ui.panel.config.logs.level_filter.${level}`
                )}</span
              >
              ${
                this.counts
                  ? html`<span slot="end" class="count"
                      >${this.counts[level] ?? 0}</span
                    >`
                  : nothing
              }
            </ha-list-item-option>`
        )}
      </ha-list-selectable>
    </div>`;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleItemToggled(ev: CustomEvent<number>) {
    // The options are rendered in `LOG_LEVELS` order
    const level = LOG_LEVELS[ev.detail]?.level;

    if (!level) {
      return;
    }

    const value = new Set(this.value ?? []);

    if (!value.delete(level)) {
      value.add(level);
    }

    // Keep the levels in severity order, whatever order they were picked in
    this.value = LOG_LEVELS.map((item) => item.level).filter((item) =>
      value.has(item)
    );
    fireEvent(this, "data-table-filter-changed", {
      value: this.value,
      items: undefined,
    });
  }

  private _clearFilter(ev: Event) {
    ev.preventDefault();
    this.value = undefined;
    fireEvent(this, "data-table-filter-changed", {
      value: undefined,
      items: undefined,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      filterPanelStyles,
      css`
        ha-list-selectable {
          display: flex;
          flex: 1;
          min-height: 0;
        }
        ha-list-selectable::part(base) {
          flex: 1;
          min-height: 0;
        }
        .header {
          display: flex;
          align-items: center;
        }
        .header ha-icon-button {
          margin-inline-start: auto;
          margin-inline-end: 8px;
        }
        .badge {
          display: inline-block;
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
          min-width: 16px;
          box-sizing: border-box;
          border-radius: var(--ha-border-radius-circle);
          font-size: var(--ha-font-size-xs);
          font-weight: var(--ha-font-weight-normal);
          background-color: var(--primary-color);
          line-height: var(--ha-line-height-normal);
          text-align: center;
          padding: 0px 2px;
          color: var(--text-primary-color);
        }
        .count {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-log-levels": HaFilterLogLevels;
  }
}

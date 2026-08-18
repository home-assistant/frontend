import { mdiFilterVariant, mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import { haStyleScrollbar } from "../resources/styles";
import "./ha-adaptive-dialog";
import "./ha-button";
import "./ha-dialog-footer";
import "./ha-filter-pane-chip";
import "./ha-icon-button";

/**
 * Filter pane for a filtered page: a column next to the content on wide
 * screens, a bottom sheet on narrow ones. Mirrors the filter pane of
 * `hass-tabs-subpage-data-table` for pages that are not a data table.
 *
 * The page keeps ownership of whether the pane is shown, so that it can also
 * open it from elsewhere (e.g. an empty state) and hide its own toolbar chip
 * while it is open.
 *
 * @slot - Filter panels, e.g. `ha-filter-domains`.
 */
@customElement("ha-filter-pane")
export class HaFilterPane extends LitElement {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  /** Header label, defaults to "Filters". */
  @property() public label?: string;

  /** SVG path of the header chip icon. */
  @property() public path = mdiFilterVariant;

  /** Number of active filters, shows the clear button when above zero. */
  @property({ type: Number }) public count = 0;

  /**
   * Number of results the current filters resolve to, shown on the narrow
   * confirm button. Leave undefined when the page shows everything.
   */
  @property({ attribute: false }) public resultCount?: number;

  @property({ type: Boolean }) public disabled = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render() {
    const label =
      this.label ?? this._localize("ui.components.subpage-data-table.filters");

    if (this.narrow) {
      return html`
        <ha-adaptive-dialog
          open
          flexcontent
          .headerTitle=${label}
          @closed=${this._close}
        >
          ${this._renderClearButton("headerActionItems")}
          <div class="sheet-content">
            <slot></slot>
          </div>
          <ha-dialog-footer slot="footer">
            <ha-button slot="primaryAction" data-dialog="close">
              ${
                this.resultCount === undefined
                  ? this._localize("ui.common.close")
                  : this._localize(
                      "ui.components.subpage-data-table.show_results",
                      { number: this.resultCount }
                    )
              }
            </ha-button>
          </ha-dialog-footer>
        </ha-adaptive-dialog>
      `;
    }

    return html`
      <div class="header">
        <ha-filter-pane-chip
          active
          .label=${label}
          .path=${this.path}
          .disabled=${this.disabled}
          @click=${this._close}
        ></ha-filter-pane-chip>
        ${this._renderClearButton()}
      </div>
      <div class="content ha-scrollbar">
        <slot></slot>
      </div>
    `;
  }

  private _renderClearButton(slot?: string) {
    if (!this.count) {
      return nothing;
    }
    return html`
      <ha-icon-button
        slot=${ifDefined(slot)}
        .path=${mdiFilterVariantRemove}
        .disabled=${this.disabled}
        .label=${this._localize("ui.components.subpage-data-table.clear_filter")}
        @click=${this._clear}
      ></ha-icon-button>
    `;
  }

  private _close() {
    fireEvent(this, "close-filter-pane");
  }

  private _clear() {
    fireEvent(this, "clear-filter");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
          display: flex;
          flex-direction: column;
          flex: 0 0 var(--ha-filter-pane-width, 320px);
          width: var(--ha-filter-pane-width, 320px);
          box-sizing: border-box;
          overflow: hidden;
          border-inline-end: 1px solid var(--divider-color);
        }

        /* The bottom sheet positions itself, so the pane takes no space. */
        :host([narrow]) {
          display: contents;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--ha-space-4);
          box-sizing: border-box;
          height: 56px;
          flex-shrink: 0;
          padding: 0 16px;
          background: var(--primary-background-color);
          border-bottom: 1px solid var(--divider-color);
        }

        .content,
        .sheet-content {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        }

        ha-adaptive-dialog {
          --dialog-content-padding: 0;
          /* Fixed height so the sheet does not resize while filtering. */
          --ha-bottom-sheet-height: calc(100dvh - var(--ha-space-12));
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-pane": HaFilterPane;
  }
  interface HASSDomEvents {
    "close-filter-pane": undefined;
  }
}

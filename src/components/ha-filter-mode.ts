import { mdiNotEqualVariant } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import type { ToggleButton } from "../types";
import "./ha-button-toggle-group";
import "./ha-svg-icon";

/** The value of a filter's "No …" option, which no real id can have */
export const NO_VALUE_ID = "__none__";

/**
 * The number of picked options in a filter's header. A filter that shows the
 * items that don't match its selection gets a "not equal" sign in front, and
 * one that matches the items with all of them the word "All", so this is
 * clear while the filter is collapsed. Style it, and a filter's "No …" option
 * (`class="no-value"`), with `filterBadgeStyles`.
 */
export const renderFilterBadge = (
  localize: LocalizeFunc,
  count: number,
  exclude: boolean | undefined,
  all?: boolean
) => {
  if (!exclude && !all) {
    return html`<div class="badge">${count}</div>`;
  }
  const allLabel = localize(
    "ui.components.subpage-data-table.filter_match_all"
  );
  const label = [
    ...(exclude
      ? [localize("ui.components.subpage-data-table.filter_excludes")]
      : []),
    ...(all ? [allLabel] : []),
  ].join(", ");
  return html`<div
    class="badge mode"
    role="img"
    aria-label=${`${label}: ${count}`}
    title=${label}
  >
    ${
      exclude
        ? html`<ha-svg-icon .path=${mdiNotEqualVariant}></ha-svg-icon>`
        : nothing
    }${all ? html`<span class="all">${allLabel}</span>` : nothing}${count}
  </div>`;
};

export const filterBadgeStyles = css`
  /* The mode toggle already spaces the search from the header */
  ha-filter-mode + ha-input-search {
    padding-top: 0;
  }
  /* The "No …" option, which isn't a value of its own */
  .no-value {
    font-style: italic;
  }
  .badge.mode {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    padding-inline: 4px;
    border-radius: var(--ha-border-radius-pill);
  }
  .badge.mode ha-svg-icon {
    --mdc-icon-size: 12px;
  }
  .badge.mode .all {
    margin-inline-end: 3px;
  }
`;

/**
 * Picks whether a filter of the filter pane shows the items that match its
 * selection, or the items that don't. With `match-mode`, it also picks
 * whether an item matches with one of the selected options, or only with all
 * of them. Both sit in one row, which wraps when a language doesn't fit.
 *
 * @fires filter-mode-changed - The include or exclude mode was picked.
 * @fires filter-match-changed - The any or all mode was picked.
 */
@customElement("ha-filter-mode")
export class HaFilterMode extends LitElement {
  @property({ type: Boolean }) public exclude = false;

  /** Match the items that have all selected options */
  @property({ type: Boolean }) public all = false;

  /** Offer to match any or all selected options */
  @property({ type: Boolean, attribute: "match-mode" }) public matchMode =
    false;

  /**
   * Only offer to match any or all selected options, for a filter that can't
   * exclude
   */
  @property({ type: Boolean, attribute: "match-only" }) public matchOnly =
    false;

  @property({ type: Boolean }) public disabled = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  private _modeButtons = memoizeOne(
    (localize: LocalizeFunc): ToggleButton[] => [
      {
        label: localize("ui.components.subpage-data-table.filter_includes"),
        value: "include",
      },
      {
        label: localize("ui.components.subpage-data-table.filter_excludes"),
        value: "exclude",
      },
    ]
  );

  private _matchButtons = memoizeOne(
    (localize: LocalizeFunc): ToggleButton[] => [
      {
        label: localize("ui.components.subpage-data-table.filter_match_any"),
        value: "any",
      },
      {
        label: localize("ui.components.subpage-data-table.filter_match_all"),
        value: "all",
      },
    ]
  );

  protected render() {
    return html`
      ${
        this.matchOnly
          ? nothing
          : html`<ha-button-toggle-group
              class="mode"
              role="group"
              aria-label=${this._localize(
                "ui.components.subpage-data-table.filter_mode"
              )}
              size="xs"
              full-width
              no-wrap
              variant="neutral"
              active-variant="brand"
              .buttons=${this._modeButtons(this._localize)}
              .active=${this.exclude ? "exclude" : "include"}
              .disabled=${this.disabled}
              @value-changed=${this._modeChanged}
            ></ha-button-toggle-group>`
      }
      ${
        this.matchMode || this.matchOnly
          ? html`<ha-button-toggle-group
              class=${this.matchOnly ? "mode" : "match"}
              role="group"
              aria-label=${this._localize(
                "ui.components.subpage-data-table.filter_match"
              )}
              size="xs"
              full-width
              no-wrap
              variant="neutral"
              active-variant="brand"
              .buttons=${this._matchButtons(this._localize)}
              .active=${this.all ? "all" : "any"}
              .disabled=${this.disabled}
              @value-changed=${this._matchChanged}
            ></ha-button-toggle-group>`
          : nothing
      }
    `;
  }

  private _modeChanged(ev: CustomEvent<{ value: string }>) {
    ev.stopPropagation();
    const exclude = ev.detail.value === "exclude";
    if (exclude === this.exclude) {
      return;
    }
    this.exclude = exclude;
    fireEvent(this, "filter-mode-changed", { exclude });
  }

  private _matchChanged(ev: CustomEvent<{ value: string }>) {
    ev.stopPropagation();
    const all = ev.detail.value === "all";
    if (all === this.all) {
      return;
    }
    this.all = all;
    fireEvent(this, "filter-match-changed", { all });
  }

  static styles = css`
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-2);
      padding: var(--ha-space-2);
    }
    /* Each takes its own width and they share the rest. Wrapped, each fills
       its row. */
    .mode {
      flex: 2 1 auto;
    }
    .match {
      flex: 1 1 auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-mode": HaFilterMode;
  }
  interface HASSDomEvents {
    "filter-mode-changed": { exclude: boolean };
    "filter-match-changed": { all: boolean };
  }
}

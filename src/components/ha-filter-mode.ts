import { mdiNotEqualVariant } from "@mdi/js";
import { css, html, LitElement } from "lit";
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
 * items that don't match its selection gets a "not equal" sign in front, so
 * this is clear while the filter is collapsed. Style it, and a filter's
 * "No …" option (`class="no-value"`), with `filterBadgeStyles`.
 */
export const renderFilterBadge = (
  localize: LocalizeFunc,
  count: number,
  exclude: boolean | undefined
) =>
  exclude
    ? html`<div
        class="badge exclude"
        role="img"
        aria-label=${`${localize(
          "ui.components.subpage-data-table.filter_excludes"
        )}: ${count}`}
        title=${localize("ui.components.subpage-data-table.filter_excludes")}
      >
        <ha-svg-icon .path=${mdiNotEqualVariant}></ha-svg-icon>${count}
      </div>`
    : html`<div class="badge">${count}</div>`;

export const filterBadgeStyles = css`
  /* The mode toggle already spaces the search from the header */
  ha-filter-mode + ha-input-search {
    padding-top: 0;
  }
  /* The "No …" option, which isn't a value of its own */
  .no-value {
    font-style: italic;
  }
  .badge.exclude {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    padding-inline: 2px 4px;
    border-radius: var(--ha-border-radius-pill);
  }
  .badge.exclude ha-svg-icon {
    --mdc-icon-size: 12px;
  }
`;

/**
 * Picks whether a filter of the filter pane shows the items that match its
 * selection, or the items that don't.
 *
 * @fires filter-mode-changed - The mode was picked.
 */
@customElement("ha-filter-mode")
export class HaFilterMode extends LitElement {
  @property({ type: Boolean }) public exclude = false;

  @property({ type: Boolean }) public disabled = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  private _buttons = memoizeOne((localize: LocalizeFunc): ToggleButton[] => [
    {
      label: localize("ui.components.subpage-data-table.filter_includes"),
      value: "include",
    },
    {
      label: localize("ui.components.subpage-data-table.filter_excludes"),
      value: "exclude",
    },
  ]);

  protected render() {
    return html`
      <ha-button-toggle-group
        role="group"
        aria-label=${this._localize(
          "ui.components.subpage-data-table.filter_mode"
        )}
        size="xs"
        full-width
        no-wrap
        variant="neutral"
        active-variant="brand"
        .buttons=${this._buttons(this._localize)}
        .active=${this.exclude ? "exclude" : "include"}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
      ></ha-button-toggle-group>
    `;
  }

  private _valueChanged(ev: CustomEvent<{ value: string }>) {
    ev.stopPropagation();
    const exclude = ev.detail.value === "exclude";
    if (exclude === this.exclude) {
      return;
    }
    this.exclude = exclude;
    fireEvent(this, "filter-mode-changed", { exclude });
  }

  static styles = css`
    :host {
      display: block;
      padding: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-mode": HaFilterMode;
  }
  interface HASSDomEvents {
    "filter-mode-changed": { exclude: boolean };
  }
}

import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { isTouch } from "../util/is_touch";
import "./chips/ha-chip-set";
import "./chips/ha-filter-chip";

export interface PickerSection {
  id: string;
  label: string;
}

export type PickerSectionDef = PickerSection | "separator";

/**
 * `ha-picker-section-chips` — section filter chip bar.
 *
 * Renders a row of selectable chips for filtering a picker list by
 * category. Emits `section-changed` with `{ section: string | undefined }`
 * when the user toggles a chip (toggling the active chip clears the
 * filter).
 */
@customElement("ha-picker-section-chips")
export class HaPickerSectionChips extends LitElement {
  @property({ attribute: false }) public sections?: PickerSectionDef[];

  @property() public selected?: string;

  protected render() {
    if (!this.sections?.length) return nothing;
    return html`
      <ha-chip-set>
        ${this.sections.map((section) =>
          section === "separator"
            ? html`<div class="separator"></div>`
            : html`<ha-filter-chip
                @mousedown=${isTouch ? undefined : this._preventBlur}
                @click=${this._handleClick}
                data-section-id=${section.id}
                .selected=${this.selected === section.id}
                .label=${section.label}
              ></ha-filter-chip>`
        )}
      </ha-chip-set>
    `;
  }

  private _preventBlur(ev: Event) {
    ev.preventDefault();
  }

  private _handleClick = (ev: Event) => {
    const id = (ev.currentTarget as HTMLElement).dataset.sectionId;
    if (!id) return;
    const next = this.selected === id ? undefined : id;
    this.selected = next;
    fireEvent(this, "section-changed", { section: next });
  };

  static styles: CSSResultGroup = css`
    :host {
      display: block;
    }
    ha-chip-set {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-1);
      align-items: center;
    }
    .separator {
      width: 1px;
      height: 20px;
      background-color: var(--divider-color);
      margin: 0 var(--ha-space-1);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picker-section-chips": HaPickerSectionChips;
  }
  interface HASSDomEvents {
    "section-changed": { section: string | undefined };
  }
}

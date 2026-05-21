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

/** Section filter chip bar; emits `section-changed`. Toggling the active chip clears the filter. */
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

  private _preventBlur = (ev: Event) => {
    ev.preventDefault();
  };

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
      padding: 0 var(--ha-space-3) var(--ha-space-3);
    }
    ha-chip-set {
      display: flex;
      flex-wrap: nowrap;
      gap: var(--ha-space-2);
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      /* Room for the chip's focus ring (clipped by overflow-y: hidden). */
      padding: var(--ha-space-1) 0;
      margin: calc(-1 * var(--ha-space-1)) 0;
    }
    ha-chip-set::-webkit-scrollbar {
      display: none;
    }
    ha-chip-set ha-filter-chip {
      flex-shrink: 0;
      --md-filter-chip-selected-container-color: var(
        --ha-color-fill-primary-normal-hover
      );
      color: var(--primary-color);
    }
    .separator {
      height: var(--ha-space-8);
      width: 0;
      border: 1px solid var(--ha-color-border-neutral-quiet);
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

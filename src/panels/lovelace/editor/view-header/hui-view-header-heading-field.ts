import {
  mdiAccount,
  mdiClockOutline,
  mdiDragHorizontalVariant,
  mdiMapMarker,
  mdiPencilOutline,
  mdiPlus,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/chips/ha-assist-chip";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/chips/ha-input-chip";
import "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";

declare global {
  interface HASSDomEvents {
    "heading-content-changed": { content: string };
  }
}

// One line of the heading, composed from chips. The line is stored as plain
// markdown text; each token serializes to the template Home Assistant already
// understands, so what you build here renders as-is on the dashboard.
//
//   [ ≡ "Good morning," ✕ ] [ 👤 Matt ✕ ]   ( ✎ Custom )  ( + Add ⌄ )
//
// - "Custom" adds a free-text chip you type into (click a text chip to re-edit).
// - "Add" inserts a token: time-of-day greeting, name, or location name.
// - Chips drag to reorder, which is the order they appear in the line.

type TokenType = "greeting" | "user" | "location";

type HeadingPart = { type: "text"; text: string } | { type: TokenType };

// Serialized template for each token. These exact strings are what we write
// into the content and what we match when parsing it back into chips.
const TOKEN_TEMPLATES: Record<TokenType, string> = {
  greeting:
    "{% if now().hour < 12 %}Good morning{% elif now().hour < 18 %}Good afternoon{% else %}Good evening{% endif %}",
  user: "{{ user }}",
  location: "{{ state_attr('zone.home', 'friendly_name') }}",
};

const TOKEN_ICON: Record<TokenType, string> = {
  greeting: mdiClockOutline,
  user: mdiAccount,
  location: mdiMapMarker,
};

const TOKEN_LABEL_KEY: Record<TokenType, string> = {
  greeting: "heading_token_greeting",
  user: "heading_token_name",
  location: "heading_token_location",
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Match any token: exact greeting/location templates, or {{ user }} in any
// spacing HA accepts.
const TOKEN_SPLIT_RE = new RegExp(
  `(${escapeRegExp(TOKEN_TEMPLATES.greeting)}|${escapeRegExp(
    TOKEN_TEMPLATES.location
  )}|\\{\\{\\s*user\\s*\\}\\})`,
  "g"
);

const matchToken = (value: string): TokenType => {
  if (value === TOKEN_TEMPLATES.greeting) {
    return "greeting";
  }
  if (value === TOKEN_TEMPLATES.location) {
    return "location";
  }
  return "user";
};

// Sentinel index meaning "the trailing new-text input is open".
const NEW_ITEM = -1;

@customElement("hui-view-header-heading-field")
export class HuiViewHeaderHeadingField extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public content = "";

  @property({ attribute: false }) public tokens: TokenType[] = [
    "greeting",
    "user",
    "location",
  ];

  @property() public placeholder?: string;

  // Index of the text chip being edited inline, or NEW_ITEM for the trailing
  // new-text input. undefined = nothing being edited.
  @state() private _editIndex?: number;

  @state() private _draft = "";

  @query(".chip-edit input") private _editInput?: HTMLInputElement;

  // Split the content into text/token parts. Text runs are trimmed: the single
  // spaces we write between chips (see _serialize) are separators, not content,
  // so trimming them keeps the round-trip stable and avoids blank space chips.
  private get _parts(): HeadingPart[] {
    const content = this.content;
    if (!content) {
      return [];
    }
    const parts: HeadingPart[] = [];
    let lastIndex = 0;
    for (const match of content.matchAll(TOKEN_SPLIT_RE)) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        parts.push({ type: "text", text });
      }
      parts.push({ type: matchToken(match[0]) });
      lastIndex = match.index + match[0].length;
    }
    const tail = content.slice(lastIndex).trim();
    if (tail) {
      parts.push({ type: "text", text: tail });
    }
    return parts;
  }

  // Join chips with a single space so each renders separated in the heading
  // (e.g. "Hello" + greeting + name → "Hello Good afternoon Matt").
  private _serialize(parts: HeadingPart[]): string {
    return parts
      .map((part) =>
        part.type === "text" ? part.text : TOKEN_TEMPLATES[part.type]
      )
      .join(" ");
  }

  private _emit(parts: HeadingPart[]): void {
    const content = this._serialize(parts);
    this.content = content;
    fireEvent(this, "heading-content-changed", { content });
  }

  // ---- inline text editing --------------------------------------------------

  private _startCustom(ev: Event): void {
    ev.stopPropagation();
    this._editIndex = NEW_ITEM;
    this._draft = "";
  }

  private _chipClicked(ev: Event): void {
    ev.stopPropagation();
    const idx = parseInt(
      (ev.currentTarget as HTMLElement).dataset.idx || "",
      10
    );
    const part = this._parts[idx];
    // Only free-text chips are edited in place; tokens have no text to type.
    if (!part || part.type !== "text") {
      return;
    }
    this._editIndex = idx;
    this._draft = part.text;
  }

  private _draftChanged(ev: Event): void {
    this._draft = (ev.target as HTMLInputElement).value;
  }

  private _draftKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Enter") {
      ev.preventDefault();
      this._commitDraft();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      this._cancelDraft();
    }
  }

  private _commitDraft(): void {
    const index = this._editIndex;
    if (index == null) {
      // Enter already committed and removed the input; ignore the trailing blur.
      return;
    }
    const text = this._draft.trim();
    const parts = this._parts;

    this._editIndex = undefined;
    this._draft = "";

    if (index === NEW_ITEM) {
      if (!text) {
        return; // nothing typed — no empty chip
      }
      parts.push({ type: "text", text });
    } else if (text) {
      parts[index] = { type: "text", text };
    } else {
      parts.splice(index, 1); // cleared = remove the chip
    }
    this._emit(parts);
  }

  private _cancelDraft(): void {
    this._editIndex = undefined;
    this._draft = "";
  }

  protected updated(): void {
    // Focus the inline input as soon as it appears.
    if (this._editIndex != null && this._editInput) {
      if (this.shadowRoot?.activeElement !== this._editInput) {
        this._editInput.focus();
        this._editInput.select();
      }
    }
  }

  // ---- tokens ("Add" menu) --------------------------------------------------

  private _addToken(ev: HaDropdownSelectEvent): void {
    ev.stopPropagation();
    const type = ev.detail.item.value as TokenType;
    if (!this.tokens.includes(type)) {
      return;
    }
    const parts = this._parts;
    parts.push({ type });
    this._emit(parts);
  }

  // ---- chip list ------------------------------------------------------------

  private _removeItem(ev: Event): void {
    ev.stopPropagation();
    const idx = parseInt((ev.target as HTMLElement).dataset.idx || "", 10);
    const parts = this._parts;
    parts.splice(idx, 1);
    this._emit(parts);
  }

  private _moveItem(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const parts = this._parts;
    const moved = parts.splice(oldIndex, 1)[0];
    parts.splice(newIndex, 0, moved);
    this._emit(parts);
  }

  private _tokenLabel(type: TokenType): string {
    if (type === "user") {
      return (
        this.hass.user?.name ||
        this.hass.localize(
          "ui.panel.lovelace.editor.edit_view_header.heading_token_name"
        )
      );
    }
    if (type === "location") {
      return (
        this.hass.config?.location_name ||
        this.hass.localize(
          "ui.panel.lovelace.editor.edit_view_header.heading_token_location"
        )
      );
    }
    return this.hass.localize(
      "ui.panel.lovelace.editor.edit_view_header.heading_token_greeting"
    );
  }

  private _renderEditor() {
    return html`
      <div class="chip-edit">
        <input
          .value=${this._draft}
          placeholder=${
            this.placeholder ??
            this.hass.localize(
              "ui.panel.lovelace.editor.edit_view_header.heading_custom_placeholder"
            )
          }
          @input=${this._draftChanged}
          @keydown=${this._draftKeydown}
          @blur=${this._commitDraft}
        />
      </div>
    `;
  }

  private _renderChip(part: HeadingPart, idx: number) {
    const label =
      part.type === "text" ? part.text : this._tokenLabel(part.type);
    return html`
      <ha-input-chip
        data-idx=${idx}
        @remove=${this._removeItem}
        @click=${this._chipClicked}
        .label=${label}
        selected
      >
        <ha-svg-icon
          slot="icon"
          .path=${
            part.type === "text"
              ? mdiDragHorizontalVariant
              : TOKEN_ICON[part.type]
          }
        ></ha-svg-icon>
        <span>${label}</span>
      </ha-input-chip>
    `;
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    const parts = this._parts;

    return html`
      <div class="field">
        <ha-sortable
          no-style
          @item-moved=${this._moveItem}
          handle-selector="ha-input-chip"
          filter=".add,.custom,.chip-edit"
        >
          <ha-chip-set>
            ${repeat(
              parts,
              (_part, idx) => idx,
              (part, idx) =>
                this._editIndex === idx
                  ? this._renderEditor()
                  : this._renderChip(part, idx)
            )}
            ${this._editIndex === NEW_ITEM ? this._renderEditor() : nothing}
            <ha-assist-chip
              class="custom"
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.edit_view_header.heading_custom"
              )}
              @click=${this._startCustom}
            >
              <ha-svg-icon slot="icon" .path=${mdiPencilOutline}></ha-svg-icon>
            </ha-assist-chip>
            <ha-dropdown class="add" @wa-select=${this._addToken}>
              <ha-assist-chip
                slot="trigger"
                .label=${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_view_header.heading_add"
                )}
              >
                <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
              </ha-assist-chip>
              ${this.tokens.map(
                (type) => html`
                  <ha-dropdown-item value=${type}>
                    ${this.hass.localize(
                      `ui.panel.lovelace.editor.edit_view_header.${TOKEN_LABEL_KEY[type]}` as const
                    )}
                    <ha-svg-icon
                      slot="icon"
                      .path=${TOKEN_ICON[type]}
                    ></ha-svg-icon>
                  </ha-dropdown-item>
                `
              )}
            </ha-dropdown>
          </ha-chip-set>
        </ha-sortable>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
    /* Field surface — matches HA's own name picker so it reads as one input. */
    .field {
      position: relative;
      background-color: var(--mdc-text-field-fill-color, whitesmoke);
      border-radius: var(--ha-border-radius-sm);
      border-end-end-radius: var(--ha-border-radius-square);
      border-end-start-radius: var(--ha-border-radius-square);
    }
    .field:after {
      display: block;
      content: "";
      position: absolute;
      pointer-events: none;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      width: 100%;
      background-color: var(
        --mdc-text-field-idle-line-color,
        rgba(0, 0, 0, 0.42)
      );
    }
    .field:focus-within:after {
      height: 2px;
      background-color: var(--mdc-theme-primary);
    }
    ha-chip-set {
      padding: var(--ha-space-3);
    }
    .custom {
      order: 1;
    }
    .add {
      order: 2;
    }
    /* Inline editor, sized to sit in the chip row like a chip. */
    .chip-edit {
      display: inline-flex;
      align-items: center;
      height: 32px;
      padding: 0 var(--ha-space-3, 12px);
      border: 1px solid var(--primary-color);
      border-radius: var(--ha-border-radius-sm, 8px);
      background: var(--card-background-color, #fff);
      box-sizing: border-box;
    }
    .chip-edit input {
      appearance: none;
      background: none;
      border: 0;
      outline: none;
      color: var(--primary-text-color);
      font-family: inherit;
      font-size: var(--ha-font-size-m, 14px);
      min-width: 96px;
      width: 16ch;
    }
    .sortable-fallback {
      display: none;
      opacity: 0;
    }
    .sortable-ghost {
      opacity: 0.4;
    }
    .sortable-drag {
      cursor: grabbing;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-header-heading-field": HuiViewHeaderHeadingField;
  }
}

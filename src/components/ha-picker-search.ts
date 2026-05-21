import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";

/** Search input for picker UIs; emits `search-changed`. */
@customElement("ha-picker-search")
export class HaPickerSearch extends LitElement {
  @property() public value = "";

  @property() public placeholder?: string;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @query("ha-input-search") private _input?: HaInputSearch;

  public focus() {
    // ha-input doesn't expose focus(); reach the wa-input it wraps.
    this._input?.shadowRoot?.querySelector<HTMLElement>("wa-input")?.focus();
  }

  protected render() {
    return html`
      <ha-input-search
        appearance="outlined"
        .value=${this.value}
        .placeholder=${this.placeholder ?? ""}
        ?autofocus=${this.autofocus}
        @input=${this._handleInput}
      ></ha-input-search>
    `;
  }

  private _handleInput = (ev: Event) => {
    const value = (ev.target as HaInputSearch).value ?? "";
    this.value = value;
    fireEvent(this, "search-changed", { value });
  };

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      padding: 0 var(--ha-space-3) var(--ha-space-3);
    }
    ha-input-search {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picker-search": HaPickerSearch;
  }
  interface HASSDomEvents {
    "search-changed": { value: string };
  }
}

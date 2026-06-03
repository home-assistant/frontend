import { mdiMagnify } from "@mdi/js";
import { css, html, type PropertyValues } from "lit";
import { customElement } from "lit/decorators";
import { HaInput } from "./ha-input";

/**
 * Home Assistant search input component
 *
 * @element ha-input-search
 * @extends {HaInput}
 *
 * @summary
 * A pre-configured search input that extends `ha-input` with a magnify icon, clear button,
 * and a localized "Search" placeholder. Autocomplete is disabled by default.
 */
@customElement("ha-input-search")
export class HaInputSearch extends HaInput {
  constructor() {
    super();
    this.withClear = true;
    this.autocomplete = this.autocomplete || "off";
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (
      !this.label &&
      !this.placeholder &&
      (!this.hasUpdated || changedProps.has("_i18n"))
    ) {
      this.placeholder = this.i18n?.localize?.("ui.common.search") || "Search";
    }
  }

  protected renderStartDefault() {
    return html`<ha-svg-icon slot="start" .path=${mdiMagnify}></ha-svg-icon>`;
  }

  static styles = [
    ...HaInput.styles,
    css`
      :host([appearance="outlined"]) wa-input.no-label::part(base) {
        height: 40px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input-search": HaInputSearch;
  }
}

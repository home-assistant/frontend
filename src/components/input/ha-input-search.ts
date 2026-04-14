import { consume, type ContextType } from "@lit/context";
import { mdiMagnify } from "@mdi/js";
import { html, type PropertyValues } from "lit";
import { customElement, state } from "lit/decorators";
import { internationalizationContext } from "../../data/context";
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
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

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
      this.placeholder = this._i18n.localize("ui.common.search");
    }
  }

  protected renderStartDefault() {
    return html`<ha-svg-icon slot="start" .path=${mdiMagnify}></ha-svg-icon>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input-search": HaInputSearch;
  }
}

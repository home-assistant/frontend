import { consume, type ContextType } from "@lit/context";
import { mdiMagnify } from "@mdi/js";
import { html, type PropertyValues } from "lit";
import { customElement, state } from "lit/decorators";
import { localizeContext } from "../../data/context";
import { HaInput } from "./ha-input";

@customElement("ha-input-search")
export class HaInputSearch extends HaInput {
  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: ContextType<typeof localizeContext>;

  constructor() {
    super();
    this.appearance = "outlined";
    this.withClear = true;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (
      !this.placeholder &&
      (!this.hasUpdated || changedProps.has("localize"))
    ) {
      this.placeholder = this.localize("ui.common.search");
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

import { consume, type ContextType } from "@lit/context";
import { mdiMagnify } from "@mdi/js";
import type { PropertyValues } from "lit";
import { customElement, state } from "lit/decorators";
import { localizeContext } from "../../data/context";
import { HaInput } from "./ha-input";

@customElement("ha-input-search")
export class HaInputSearch extends HaInput {
  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: ContextType<typeof localizeContext>;

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this.appearance = "outlined";
      this.withClear = true;
      this.iconStart = mdiMagnify;
    }

    if (
      !this.placeholder &&
      (!this.hasUpdated || changedProps.has("localize"))
    ) {
      this.placeholder = this.localize("ui.common.search");
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input-search": HaInputSearch;
  }
}

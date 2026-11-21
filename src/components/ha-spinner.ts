import { HacSpinner } from "@home-assistant/components/spinner/scoped";
import { customElement, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";

/**
 * `hac-spinner` under its existing name, named with the translated "Loading"
 * by default. Takes the same `size` and `--ha-spinner-*` variables as before.
 */
@customElement("ha-spinner")
export class HaSpinner extends HacSpinner {
  @state() @consumeLocalize() private _localize?: LocalizeFunc;

  protected defaultLabel(): string {
    return this._localize?.("ui.common.loading") || super.defaultLabel();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-spinner": HaSpinner;
  }
}

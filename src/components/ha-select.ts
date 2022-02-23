import { SelectBase } from "@material/mwc-select/mwc-select-base";
import { styles } from "@material/mwc-select/mwc-select.css";
import { html, nothing } from "lit";
import { customElement } from "lit/decorators";
import { nextRender } from "../common/util/render-status";

@customElement("ha-select")
export class HaSelect extends SelectBase {
  protected override renderLeadingIcon() {
    if (!this.icon) {
      return nothing;
    }

    return html`<span class="mdc-select__icon"
      ><slot name="icon"></slot
    ></span>`;
  }

  static override styles = [styles];

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("translations-updated", this._resourcesUpdated);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("translations-updated", this._resourcesUpdated);
  }

  private _resourcesUpdated = async () => {
    await nextRender();
    this.layoutOptions();
  };
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-select": HaSelect;
  }
}

import { SelectBase } from "@material/mwc-select/mwc-select-base";
import { styles } from "@material/mwc-select/mwc-select.css";
import { customElement } from "lit/decorators";

@customElement("ha-select")
export class HaSelect extends SelectBase {
  static override styles = [styles];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-select": HaSelect;
  }
}

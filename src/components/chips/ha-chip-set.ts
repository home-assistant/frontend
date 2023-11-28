import "element-internals-polyfill";
import { MdChipSet } from "@material/web/chips/chip-set";
import { customElement } from "lit/decorators";

@customElement("ha-chip-set")
export class HaChipSet extends MdChipSet {}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chip-set": HaChipSet;
  }
}

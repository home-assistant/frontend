import { MdOutlinedSegmentedButtonSet } from "@material/web/labs/segmentedbuttonset/outlined-segmented-button-set";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-outlined-segmented-button-set")
export class HaOutlinedSegmentedButtonSet extends MdOutlinedSegmentedButtonSet {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --ha-icon-display: block;
        --md-outlined-segmented-button-container-height: 32px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-outlined-segmented-button-set": HaOutlinedSegmentedButtonSet;
  }
}

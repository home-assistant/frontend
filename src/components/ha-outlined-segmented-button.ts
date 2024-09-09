import { MdOutlinedSegmentedButton } from "@material/web/labs/segmentedbutton/outlined-segmented-button";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-outlined-segmented-button")
export class HaOutlinedSegmentedButton extends MdOutlinedSegmentedButton {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --ha-icon-display: block;
        --md-outlined-segmented-button-selected-container-color: var(
          --light-primary-color
        );
        --md-outlined-segmented-button-container-height: 32px;
        --md-outlined-segmented-button-disabled-label-text-color: var(
          --disabled-text-color
        );
        --md-outlined-segmented-button-disabled-icon-color: var(
          --disabled-text-color
        );
        --md-outlined-segmented-button-disabled-outline-color: var(
          --disabled-text-color
        );
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-outlined-segmented-button": HaOutlinedSegmentedButton;
  }
}

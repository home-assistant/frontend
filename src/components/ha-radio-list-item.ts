import { css } from "lit";
import { RadioListItemBase } from "@material/mwc-list/mwc-radio-list-item-base";
import { styles as controlStyles } from "@material/mwc-list/mwc-control-list-item.css";
import { styles } from "@material/mwc-list/mwc-list-item.css";
import { customElement } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";

@customElement("ha-radio-list-item")
export class HaRadioListItem extends RadioListItemBase {
  async onChange(event) {
    super.onChange(event);
    fireEvent(this, event.type);
  }

  static override styles = [
    styles,
    controlStyles,
    css`
      :host {
        --mdc-theme-secondary: var(--primary-color);
      }

      :host([graphic="avatar"]) .mdc-deprecated-list-item__graphic,
      :host([graphic="medium"]) .mdc-deprecated-list-item__graphic,
      :host([graphic="large"]) .mdc-deprecated-list-item__graphic,
      :host([graphic="control"]) .mdc-deprecated-list-item__graphic {
        margin-inline-end: var(--mdc-list-item-graphic-margin, 16px);
        margin-inline-start: 0px;
        direction: var(--direction);
      }
      .mdc-deprecated-list-item__meta {
        flex-shrink: 0;
        direction: var(--direction);
        margin-inline-start: auto;
        margin-inline-end: 0;
      }
      .mdc-deprecated-list-item__graphic {
        margin-top: var(--radio-list-item-graphic-margin-top);
      }
      :host([graphic="icon"]) .mdc-deprecated-list-item__graphic {
        margin-inline-start: 0;
        margin-inline-end: var(--mdc-list-item-graphic-margin, 32px);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-radio-list-item": HaRadioListItem;
  }
}

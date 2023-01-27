import { css } from "lit";
import { CheckListItemBase } from "@material/mwc-list/mwc-check-list-item-base";
import { styles as controlStyles } from "@material/mwc-list/mwc-control-list-item.css";
import { styles } from "@material/mwc-list/mwc-list-item.css";
import { customElement } from "lit/decorators";

@customElement("ha-check-list-item")
export class HaCheckListItem extends CheckListItemBase {
  protected firstUpdated(): void {
    super.firstUpdated();

    if (document.dir === "rtl") {
      this.updateComplete.then(() => {
        const style = document.createElement("style");
        style.innerHTML =
          "span.mdc-deprecated-list-item__graphic { margin-left: var(--mdc-list-item-graphic-margin, 16px) !important; margin-right: 0px !important;}";
        this.shadowRoot!.appendChild(style);
      });
    }
  }

  static override styles = [
    styles,
    controlStyles,
    css`
      :host {
        --mdc-theme-secondary: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-check-list-item": HaCheckListItem;
  }
}

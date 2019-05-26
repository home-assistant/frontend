import {
  html,
  LitElement,
  customElement,
  property,
  css,
  CSSResult,
  TemplateResult,
} from "lit-element";
import "@material/mwc-button";
import "../../../components/ha-toast";

@customElement("hui-actionable-toast")
export class HuiActionableToast extends LitElement {
  @property() public opened: boolean = true;
  @property() public text: string = "";
  @property() public duration: number = 0;
  @property() public buttonText: string = "";
  @property() public buttonAction?: () => void;

  protected render(): TemplateResult | void {
    return html`
      <ha-toast
        .opened=${this.opened}
        .text=${this.text}
        .duration=${this.duration}
        ><mwc-button
          .label=${this.buttonText}
          @click=${this.buttonClicked}
        ></mwc-button
      ></ha-toast>
    `;
  }

  private buttonClicked() {
    this.opened = false;
    if (this.buttonAction) {
      this.buttonAction();
    }
  }

  static get styles(): CSSResult {
    return css`
      mwc-button {
        color: var(--primary-color);
        font-weight: bold;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-actionable-toast": HuiActionableToast;
  }
}

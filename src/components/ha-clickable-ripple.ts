import { ListItem } from "@material/mwc-list/mwc-list-item";
import { Ripple } from "@material/mwc-ripple";
import { RippleBase } from "@material/mwc-ripple/mwc-ripple-base";
// import { ListItemBase } from "@material/mwc-list/mwc-list-item-base";
import { css, CSSResult, customElement } from "lit-element";
import { html } from "lit-html";

@customElement("ha-clickable-ripple")
export class HaClickableRipple extends RippleBase {
  public href?: string;

  // public render() {
  //   const r = super.render();
  //   // prettier-ignore
  //   return html`
  //   <a
  //     aria-role="option"
  //     href=${`/${this.href}`}
  //   >
  //       ${r}
  //   </a>`;
  // }

  public render() {
    /** @classMap */
    const classes = {
      "mdc-ripple-upgraded--unbounded": this.unbounded,
      "mdc-ripple-upgraded--background-focused": this.bgFocused,
      "mdc-ripple-upgraded--foreground-activation": super.fgActivation,
      "mdc-ripple-upgraded--foreground-deactivation": super.fgDeactivation,
      hover: super.hovering,
      primary: this.primary,
      accent: this.accent,
      disabled: this.disabled,
      activated: this.activated,
      selected: this.selected,
    };
    return html` <div
      class="mdc-ripple-surface mdc-ripple-upgraded ${classMap(classes)}"
      style="${styleMap({
        "--mdc-ripple-fg-scale": this.fgScale,
        "--mdc-ripple-fg-size": this.fgSize,
        "--mdc-ripple-fg-translate-end": this.translateEnd,
        "--mdc-ripple-fg-translate-start": this.translateStart,
        "--mdc-ripple-left": this.leftPos,
        "--mdc-ripple-top": this.topPos,
      })}"
    ></div>`;
  }

  static get styles(): CSSResult[] {
    return [
      super.styles,
      css`
        /* a {
          width: 100%;
          height: 100%;
          border: 1px solid black;
          vertical-align: middle;
        } */
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-clickable-ripple": HaClickableRipple;
  }
}

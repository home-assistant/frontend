import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

@customElement("double-sidebar-padding-fix")
export class DoubleSidebarPaddingFix extends LitElement {
  @property({ attribute: false }) public fixSidebar!: boolean;

  protected render() {
    return html`
      <div class=${classMap({ fixSidebar: this.fixSidebar })}>
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    .fixSidebar {
      margin-right: calc(var(--sidebar-width) * -1 + var(--sidebar-gap) * -1);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "double-sidebar-padding-fix": DoubleSidebarPaddingFix;
  }
}

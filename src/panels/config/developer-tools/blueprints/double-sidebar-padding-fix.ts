import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

/*
 * This element exists because when the sidebar is open for the automation
 * editor or script editor inside the blueprint editor, the blueprint editor
 * needs a `padding-right` so the metadata editor doesn't get cut off by the
 * sidebar, but then the automation/script editor has the padding applied twice:
 * once by the blueprint editor, and another by itself. Therefore, we apply a
 * negative right margin to make sure the actual padding is correct.
 */
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

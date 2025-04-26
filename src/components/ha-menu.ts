import { MenuBase } from "@material/mwc-menu/mwc-menu-base";
import { styles } from "@material/mwc-menu/mwc-menu.css";
import { html } from "lit";
import { customElement } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "./ha-list";

@customElement("ha-menu")
export class HaMenu extends MenuBase {
  protected get listElement() {
    if (!this.listElement_) {
      this.listElement_ = this.renderRoot.querySelector("ha-list");
      return this.listElement_;
    }

    return this.listElement_;
  }

  protected renderList() {
    const itemRoles = this.innerRole === "menu" ? "menuitem" : "option";
    const classes = this.renderListClasses();

    return html`<ha-list
      rootTabbable
      .innerAriaLabel=${this.innerAriaLabel}
      .innerRole=${this.innerRole}
      .multi=${this.multi}
      class=${classMap(classes)}
      .itemRoles=${itemRoles}
      .wrapFocus=${this.wrapFocus}
      .activatable=${this.activatable}
      @action=${this.onAction}
    >
      <slot></slot>
    </ha-list>`;
  }

  static styles = styles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-menu": HaMenu;
  }
}

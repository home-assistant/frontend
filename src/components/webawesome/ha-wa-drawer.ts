import Drawer from "@awesome.me/webawesome/dist/components/drawer/drawer";
import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";
import { StateSet } from "../../resources/polyfills/stateset";

@customElement("ha-wa-drawer")
export class HaWaDrawer extends Drawer {
  @property({ type: Boolean, attribute: "hide-backdrop", reflect: true })
  public hideBackdrop = false;

  attachInternals() {
    const internals = super.attachInternals();
    Object.defineProperty(internals, "states", {
      value: new StateSet(this, internals.states),
    });
    return internals;
  }

  firstUpdated() {
    if (!this.hideBackdrop) {
      super.firstUpdated();
      return;
    }

    if (this.open) {
      // @ts-ignore
      this.addOpenListeners();
      this.drawer.showModal();
    }
  }

  disconnectedCallback() {
    if (!this.hideBackdrop) {
      super.disconnectedCallback();
      return;
    }

    // @ts-ignore
    this.removeOpenListeners();
  }

  static get styles(): CSSResultGroup {
    return [
      Drawer.styles,
      css`
        :host {
          --wa-color-surface-raised: var(
            --ha-dialog-surface-background,
            var(--mdc-theme-surface, #fff)
          );
        }
        :host([hide-backdrop]) .drawer::backdrop {
          display: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-wa-drawer": HaWaDrawer;
  }
}

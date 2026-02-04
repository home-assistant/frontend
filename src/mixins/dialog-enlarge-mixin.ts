import { property } from "lit/decorators";
import { type LitElement, css, unsafeCSS } from "lit";
import type { Constructor } from "../types";
import { withViewTransition } from "../../common/util/view-transition";
import { getInheritedStyles } from "./common";

export interface DialogEnlargeConfig {
  enlargeableElement: string;
  minWidth: number; // media query breakpoint
  style: string; // CSS style for enlarged element
}

/**
 * Mixin that adds an ability to enlarge a dialog by tapping on a title.
 * @param superClass - The LitElement class to extend.
 * @returns Extended class with "enlarge" functionality.
 */
export const DialogEnlargeMixin = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class DialogEnlargeClass extends superClass {
    @property({ type: Boolean, reflect: true }) public large = false;

    protected static getEnlargeConfig(): DialogEnlargeConfig {
      return {
        enlargeableElement: ".content",
        minWidth: 451,
        style: "max-width: none;",
      };
    }

    protected enlarge() {
      withViewTransition(() => {
        this.large = !this.large;
      });
    }

    static get styles() {
      // prettier-ignore
      return [
        ...getInheritedStyles(this),
        css`
          .title-enlargeable {
            display: block;
          }

          @media all and
          (min-width: ${this.getEnlargeConfig().minWidth}px) {
            :host([large])
              ${unsafeCSS(
                this.getEnlargeConfig().enlargeableElement
              )} {
                ${unsafeCSS(this.getEnlargeConfig().style)}
              }
          }
        `,
      ];
    }
  }

  return DialogEnlargeClass;
};

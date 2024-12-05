import type { LitElement } from "lit";
import type { Constructor } from "../types";
import { isNavigationClick } from "../common/dom/is-navigation-click";
import { navigate } from "../common/navigate";

export const PreventUnsavedMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class extends superClass {
    private _handleClick = async (e: MouseEvent) => {
      const href = isNavigationClick(e);

      if (!href) {
        return;
      }

      e.preventDefault();
      const result = await this.promptDiscardChanges();
      if (result) {
        navigate(href);
      }
    };

    private _handleUnload = (e: BeforeUnloadEvent) => {
      if (this.isDirty()) {
        e.preventDefault();
      }
    };

    public connectedCallback(): void {
      super.connectedCallback();

      document.body.addEventListener("mousedown", this._handleClick, {
        capture: true,
      });
      window.addEventListener("beforeunload", this._handleUnload);
    }

    public disconnectedCallback(): void {
      super.disconnectedCallback();

      document.body.removeEventListener("click", this._handleClick, {
        capture: true,
      });
      window.removeEventListener("beforeunload", this._handleUnload);
    }

    protected isDirty(): boolean {
      return false;
    }

    protected async promptDiscardChanges(): Promise<boolean> {
      return true;
    }
  };

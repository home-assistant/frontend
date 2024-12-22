import type { LitElement, PropertyValues } from "lit";
import { isNavigationClick } from "../common/dom/is-navigation-click";
import type { Constructor } from "../types";

export const PreventUnsavedMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class extends superClass {
    private _handleClick = async (e: MouseEvent) => {
      // get the right target, otherwise the composedPath would return <home-assistant> in the new event
      const target = e.composedPath()[0];
      if (!isNavigationClick(e)) {
        return;
      }

      const result = await this.promptDiscardChanges();
      if (result) {
        this._removeListeners();
        if (target) {
          const newEvent = new MouseEvent(e.type, e);
          target.dispatchEvent(newEvent);
        }
      }
    };

    private _handleUnload = (e: BeforeUnloadEvent) => e.preventDefault();

    private _removeListeners() {
      window.removeEventListener("click", this._handleClick, true);
      window.removeEventListener("beforeunload", this._handleUnload);
    }

    protected willUpdate(changedProperties: PropertyValues): void {
      super.willUpdate(changedProperties);

      if (this.isDirty) {
        window.addEventListener("click", this._handleClick, true);
        window.addEventListener("beforeunload", this._handleUnload);
      } else {
        this._removeListeners();
      }
    }

    public disconnectedCallback(): void {
      super.disconnectedCallback();

      this._removeListeners();
    }

    protected get isDirty(): boolean {
      return false;
    }

    protected async promptDiscardChanges(): Promise<boolean> {
      return true;
    }
  };

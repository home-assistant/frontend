import type { LitElement, PropertyValues } from "lit";
import { isNavigationClick } from "../common/dom/is-navigation-click";
import { goBack } from "../common/navigate";
import { afterNextRender } from "../common/util/render-status";
import type { Constructor } from "../types";
import { mainWindow } from "../common/dom/get_main_window";

export const PreventUnsavedMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class extends superClass {
    protected exitConfirmed;

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

    private _handlePopState = async (e: PopStateEvent) => {
      if (!e.state?.preventUnsavedConfirming) return;

      const canExit = !this.isDirty || this.exitConfirmed;

      if (canExit) {
        goBack("/config");
      } else {
        // Re-push state to "neutralize" the back button press and stay on page.
        mainWindow.history.pushState(null, "");

        const result = await this.promptDiscardChanges();
        if (result) {
          this.exitConfirmed = true;
          afterNextRender(() => goBack("/config"));
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

    public connectedCallback(): void {
      super.connectedCallback();
      // Tag the current history entry so we know this component owns the "unsaved changes" logic.
      mainWindow.history.replaceState(
        { ...mainWindow.history.state, preventUnsavedConfirming: true },
        ""
      );
      // Create a "buffer" state so the first back-button press triggers popstate without leaving the page.
      mainWindow.history.pushState(null, "");

      window.addEventListener("popstate", this._handlePopState);

      this.exitConfirmed = false;
    }

    public disconnectedCallback(): void {
      super.disconnectedCallback();

      this._removeListeners();
      window.removeEventListener("popstate", this._handlePopState);
    }

    // eslint-disable-next-line @typescript-eslint/class-literal-property-style
    protected get isDirty(): boolean {
      return false;
    }

    protected async promptDiscardChanges(): Promise<boolean> {
      return true;
    }
  };

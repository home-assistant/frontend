import type { LitElement, PropertyValues } from "lit";
import { isNavigationClick } from "../common/dom/is-navigation-click";
import type { Constructor } from "../types";

export const PreventUnsavedMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class extends superClass {
    private _historyState: string | null = null;

    private _listenersAttached = false;

    private _isNavigating = false;

    private _handleClick = async (e: MouseEvent) => {
      const href = isNavigationClick(e);
      if (!href) {
        return;
      }

      if (!isNavigationClick(e)) {
        return;
      }
      // get the right target, otherwise the composedPath would return <home-assistant> in the new event
      const target = e.composedPath()[0];

      this._isNavigating = true;
      const result = await this.promptDiscardChanges();
      if (result) {
        this._removeListeners();
        if (target) {
          const newEvent = new MouseEvent(e.type, e);
          target.dispatchEvent(newEvent);
        }
      } else {
        this._isNavigating = false;
      }
    };

    private _handleUnload = (e: BeforeUnloadEvent) => e.preventDefault();

    private _handlePopState = async () => {
      // Ignore popstate events triggered by dialog state management
      if (window.history.state?.opensDialog) {
        return;
      }

      const result = await this.promptDiscardChanges();
      if (!result) {
        window.history.pushState(null, "", this._historyState);
      } else {
        this._removeListeners();
      }
    };

    private _removeListeners() {
      window.removeEventListener("click", this._handleClick, true);
      window.removeEventListener("beforeunload", this._handleUnload);
      window.removeEventListener("popstate", this._handlePopState);
      this._listenersAttached = false;
    }

    protected shouldUpdate(changedProperties: PropertyValues): boolean {
      if (this._isNavigating) {
        return false;
      }
      return super.shouldUpdate(changedProperties);
    }

    protected willUpdate(changedProperties: PropertyValues): void {
      super.willUpdate(changedProperties);

      if (this._isNavigating) {
        return;
      }

      if (this.isDirty) {
        if (!this._listenersAttached) {
          window.addEventListener("popstate", this._handlePopState);
          window.addEventListener("click", this._handleClick, true);
          window.addEventListener("beforeunload", this._handleUnload);
          this._listenersAttached = true;
        }
        if (!this._historyState) {
          this._historyState =
            window.location.pathname + window.location.search;
          // Push a state to enable back button detection
          window.history.pushState(null, "", this._historyState);
        }
      } else {
        this._removeListeners();
        this._historyState = null;
      }
    }

    public disconnectedCallback(): void {
      super.disconnectedCallback();

      this._removeListeners();
    }

    // eslint-disable-next-line @typescript-eslint/class-literal-property-style
    protected get isDirty(): boolean {
      return false;
    }

    protected async promptDiscardChanges(): Promise<boolean> {
      return true;
    }
  };

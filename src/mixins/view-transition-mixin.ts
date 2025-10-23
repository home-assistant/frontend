import type { PropertyValues, ReactiveElement } from "lit";
import { state } from "lit/decorators";

type AbstractConstructor<T = object> = abstract new (...args: any[]) => T;

export const ViewTransitionMixin = <
  T extends AbstractConstructor<ReactiveElement>,
>(
  superClass: T
) => {
  abstract class ViewTransitionClass extends superClass {
    private _slot?: HTMLSlotElement;

    private _transitionTriggered = false;

    @state() protected _loaded = false;

    /**
     * Trigger a view transition if supported by the browser
     * @param updateCallback - Callback function that updates the DOM
     * @returns Promise that resolves when the transition is complete
     */
    protected async startViewTransition(
      updateCallback: () => void | Promise<void>
    ): Promise<void> {
      if (
        !document.startViewTransition ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        // Fallback: update without view transition
        await updateCallback();
        return;
      }

      const transition = document.startViewTransition(async () => {
        await updateCallback();
      });

      try {
        await transition.finished;
      } catch (_error) {
        // View transition skipped
      }
    }

    /**
     * Callback to execute during the load transition
     * Components can override this for custom behavior
     */
    protected onLoadTransition(): void {
      this.startViewTransition(() => {
        this._loaded = true;
      });
    }

    /**
     * Check if slot has content and trigger transition if it does
     */
    private _checkSlotContent = (): void => {
      // Guard against multiple slotchange events triggering the transition multiple times
      if (this._transitionTriggered) {
        return;
      }

      if (this._slot) {
        const elements = this._slot.assignedElements();
        if (elements.length > 0) {
          this._transitionTriggered = true;
          this.onLoadTransition();
        }
      }
    };

    /**
     * Automatically apply view transition on first render
     * @param changedProperties - Properties that changed
     */
    protected firstUpdated(changedProperties: PropertyValues): void {
      super.firstUpdated(changedProperties);

      // Wait for slotted content to be ready, then trigger transition
      this._slot = this.shadowRoot?.querySelector("slot:not([name])") as
        | HTMLSlotElement
        | undefined;
      if (this._slot) {
        this._checkSlotContent();
        this._slot.addEventListener("slotchange", this._checkSlotContent);
      } else {
        // Start transition immediately if no slot is found
        this.onLoadTransition();
      }
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback();
      if (this._slot) {
        this._slot.removeEventListener("slotchange", this._checkSlotContent);
      }
    }
  }
  return ViewTransitionClass;
};

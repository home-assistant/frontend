import type { PropertyValues, ReactiveElement } from "lit";

type AbstractConstructor<T = object> = abstract new (...args: any[]) => T;

export const ViewTransitionMixin = <
  T extends AbstractConstructor<ReactiveElement>,
>(
  superClass: T
) => {
  abstract class ViewTransitionClass extends superClass {
    /**
     * Trigger a view transition if supported by the browser
     * @param updateCallback - Callback function that updates the DOM
     * @param transitionName - Optional transition name to apply. Default is used otherwise (defined in src/resources/styles.ts)
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
     * Optional callback to execute during the load transition
     */
    protected onLoadTransition?(): void;

    /**
     * Check if slot has content and trigger transition if it does
     */
    private _checkSlotContent = (): void => {
      const slot = this.shadowRoot?.querySelector("slot:not([name])");
      if (slot) {
        const elements = (slot as HTMLSlotElement).assignedElements();
        if (elements.length > 0) {
          this.onLoadTransition?.();
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
      const slot = this.shadowRoot?.querySelector("slot:not([name])");
      if (slot) {
        this._checkSlotContent();
        slot.addEventListener("slotchange", this._checkSlotContent);
      } else {
        // Start transition immediately if no slot is found
        this.onLoadTransition?.();
      }
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback();
      const slot = this.shadowRoot?.querySelector("slot:not([name])");
      if (slot) {
        slot.removeEventListener("slotchange", this._checkSlotContent);
      }
    }
  }
  return ViewTransitionClass;
};

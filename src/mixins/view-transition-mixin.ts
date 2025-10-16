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
     * Override this method to enable automatic load transition
     * @returns Whether to enable transition on first render
     */
    protected enableLoadTransition(): boolean {
      return false;
    }

    /**
     * Override this method to control whether to wait for slotted content before triggering transition
     * @returns Whether to wait for slotted content to be ready
     */
    protected waitForSlottedContent(): boolean {
      return true;
    }

    /**
     * Optional callback to execute during the load transition
     */
    protected onLoadTransition?(): void;

    /**
     * Wait for slotted content to be ready, then trigger transition
     */
    private _waitForSlotThenTransition(): void {
      const slot = this.shadowRoot?.querySelector("slot:not([name])");
      if (slot) {
        const checkContent = () => {
          const elements = (slot as HTMLSlotElement).assignedElements();
          if (elements.length > 0) {
            this.onLoadTransition?.();
          }
        };
        checkContent();
        slot.addEventListener("slotchange", checkContent, { once: true });
      } else {
        // Start transition immediately if no slot is found
        this.onLoadTransition?.();
      }
    }

    /**
     * Automatically apply view transition on first render
     * @param changedProperties - Properties that changed
     */
    protected firstUpdated(changedProperties: PropertyValues): void {
      super.firstUpdated(changedProperties);

      if (!this.enableLoadTransition()) {
        if (this.waitForSlottedContent()) {
          this._waitForSlotThenTransition();
        } else {
          this.onLoadTransition?.();
        }
        return;
      }

      if (!document.startViewTransition) {
        this.onLoadTransition?.();
        return;
      }

      requestAnimationFrame(() => {
        this.startViewTransition(() => {
          this.onLoadTransition?.();
        });
      });
    }
  }
  return ViewTransitionClass;
};

import type { LitElement, PropertyValues } from "lit";
import type { Constructor } from "../types";

export const ViewTransitionMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class ViewTransitionClass extends superClass {
    /**
     * Trigger a view transition if supported by the browser
     * @param updateCallback - Callback function that updates the DOM
     * @param transitionName - Optional transition name to apply. Default is used otherwise (defined in src/resources/styles.ts)
     * @returns Promise that resolves when the transition is complete
     */
    protected async startViewTransition(
      updateCallback: () => void | Promise<void>,
      transitionName?: string
    ): Promise<void> {
      if (
        !document.startViewTransition ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        // Fallback: run the update without a transition
        await updateCallback();
        return;
      }

      if (transitionName) {
        this.dataset.viewTransition = transitionName;
      }

      const transition = document.startViewTransition(async () => {
        await updateCallback();
      });

      try {
        await transition.finished;
      } catch (_error) {
        // Transitions can be skipped
      } finally {
        // Clean up transition name if provided
        if (transitionName) {
          delete this.dataset.viewTransition;
        }
      }
    }

    /**
     * Override this method to disable automatic load transition
     * @returns Whether to enable transition on first render
     */
    protected enableLoadTransition(): boolean {
      return true;
    }

    /**
     * Optional callback to execute during the load transition
     */
    protected onLoadTransition?(): void;

    /**
     * Automatically apply view transition on first render
     * @param changedProperties - Properties that changed
     */
    protected firstUpdated(changedProperties: PropertyValues): void {
      super.firstUpdated(changedProperties);

      if (!this.enableLoadTransition()) {
        this.onLoadTransition?.();
        return;
      }

      if (!document.startViewTransition) {
        this.onLoadTransition?.();
        return;
      }

      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        this.startViewTransition(() => {
          this.onLoadTransition?.();
        });
      });
    }
  };

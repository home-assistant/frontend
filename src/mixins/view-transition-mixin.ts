import type { PropertyValues, ReactiveElement } from "lit";
import { state } from "lit/decorators";

/**
 * Abstract constructor type for a class that extends a reactive element
 * @param T - The type of the reactive element
 * @returns The abstract constructor
 */
type AbstractConstructor<T extends ReactiveElement> = abstract new (
  ...args: any[]
) => T;

/**
 * ViewTransitionMixin - Adds view transition support to reactive elements
 *
 * This mixin provides automatic fade-in transitions when content loads using the
 * View Transition API. User preferences are respected for reduced motion.
 * Falls back to synchronous updates for browsers that don't support the API.
 *
 * @example
 * Basic usage:
 * ```typescript
 * @customElement("my-component")
 * class MyComponent extends ViewTransitionMixin(LitElement) {
 *   render() {
 *     return html`
 *       <div class=${classMap({ content: true, loading: !this._loaded })}>
 *         <slot></slot>
 *       </div>
 *     `;
 *   }
 *
 *   static styles = css`
 *     .content {
 *       view-transition-name: layout-fade-in;
 *     }
 *     .content.loading {
 *       opacity: 0; // Hidden during initial load for transition
 *     }
 *   `;
 * }
 * ```
 *
 * @example
 * Triggering transitions manually:
 * ```typescript
 * private _switchView() {
 *   this.startViewTransition(() => {
 *     // DOM updates here will be animated
 *     this.currentView = newView;
 *   });
 * }
 * ```
 *
 * @example
 * Custom load behavior:
 * ```typescript
 * protected override onLoadTransition(): void {
 *   // Custom logic before triggering transition
 *   this.startViewTransition(() => {
 *     this._loaded = true;
 *     this._additionalSetup();
 *   });
 * }
 * ```
 *
 * Features:
 * - Automatic fade-in transition when slotted content loads
 * - Provides `_loaded` state property for conditional rendering
 * - `startViewTransition()` method for manual transitions
 * - Respects prefers-reduced-motion user preference
 * - Falls back gracefully when View Transition API unavailable
 * - Automatic cleanup of event listeners
 *
 * The mixin monitors the default slot and triggers `onLoadTransition()` when
 * content is available. Override `onLoadTransition()` to customize this behavior.
 */
export const ViewTransitionMixin = <
  T extends AbstractConstructor<ReactiveElement>,
>(
  superClass: T
) => {
  abstract class ViewTransitionClass extends superClass {
    /**
     * Reference to the default (unnamed) slot element for monitoring content changes.
     * Used to detect when slotted content is available to trigger load transitions.
     */
    private _slot?: HTMLSlotElement;

    /**
     * Prevents multiple slotchange events from triggering the transition more than once.
     * Once content loads and transition starts, this flag ensures it won't retrigger.
     */
    private _transitionTriggered = false;

    /**
     * State property indicating whether content has finished loading.
     * Use this in templates with the loading class pattern to hide content until ready.
     */
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
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("View transition failed to finish:", error);
      }
    }

    /**
     * Callback executed when content is ready to transition in.
     *
     * Called automatically when:
     * - The default slot receives content (slotchange event)
     * - No slot exists in the component (triggers immediately after firstUpdated)
     *
     * Default implementation sets `_loaded = true` within a view transition.
     * Override this method to add custom logic before or during the transition,
     * but ensure you call `startViewTransition()` to maintain transition behavior.
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
      // Only monitor the default (unnamed) slot - named slots are for specific purposes
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

    /**
     * Cleanup event listeners when component is removed from the DOM.
     * Removes the slotchange listener.
     */
    override disconnectedCallback(): void {
      super.disconnectedCallback();
      if (this._slot) {
        this._slot.removeEventListener("slotchange", this._checkSlotContent);
        this._slot = undefined;
        this._transitionTriggered = false;
        this._loaded = false;
      }
    }
  }
  return ViewTransitionClass;
};

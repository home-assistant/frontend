import TabGroup from "@shoelace-style/shoelace/dist/components/tab-group/tab-group.component";
import TabGroupStyles from "@shoelace-style/shoelace/dist/components/tab-group/tab-group.styles";
import "@shoelace-style/shoelace/dist/components/tab/tab";
import { css } from "lit";
import { customElement } from "lit/decorators";
import { DragScrollController } from "../common/controllers/drag-scroll-controller";

@customElement("sl-tab-group")
// @ts-ignore
export class HaSlTabGroup extends TabGroup {
  private _dragScrollController = new DragScrollController(this, {
    selector: ".tab-group__nav",
  });

  override setAriaLabels() {
    // Override the method to prevent setting aria-labels, as we don't use panels
    // and don't want to set aria-labels for the tabs
  }

  override getAllPanels() {
    // Override the method to prevent querying for panels
    // and return an empty array instead
    // as we don't use panels
    return [];
  }

  // @ts-ignore
  protected override handleClick(event: MouseEvent) {
    if (this._dragScrollController.scrolled) {
      return;
    }
    // @ts-ignore
    super.handleClick(event);
  }

  static override styles = [
    TabGroupStyles,
    css`
      :host {
        --sl-spacing-3x-small: 0.125rem;
        --sl-spacing-2x-small: 0.25rem;
        --sl-spacing-x-small: 0.5rem;
        --sl-spacing-small: 0.75rem;
        --sl-spacing-medium: 1rem;
        --sl-spacing-large: 1.25rem;
        --sl-spacing-x-large: 1.75rem;
        --sl-spacing-2x-large: 2.25rem;
        --sl-spacing-3x-large: 3rem;
        --sl-spacing-4x-large: 4.5rem;

        --sl-transition-x-slow: 1000ms;
        --sl-transition-slow: 500ms;
        --sl-transition-medium: 250ms;
        --sl-transition-fast: 150ms;
        --sl-transition-x-fast: 50ms;
        --transition-speed: var(--sl-transition-fast);
        --sl-border-radius-small: 0.1875rem;
        --sl-border-radius-medium: 0.25rem;
        --sl-border-radius-large: 0.5rem;
        --sl-border-radius-x-large: 1rem;
        --sl-border-radius-circle: 50%;
        --sl-border-radius-pill: 9999px;

        --sl-color-neutral-600: inherit;

        --sl-font-weight-semibold: var(--ha-font-weight-medium);
        --sl-font-size-small: var(--ha-font-size-m);

        --sl-color-primary-600: var(
          --ha-tab-active-text-color,
          var(--primary-color)
        );
        --track-color: var(--ha-tab-track-color, var(--divider-color));
        --indicator-color: var(--ha-tab-indicator-color, var(--primary-color));
      }
      ::slotted(sl-tab:not([active])) {
        opacity: 0.8;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    // @ts-ignore
    "sl-tab-group": HaSlTabGroup;
  }
}

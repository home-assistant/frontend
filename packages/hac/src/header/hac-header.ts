import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

/**
 * Header with an optional icon, a title, a subtitle and actions.
 *
 * Reusable in any container, e.g. `hac-card`. The title is exposed to
 * assistive technology as a heading of the given `level`.
 *
 * Importing this module does not register the element. Import
 * `@home-assistant/hac/header` to register `<hac-header>`.
 *
 * @slot - Title of the header.
 * @slot icon - Icon displayed before the title.
 * @slot subtitle - Secondary text displayed below the title.
 * @slot actions - Actions displayed at the end of the header.
 *
 * @cssprop --hac-header-color - Title color.
 * @cssprop --hac-header-secondary-color - Color of the icon and subtitle.
 * @cssprop --hac-header-font-family - Title font family.
 * @cssprop --hac-header-font-size - Title font size.
 * @cssprop --hac-header-padding - Padding of the header.
 */
export class HacHeader extends LitElement {
  /** Heading level of the title for assistive technology. */
  @property({ type: Number }) public level: 1 | 2 | 3 | 4 | 5 | 6 = 2;

  @state() private _hasIcon = false;

  @state() private _hasSubtitle = false;

  @state() private _hasActions = false;

  protected render() {
    return html`
      <div class="icon" ?hidden=${!this._hasIcon}>
        <slot name="icon" @slotchange=${this._iconChanged}></slot>
      </div>
      <div class="text">
        <div class="title" role="heading" aria-level=${this.level}>
          <slot></slot>
        </div>
        <div class="subtitle" ?hidden=${!this._hasSubtitle}>
          <slot name="subtitle" @slotchange=${this._subtitleChanged}></slot>
        </div>
      </div>
      <div class="actions" ?hidden=${!this._hasActions}>
        <slot name="actions" @slotchange=${this._actionsChanged}></slot>
      </div>
    `;
  }

  private _iconChanged(ev: Event) {
    this._hasIcon = _hasAssignedElements(ev);
  }

  private _subtitleChanged(ev: Event) {
    this._hasSubtitle = _hasAssignedElements(ev);
  }

  private _actionsChanged(ev: Event) {
    this._hasActions = _hasAssignedElements(ev);
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3, 12px);
      box-sizing: border-box;
      padding: var(
        --hac-header-padding,
        var(--ha-space-4, 16px) var(--ha-space-4, 16px) var(--ha-space-3, 12px)
      );
    }

    [hidden] {
      display: none !important;
    }

    .icon {
      display: flex;
      flex: none;
      color: var(
        --hac-header-secondary-color,
        var(--secondary-text-color, #727272)
      );
    }

    .text {
      flex: 1;
      min-width: 0;
    }

    .title {
      color: var(--hac-header-color, var(--primary-text-color, #141414));
      font-family: var(--hac-header-font-family, inherit);
      font-size: var(--hac-header-font-size, var(--ha-font-size-2xl, 24px));
      font-weight: var(--ha-font-weight-normal, 400);
      line-height: var(--ha-line-height-condensed, 1.2);
      letter-spacing: -0.012em;
      overflow-wrap: anywhere;
    }

    .subtitle {
      margin-block-start: var(--ha-space-1, 4px);
      color: var(
        --hac-header-secondary-color,
        var(--secondary-text-color, #727272)
      );
      font-size: var(--ha-font-size-m, 14px);
      line-height: var(--ha-line-height-normal, 1.6);
    }

    .actions {
      display: flex;
      flex: none;
      align-items: center;
      gap: var(--ha-space-2, 8px);
    }
  `;
}

const _hasAssignedElements = (ev: Event) =>
  (ev.target as HTMLSlotElement).assignedElements().length > 0;

declare global {
  interface HTMLElementTagNameMap {
    "hac-header": HacHeader;
  }
}

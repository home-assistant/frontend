import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

/**
 * Header with an optional icon, a title, a subtitle and actions.
 *
 * Reusable in any container, e.g. `hac-card`.
 *
 * @slot - Title of the header.
 * @slot icon - Icon displayed before the title.
 * @slot subtitle - Secondary text displayed below the title.
 * @slot actions - Actions displayed at the end of the header.
 *
 * @cssprop --hac-header-color - Title color.
 * @cssprop --hac-header-subtitle-color - Subtitle color.
 * @cssprop --hac-header-font-size - Title font size.
 * @cssprop --hac-header-font-family - Title font family.
 * @cssprop --hac-header-padding - Padding of the header.
 */
@customElement("hac-header")
export class HacHeader extends LitElement {
  protected render() {
    return html`
      <div class="icon"><slot name="icon"></slot></div>
      <div class="text">
        <div class="title"><slot></slot></div>
        <div class="subtitle"><slot name="subtitle"></slot></div>
      </div>
      <div class="actions"><slot name="actions"></slot></div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
      box-sizing: border-box;
      padding: var(
        --hac-header-padding,
        var(--ha-space-4) var(--ha-space-4) var(--ha-space-2)
      );
    }

    .icon {
      display: flex;
      color: var(--hac-header-subtitle-color, var(--secondary-text-color));
    }

    .text {
      flex: 1;
      min-width: 0;
    }

    .title {
      color: var(--hac-header-color, var(--primary-text-color));
      font-family: var(--hac-header-font-family, inherit);
      font-size: var(--hac-header-font-size, var(--ha-font-size-xl));
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);
    }

    .subtitle {
      color: var(--hac-header-subtitle-color, var(--secondary-text-color));
      font-size: var(--ha-font-size-m);
      line-height: var(--ha-line-height-normal);
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }

    /* Hide the wrappers of empty slots so they do not add gaps */
    .icon:not(:has(::slotted(*))),
    .subtitle:not(:has(::slotted(*))),
    .actions:not(:has(::slotted(*))) {
      display: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hac-header": HacHeader;
  }
}

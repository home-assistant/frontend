import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { HaListItemButton } from "../item/ha-list-item-button";
import "./ha-media-browser-thumbnail";

/**
 * @element ha-media-player-browse-list-item
 * @extends {HaListItemButton}
 *
 * @summary
 * Row of the media browser list. Always reserves a graphic next to the title
 * so titles line up, and shows a thumbnail with an optional play button over
 * it. Without `interactive` the row is plain text, used for the "not shown"
 * row. The row is rendered inside the shadow root of `ha-list-virtualized`, so
 * it carries its own styles.
 *
 * @slot start - Play or pick button, shown over the thumbnail.
 * @slot headline - Title of the row.
 *
 * @csspart start - The graphic container.
 *
 * @attr {string} thumbnail - URL of the thumbnail. Shown inside the graphic.
 */
@customElement("ha-media-player-browse-list-item")
export class HaMediaPlayerBrowseListItem extends HaListItemButton {
  @property() public thumbnail?: string;

  // The "not shown" row is plain text, not a button
  protected override _renderControl(content: TemplateResult): TemplateResult {
    if (!this.interactive) {
      return content;
    }
    return super._renderControl(content);
  }

  // Always reserve the graphic, so titles line up across rows
  protected override _renderStart(): TemplateResult {
    return html`<div part="start" class="start">
      <div class="graphic">
        ${
          this.thumbnail
            ? html`<ha-media-browser-thumbnail
                .url=${this.thumbnail}
              ></ha-media-browser-thumbnail>`
            : nothing
        }
        <slot name="start"></slot>
      </div>
    </div>`;
  }

  static styles: CSSResultGroup = [
    HaListItemButton.styles,
    css`
      :host {
        direction: var(--direction);
        --ha-row-item-padding-block: 0;
        --ha-row-item-min-height: 48px;
      }

      :host(.show-images) {
        --ha-row-item-padding-block: var(--ha-space-1);
        --ha-row-item-min-height: 64px;
      }

      :host(.not-shown) {
        font-style: italic;
        color: var(--secondary-text-color);
        cursor: default;
      }

      ::slotted(ha-svg-icon) {
        color: var(--secondary-text-color);
      }

      .graphic {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: var(--ha-border-radius-sm);
        overflow: hidden;
      }

      :host(.show-images) .graphic {
        width: 56px;
        height: 56px;
      }

      ha-media-browser-thumbnail {
        position: absolute;
        inset: 0;
      }

      ::slotted(.play) {
        position: absolute;
        inset: 0;
        margin: auto;
        width: 40px;
        height: 40px;
        opacity: 0;
        transition: all 0.5s;
        background-color: rgba(var(--rgb-card-background-color), 0.5);
        border-radius: var(--ha-border-radius-circle);
        --ha-icon-button-size: 40px;
      }

      :host(:hover) ::slotted(.play) {
        opacity: 1;
        color: var(--primary-text-color);
      }

      ::slotted(.play.show) {
        opacity: 1;
        background-color: transparent;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-media-player-browse-list-item": HaMediaPlayerBrowseListItem;
  }
}

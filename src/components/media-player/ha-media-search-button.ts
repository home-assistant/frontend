import { mdiFilter } from "@mdi/js";
import "@material/mwc-button";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { MediaPlayerItem } from "../../data/media-player";
import { MediaPlayerItemId } from "./ha-media-player-browse"
import "../ha-svg-icon";
import type { HomeAssistant } from "../../types";
import { showPromptDialog } from "../../dialogs/generic/show-dialog-box";
import { fireEvent } from "../../common/dom/fire_event";

declare global {
  interface HASSDomEvents {
      "media-refresh": unknown;
      "media-browsed": {
        // Items of the new browse stack
        ids: MediaPlayerItemId[];
        // Current fetched item for this browse stack
        current?: MediaPlayerItem;
        // If the new stack should replace the old stack
        replace?: boolean;
      };
  }
}

@customElement("ha-media-search-button")
class MediaSearchButton extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public navigateIds!: MediaPlayerItemId[];

  @property() currentItem?: MediaPlayerItem;

  protected render() {
    if (!this.currentItem ||
      !this.currentItem?.can_search) {
      return nothing;
    }
    return html`
      <mwc-button
        .label=${this.hass.localize(
          "ui.components.media-browser.media_search.search"
        )}
        @click=${this._search}
      >
        <ha-svg-icon .path=${mdiFilter} slot="icon"></ha-svg-icon>
      </mwc-button>
    `;
  }

    private _search() {
    const newValue = this.currentItem?.can_search ? "" : "Not Searchable";
    showPromptDialog(this, {
        title: this.hass.localize("ui.components.media-browser.media_search.title"),
        text: this.hass.localize("ui.components.media-browser.media_search.search"),
        confirmText: this.hass.localize("ui.components.media-browser.media_search.search"),
        defaultValue: newValue,
        confirm: async (query) => {
          if (!query || !this.currentItem) {
            return;
          }

          if (!query.includes("*"))
            query = "*" + query + "*";

          const navNew = [...this.navigateIds];
          navNew.push(this.currentItem);
          this.currentItem.media_content_id = query;

          fireEvent(this, "media-browsed", {
              ids: navNew,
              current: this.currentItem,
          });
        },
        cancel: () => {
        },
      });
  }

  static styles = css`
    mwc-button {
      --mdc-button-disabled-ink-color: --mdc-theme-primary;
    }

    ha-svg-icon[slot="icon"],
    ha-circular-progress[slot="icon"] {
      vertical-align: middle;
    }

    ha-svg-icon[slot="icon"] {
      margin-inline-start: 0px;
      margin-inline-end: 8px;
      direction: var(--direction);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-media-search-button": MediaSearchButton;
  }
}

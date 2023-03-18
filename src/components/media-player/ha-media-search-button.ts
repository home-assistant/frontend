import { mdiFilter } from "@mdi/js";
import "@material/mwc-button";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
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

  protected render(): TemplateResult {
    if (!this.currentItem ||
      !this.currentItem?.can_search) {
      return html``;
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
    let newValue = this.currentItem?.can_search ? "*" : "Not Searchable";
    showPromptDialog(this, {
        title: this.hass.localize("ui.components.media-browser.media_search.title"),
        text: this.hass.localize("ui.components.media-browser.media_search.search"),
        confirmText: this.hass.localize("ui.components.media-browser.media_search.search"),
        inputLabel: this.hass.localize("ui.components.area-picker.add_dialog.name"),
        defaultValue: newValue,
        confirm: async (name) => {
          if (!name || !this.currentItem) {
            return;
          }

          let navNew = [...this.navigateIds];
          navNew.push(this.currentItem);
          this.currentItem.media_content_id = name;

          fireEvent(this, "media-browsed", {
              ids: navNew,
              current: this.currentItem,
          });
          //fireEvent(this, "media-refresh");
        },
        cancel: () => {
        },
      });
  }

  static styles = css`
    mwc-button {
      /* We use icon + text to show disabled state */
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

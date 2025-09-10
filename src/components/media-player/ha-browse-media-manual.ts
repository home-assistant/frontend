import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";

import { fireEvent } from "../../common/dom/fire_event";

import type { MediaPlayerBrowseAction } from "../../data/media-player";
import { buttonLinkStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../ha-button";
import "../ha-card";
import "../ha-textarea";
import "../ha-form/ha-form";
import type { SchemaUnion } from "../ha-form/types";
import type { MediaPlayerItemId } from "./ha-media-player-browse";

export interface ManualMediaPickedEvent {
  item: MediaPlayerItemId;
}

declare global {
  interface HASSDomEvents {
    "manual-media-picked": ManualMediaPickedEvent;
  }
}

@customElement("ha-browse-media-manual")
class BrowseMediaManual extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public item!: MediaPlayerItemId;

  @property() public action!: MediaPlayerBrowseAction;

  private _schema = memoizeOne(
    () =>
      [
        {
          name: "media_content_id",
          required: true,
          selector: {
            text: {},
          },
        },
        {
          name: "media_content_type",
          required: false,
          selector: {
            text: {},
          },
        },
      ] as const
  );

  protected render() {
    return html`
      <ha-card>
        <div class="card-content">
          <ha-form
            .hass=${this.hass}
            .schema=${this._schema()}
            .data=${this.item}
            .computeLabel=${this._computeLabel}
            .computeHelper=${this._computeHelper}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        <div class="card-actions">
          <ha-button appearance="plain" @click=${this._mediaPicked}>
            ${this.hass.localize("ui.common.submit")}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    const value = { ...ev.detail.value };

    this.item = value;
  }

  private _computeLabel = (
    entry: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(`ui.components.selectors.media.${entry.name}`);

  private _computeHelper = (
    entry: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(`ui.components.selectors.media.${entry.name}_detail`);

  private _mediaPicked() {
    fireEvent(this, "manual-media-picked", {
      item: {
        media_content_id: this.item.media_content_id || "",
        media_content_type: this.item.media_content_type || "",
      },
    });
  }

  static override styles = [
    buttonLinkStyle,
    css`
      :host {
        margin: 16px auto;
        padding: 0 8px;
        display: flex;
        flex-direction: column;
        max-width: 448px;
      }
      .options {
        margin-top: 16px;
        display: flex;
        justify-content: space-between;
      }
      ha-textarea {
        width: 100%;
      }
      button.link {
        color: var(--primary-color);
      }
      .footer {
        font-size: var(--ha-font-size-s);
        color: var(--secondary-text-color);
        margin: 16px 0;
        text-align: center;
      }
      .footer code {
        font-weight: var(--ha-font-weight-bold);
      }
      .footer {
        --mdc-icon-size: 14px;
        --mdc-icon-button-size: 24px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-browse-media-manual": BrowseMediaManual;
  }
}

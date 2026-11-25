import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import "../ha-button";
import "../ha-card";
import "../ha-form/ha-form";
import type { SchemaUnion } from "../ha-form/types";
import type { MediaPlayerItemId } from "./ha-media-player-browse";

export interface ManualMediaPickedEvent {
  item: MediaPlayerItemId;
}

@customElement("ha-browse-media-manual")
class BrowseMediaManual extends LitElement {
  @property({ attribute: false }) public item!: MediaPlayerItemId;

  @property({ attribute: false }) public hideContentType = false;

  @property({ attribute: false }) public contentIdHelper?: string;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  private _schema = memoizeOne(
    (hideContentType: boolean) =>
      [
        {
          name: "media_content_id",
          required: true,
          selector: {
            text: {},
          },
        },
        ...(hideContentType
          ? []
          : [
              {
                name: "media_content_type",
                required: false,
                selector: {
                  text: {},
                },
              },
            ]),
      ] as const
  );

  protected render() {
    return html`
      <ha-card>
        <div class="card-content">
          <ha-form
            .schema=${this._schema(this.hideContentType)}
            .data=${this.item}
            .computeLabel=${this._computeLabel(this._localize)}
            .computeHelper=${this._computeHelper(
              this._localize,
              this.contentIdHelper
            )}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        <div class="card-actions">
          <ha-button @click=${this._mediaPicked}>
            ${this._localize("ui.common.submit")}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    const value = { ...ev.detail.value };

    this.item = value;
  }

  private _computeLabel = memoizeOne(
    (localize: LocalizeFunc) =>
      (entry: SchemaUnion<ReturnType<typeof this._schema>>): string => {
        switch (entry.name) {
          case "media_content_id":
          case "media_content_type":
            return localize(`ui.components.selectors.media.${entry.name}`);
        }
        return entry.name;
      }
  );

  private _computeHelper = memoizeOne(
    (localize: LocalizeFunc, contentIdHelper?: string) =>
      (entry: SchemaUnion<ReturnType<typeof this._schema>>): string => {
        switch (entry.name) {
          case "media_content_id":
            return (
              contentIdHelper ||
              localize(`ui.components.selectors.media.${entry.name}_detail`)
            );
          case "media_content_type":
            return localize(
              `ui.components.selectors.media.${entry.name}_detail`
            );
        }
        return "";
      }
  );

  private _mediaPicked() {
    fireEvent(this, "manual-media-picked", {
      item: {
        media_content_id: this.item.media_content_id || "",
        media_content_type: this.item.media_content_type || "",
      },
    });
  }

  static override styles = css`
    :host {
      margin: 16px auto;
      padding: 0 8px;
      display: flex;
      flex-direction: column;
      max-width: 448px;
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-browse-media-manual": BrowseMediaManual;
  }

  interface HASSDomEvents {
    "manual-media-picked": ManualMediaPickedEvent;
  }
}

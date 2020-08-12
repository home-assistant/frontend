import {
  customElement,
  LitElement,
  property,
  PropertyValues,
  css,
  html,
} from "lit-element";
import {
  fetchTags,
  Tag,
  EVENT_TAG_SCANNED,
  TagScannedEvent,
} from "../../../data/tag";
import "../../../layouts/hass-subpage";
import "../../../components/ha-card";
import "../../../components/ha-relative-time";
import { HomeAssistant } from "../../../types";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { formatDateTimeWithSeconds } from "../../../common/datetime/format_date_time";

@customElement("ha-config-tag")
export class HaConfigTags extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public _tags: Tag[] = [];

  @property() public _events: TagScannedEvent[] = [];

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._fetchTags();
  }

  protected hassSubscribe() {
    return [
      this.hass.connection.subscribeEvents<TagScannedEvent>((ev) => {
        this._fetchTags();
        const newEvents = [ev, ...this._events];
        if (newEvents.length > 20) {
          newEvents.pop();
        }
        this._events = newEvents;
      }, EVENT_TAG_SCANNED),
    ];
  }

  protected render() {
    return html`
      <hass-subpage header="Tags">
        <div class="content">
          <div class="tags">
            ${this._tags.map(
              (tag) => html`
                <div class="tag">
                  <div class="tag-id">${tag.id}</div>
                  <div class="name">Name: ${tag.name}</div>
                  <div class="last-scanned">
                    Last scanned:
                    ${tag.last_scanned
                      ? html`${formatDateTimeWithSeconds(
                            new Date(tag.last_scanned),
                            this.hass.language
                          )}
                          (<ha-relative-time
                            .hass=${this.hass}
                            .datetime=${tag.last_scanned}
                          ></ha-relative-time
                          >)`
                      : ""}
                  </div>
                </div>
              `
            )}
          </div>
          <ha-card header="Last Scans" class="scans">
            ${this._events.map(
              (ev) => html`
                <div class="scan">
                  <div>
                    <div class="tag-id">${ev.data.tag_id}</div>
                    ${!ev.data.device_id
                      ? ""
                      : html` <div class="device">${ev.data.device_id}}</div> `}
                  </div>
                  <ha-relative-time
                    .hass=${this.hass}
                    .datetime=${ev.time_fired}
                  ></ha-relative-time>
                </div>
              `
            )}
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private async _fetchTags() {
    this._tags = await fetchTags(this.hass);
  }

  static get styles() {
    return css`
      .content {
        display: flex;
      }
      .tags {
        flex: 1;
      }
      .tag {
        padding: 16px;
      }
      .scans {
        width: 300px;
      }
      .scan {
        display: flex;
        justify-content: space-between;
        padding: 8px 16px;
      }
    `;
  }
}

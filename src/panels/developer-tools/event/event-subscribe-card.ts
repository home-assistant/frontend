import "@material/mwc-button";
import { HassEvent } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { formatTime } from "../../../common/datetime/format_time";
import "../../../components/ha-card";
import "../../../components/ha-textfield";
import "../../../components/ha-yaml-editor";
import { HomeAssistant } from "../../../types";

@customElement("event-subscribe-card")
class EventSubscribeCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _eventType = "";

  @state() private _subscribed?: () => void;

  @state() private _events: Array<{
    id: number;
    event: HassEvent;
  }> = [];

  private _eventCount = 0;

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._subscribed) {
      this._subscribed();
      this._subscribed = undefined;
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-card
        header=${this.hass!.localize(
          "ui.panel.developer-tools.tabs.events.listen_to_events"
        )}
      >
        <form>
          <ha-textfield
            .label=${this._subscribed
              ? this.hass!.localize(
                  "ui.panel.developer-tools.tabs.events.listening_to"
                )
              : this.hass!.localize(
                  "ui.panel.developer-tools.tabs.events.subscribe_to"
                )}
            .disabled=${this._subscribed !== undefined}
            .value=${this._eventType}
            @input=${this._valueChanged}
          ></ha-textfield>
          <mwc-button
            .disabled=${this._eventType === ""}
            @click=${this._handleSubmit}
            type="submit"
          >
            ${this._subscribed
              ? this.hass!.localize(
                  "ui.panel.developer-tools.tabs.events.stop_listening"
                )
              : this.hass!.localize(
                  "ui.panel.developer-tools.tabs.events.start_listening"
                )}
          </mwc-button>
        </form>
        <div class="events">
          ${repeat(
            this._events,
            (event) => event.id,
            (event) => html`
              <div class="event">
                ${this.hass!.localize(
                  "ui.panel.developer-tools.tabs.events.event_fired",
                  "name",
                  event.id
                )}
                ${formatTime(
                  new Date(event.event.time_fired),
                  this.hass!.locale,
                  this.hass!.config
                )}:
                <ha-yaml-editor
                  .defaultValue=${event.event}
                  readOnly
                ></ha-yaml-editor>
              </div>
            `
          )}
        </div>
      </ha-card>
    `;
  }

  private _valueChanged(ev): void {
    this._eventType = ev.target.value;
  }

  private async _handleSubmit(): Promise<void> {
    if (this._subscribed) {
      this._subscribed();
      this._subscribed = undefined;
    } else {
      this._subscribed = await this.hass!.connection.subscribeEvents<HassEvent>(
        (event) => {
          const tail =
            this._events.length > 30 ? this._events.slice(0, 29) : this._events;
          this._events = [
            {
              event,
              id: this._eventCount++,
            },
            ...tail,
          ];
        },
        this._eventType
      );
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      form {
        display: block;
        padding: 0 0 16px 16px;
      }
      ha-textfield {
        width: 300px;
      }
      mwc-button {
        vertical-align: middle;
      }
      .events {
        margin: -16px 0;
        padding: 0 16px;
      }
      .event {
        border-top: 1px solid var(--divider-color);
        padding-top: 8px;
        padding-bottom: 8px;
        margin: 16px 0;
      }
      .event:last-child {
        border-bottom: 0;
      }
      pre {
        font-family: var(--code-font-family, monospace);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "event-subscribe-card": EventSubscribeCard;
  }
}

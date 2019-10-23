import {
  LitElement,
  customElement,
  TemplateResult,
  html,
  property,
  CSSResult,
  css,
} from "lit-element";
import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import { HassEvent } from "home-assistant-js-websocket";
import { HomeAssistant } from "../../../types";
import { PolymerChangedEvent } from "../../../polymer-types";
import "../../../components/ha-card";
import format_time from "../../../common/datetime/format_time";

@customElement("event-subscribe-card")
class EventSubscribeCard extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() private _eventType = "";

  @property() private _subscribed?: () => void;

  @property() private _events: Array<{ id: number; event: HassEvent }> = [];

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
          <paper-input
            .label=${this._subscribed
              ? this.hass!.localize(
                  "ui.panel.developer-tools.tabs.events.listening_to"
                )
              : this.hass!.localize(
                  "ui.panel.developer-tools.tabs.events.subscribe_to"
                )}
            .disabled=${this._subscribed !== undefined}
            .value=${this._eventType}
            @value-changed=${this._valueChanged}
          ></paper-input>
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
          ${this._events.map(
            (ev) => html`
              <div class="event">
                ${this.hass!.localize(
                  "ui.panel.developer-tools.tabs.events.event_fired",
                  "name",
                  ev.id
                )}
                ${format_time(
                  new Date(ev.event.time_fired),
                  this.hass!.language
                )}:
                <pre>${JSON.stringify(ev.event, null, 4)}</pre>
              </div>
            `
          )}
        </div>
      </ha-card>
    `;
  }

  private _valueChanged(ev: PolymerChangedEvent<string>): void {
    this._eventType = ev.detail.value;
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

  static get styles(): CSSResult {
    return css`
      form {
        display: block;
        padding: 16px;
      }
      paper-input {
        display: inline-block;
        width: 200px;
      }
      .events {
        margin: -16px 0;
        padding: 0 16px;
      }
      .event {
        border-bottom: 1px solid var(--divider-color);
        padding-bottom: 16px;
        margin: 16px 0;
      }
      .event:last-child {
        border-bottom: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "event-subscribe-card": EventSubscribeCard;
  }
}

import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { stringCompare } from "../../../common/string/compare";
import { fireEvent } from "../../../common/dom/fire_event";
import { HomeAssistant } from "../../../types";

interface EventListenerCount {
  event: string;
  listener_count: number;
}

@customElement("events-list")
class EventsList extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public events: EventListenerCount[] = [];

  protected render(): TemplateResult {
    return html`
      <ul>
        ${this.events.map(
          (event) => html`
            <li>
              <a href="#" @click=${this._eventSelected} .event=${event.event}
                >${event.event}</a
              >
              <span>
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.events.count_listeners",
                  {
                    count: event.listener_count,
                  }
                )}</span
              >
            </li>
          `
        )}
      </ul>
    `;
  }

  protected async firstUpdated() {
    const events = await this.hass.callApi<EventListenerCount[]>(
      "GET",
      "events"
    );
    this.events = events.sort((e1, e2) =>
      stringCompare(e1.event, e2.event, this.hass.locale.language)
    );
  }

  private _eventSelected(ev: Event) {
    ev.preventDefault();
    const event: string = (ev.currentTarget! as any).event;
    fireEvent(this, "event-selected", { eventType: event });
  }

  static get styles(): CSSResultGroup {
    return css`
      ul {
        margin: 0;
        padding: 0;
      }

      li {
        list-style: none;
        line-height: 2em;
      }

      a {
        color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "events-list": EventsList;
  }
  interface HASSDomEvents {
    "event-selected": { eventType: string };
  }
}

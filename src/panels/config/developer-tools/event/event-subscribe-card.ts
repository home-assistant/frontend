import type { HassEvent } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { formatTime } from "../../../../common/datetime/format_time";
import "../../../../components/ha-card";
import "../../../../components/ha-textfield";
import "../../../../components/ha-yaml-editor";
import "../../../../components/ha-button";
import "../../../../components/ha-alert";
import type { HomeAssistant } from "../../../../types";

@customElement("event-subscribe-card")
class EventSubscribeCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public selectedEventType = "";

  @state() private _eventType = "";

  @state() private _subscribed?: () => void;

  @state() private _eventFilter = "";

  @state() private _events: {
    id: number;
    event: HassEvent;
  }[] = [];

  @state() private _error?: string;

  private _eventCount = 0;

  @state() _ignoredEventsCount = 0;

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._subscribed) {
      this._subscribed();
      this._subscribed = undefined;
    }
  }

  protected willUpdate(changedProperties: Map<string, any>) {
    super.willUpdate(changedProperties);

    if (
      changedProperties.has("selectedEventType") &&
      this.selectedEventType &&
      !this._subscribed
    ) {
      this._eventType = this.selectedEventType;
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-card
        header=${this.hass!.localize(
          "ui.panel.config.developer-tools.tabs.events.listen_to_events"
        )}
      >
        <div class="card-content">
          <ha-textfield
            .label=${this._subscribed
              ? this.hass!.localize(
                  "ui.panel.config.developer-tools.tabs.events.listening_to"
                )
              : this.hass!.localize(
                  "ui.panel.config.developer-tools.tabs.events.subscribe_to"
                )}
            .disabled=${this._subscribed !== undefined}
            .value=${this._eventType}
            @input=${this._valueChanged}
          ></ha-textfield>
          <ha-textfield
            .label=${this.hass!.localize(
              "ui.panel.config.developer-tools.tabs.events.filter_events"
            )}
            .value=${this._eventFilter}
            .disabled=${this._subscribed !== undefined}
            helperPersistent
            .helper=${`${this.hass!.localize("ui.panel.config.developer-tools.tabs.events.filter_helper")}${this._ignoredEventsCount ? ` ${this.hass!.localize("ui.panel.config.developer-tools.tabs.events.filter_ignored", { count: this._ignoredEventsCount })}` : ""}`}
            @input=${this._filterChanged}
          ></ha-textfield>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
        </div>
        <div class="card-actions">
          <ha-button
            appearance="filled"
            .disabled=${this._eventType === ""}
            @click=${this._startOrStopListening}
          >
            ${this._subscribed
              ? this.hass!.localize(
                  "ui.panel.config.developer-tools.tabs.events.stop_listening"
                )
              : this.hass!.localize(
                  "ui.panel.config.developer-tools.tabs.events.start_listening"
                )}
          </ha-button>
          <ha-button
            appearance="plain"
            .disabled=${this._eventType === ""}
            @click=${this._clearEvents}
          >
            ${this.hass!.localize(
              "ui.panel.config.developer-tools.tabs.events.clear_events"
            )}
          </ha-button>
        </div>
      </ha-card>
      <ha-card>
        <div class="card-content">
          <div class="events">
            ${repeat(
              this._events,
              (event) => event.id,
              (event) => html`
                <div class="event">
                  ${this.hass!.localize(
                    "ui.panel.config.developer-tools.tabs.events.event_fired",
                    { name: event.id }
                  )}
                  ${formatTime(
                    new Date(event.event.time_fired),
                    this.hass!.locale,
                    this.hass!.config
                  )}:
                  <ha-yaml-editor
                    .hass=${this.hass}
                    .defaultValue=${event.event}
                    read-only
                  ></ha-yaml-editor>
                </div>
              `
            )}
          </div>
        </div>
      </ha-card>
    `;
  }

  private _valueChanged(ev): void {
    this._eventType = ev.target.value;
    this._error = undefined;
  }

  private _filterChanged(ev): void {
    this._eventFilter = ev.target.value;
  }

  private _testEventFilter(event: HassEvent): boolean {
    if (!this._eventFilter) {
      return true;
    }

    const searchStr = this._eventFilter;

    function visit(node) {
      // Handle primitives directly
      if (node === null || typeof node !== "object") {
        return String(node).includes(searchStr);
      }

      // Handle arrays and plain objects
      for (const key in node) {
        if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
        // Check key
        if (key.includes(searchStr)) return true;

        const value = node[key];

        // Check primitive value
        if (value === null || typeof value !== "object") {
          if (String(value).includes(searchStr)) return true;
        } else if (visit(value)) {
          // Recurse into nested object/array
          return true;
        }
      }

      return false;
    }

    return visit(event);
  }

  private async _startOrStopListening(): Promise<void> {
    if (this._subscribed) {
      this._subscribed();
      this._subscribed = undefined;
      this._error = undefined;
    } else {
      try {
        this._subscribed =
          await this.hass!.connection.subscribeEvents<HassEvent>((event) => {
            if (!this._testEventFilter(event)) {
              this._ignoredEventsCount++;
              return;
            }
            const tail =
              this._events.length > 30
                ? this._events.slice(0, 29)
                : this._events;
            this._events = [
              {
                event,
                id: this._eventCount++,
              },
              ...tail,
            ];
          }, this._eventType);
      } catch (error: any) {
        this._error = this.hass!.localize(
          "ui.panel.config.developer-tools.tabs.events.subscribe_failed",
          { error: error.message || "Unknown error" }
        );
      }
    }
  }

  private _clearEvents(): void {
    this._events = [];
    this._eventCount = 0;
    this._ignoredEventsCount = 0;
    this._error = undefined;
  }

  static styles = css`
    ha-textfield {
      display: block;
      margin-bottom: var(--ha-space-4);
    }
    .error-message {
      margin-top: var(--ha-space-2);
    }
    .event {
      border-top: 1px solid var(--divider-color);
      padding-top: var(--ha-space-2);
      padding-bottom: var(--ha-space-2);
      margin: var(--ha-space-4) 0;
    }
    .event:last-child {
      border-bottom: 0;
      margin-bottom: 0;
    }
    pre {
      font-family: var(--ha-font-family-code);
    }
    ha-card {
      margin-bottom: var(--ha-space-1);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "event-subscribe-card": EventSubscribeCard;
  }
}

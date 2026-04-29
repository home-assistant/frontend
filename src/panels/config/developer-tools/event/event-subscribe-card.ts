import {
  mdiChevronDoubleLeft,
  mdiChevronDoubleRight,
  mdiChevronLeft,
  mdiChevronRight,
} from "@mdi/js";
import type { HassEvent } from "home-assistant-js-websocket";
import type { TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatTimeWithSeconds } from "../../../../common/datetime/format_time";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-yaml-editor";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import type { HomeAssistant } from "../../../../types";

interface SubscribedEvent {
  id: number;
  event: HassEvent;
}

@customElement("event-subscribe-card")
class EventSubscribeCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public selectedEventType = "";

  @state() private _eventType = "";

  @state() private _subscribed?: () => void;

  @state() private _eventFilter = "";

  @state() private _events: SubscribedEvent[] = [];

  @state() private _error?: string;

  @state() private _viewedEventId?: number;

  private _eventCount = 0;

  @state() _ignoredEventsCount = 0;

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._subscribed) {
      this._subscribed();
      this._subscribed = undefined;
    }
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
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
          <ha-input
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
          ></ha-input>
          <ha-input
            .label=${this.hass!.localize(
              "ui.panel.config.developer-tools.tabs.events.filter_events"
            )}
            .value=${this._eventFilter}
            .disabled=${this._subscribed !== undefined}
            .hint=${`${this.hass!.localize("ui.panel.config.developer-tools.tabs.events.filter_helper")}${this._ignoredEventsCount ? ` ${this.hass!.localize("ui.panel.config.developer-tools.tabs.events.filter_ignored", { count: this._ignoredEventsCount })}` : ""}`}
            @input=${this._filterChanged}
          ></ha-input>
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
      ${this._renderEventsCard()}
    `;
  }

  private _renderEventsCard(): TemplateResult {
    if (!this._events.length) {
      const message = this._subscribed
        ? this.hass!.localize(
            "ui.panel.config.developer-tools.tabs.events.waiting_for_events"
          )
        : this.hass!.localize(
            "ui.panel.config.developer-tools.tabs.events.subscribe_prompt"
          );
      return html`
        <ha-card class="events-card">
          <div class="empty-state">${message}</div>
        </ha-card>
      `;
    }
    const total = this._events.length;
    // Events are stored newest-first. If the user hasn't navigated, show the
    // newest (index 0). Once they navigate, pin to the chosen event id.
    const index =
      this._viewedEventId === undefined
        ? 0
        : Math.max(
            0,
            this._events.findIndex((e) => e.id === this._viewedEventId)
          );
    const event = this._events[index];
    return html`
      <ha-card class="events-card">
        <div class="events-toolbar">
          <ha-icon-button
            .path=${mdiChevronDoubleLeft}
            .disabled=${index >= total - 1}
            .label=${this.hass!.localize(
              "ui.panel.config.developer-tools.tabs.events.oldest_event"
            )}
            @click=${this._showOldest}
          ></ha-icon-button>
          <ha-icon-button
            .path=${mdiChevronLeft}
            .disabled=${index >= total - 1}
            .label=${this.hass!.localize(
              "ui.panel.config.developer-tools.tabs.events.older_event"
            )}
            @click=${this._showOlder}
          ></ha-icon-button>
          <div class="event-info">
            ${this.hass!.localize(
              "ui.panel.config.developer-tools.tabs.events.event_fired",
              { name: event.id + 1 }
            )}
            ${formatTimeWithSeconds(
              new Date(event.event.time_fired),
              this.hass!.locale,
              this.hass!.config
            )}
            <span class="counter">(${total - index} / ${total})</span>
          </div>
          <ha-icon-button
            .path=${mdiChevronRight}
            .disabled=${index <= 0}
            .label=${this.hass!.localize(
              "ui.panel.config.developer-tools.tabs.events.newer_event"
            )}
            @click=${this._showNewer}
          ></ha-icon-button>
          <ha-icon-button
            .path=${mdiChevronDoubleRight}
            .disabled=${this._viewedEventId === undefined}
            .label=${this.hass!.localize(
              "ui.panel.config.developer-tools.tabs.events.newest_event"
            )}
            @click=${this._showNewest}
          ></ha-icon-button>
        </div>
        <ha-yaml-editor
          .hass=${this.hass}
          .value=${event.event}
          auto-update
          read-only
        ></ha-yaml-editor>
      </ha-card>
    `;
  }

  private _showOldest(): void {
    if (!this._events.length) {
      return;
    }
    this._viewedEventId = this._events[this._events.length - 1].id;
  }

  private _showOlder(): void {
    const total = this._events.length;
    const current =
      this._viewedEventId === undefined
        ? 0
        : this._events.findIndex((e) => e.id === this._viewedEventId);
    const next = Math.min(current + 1, total - 1);
    this._viewedEventId = this._events[next].id;
  }

  private _showNewest(): void {
    // Resume auto-follow on incoming events.
    this._viewedEventId = undefined;
  }

  private _showNewer(): void {
    if (this._viewedEventId === undefined) {
      return;
    }

    const current = this._events.findIndex((e) => e.id === this._viewedEventId);
    const next = Math.max(current - 1, 0);

    // Reaching the newest event resumes auto-follow on incoming events.
    this._viewedEventId = next === 0 ? undefined : this._events[next].id;
  }

  private _valueChanged(ev: InputEvent): void {
    this._eventType = (ev.target as HaInput).value ?? "";
    this._error = undefined;
  }

  private _filterChanged(ev: InputEvent): void {
    this._eventFilter = (ev.target as HaInput).value ?? "";
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
          {
            error:
              error.message ??
              this.hass!.localize(
                "ui.panel.config.developer-tools.tabs.events.unknown_error"
              ),
          }
        );
      }
    }
  }

  private _clearEvents(): void {
    this._events = [];
    this._eventCount = 0;
    this._ignoredEventsCount = 0;
    this._error = undefined;
    this._viewedEventId = undefined;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    ha-input {
      margin-bottom: var(--ha-space-2);
    }
    .error-message {
      margin-top: var(--ha-space-2);
    }
    pre {
      font-family: var(--ha-font-family-code);
    }
    ha-card {
      margin-bottom: var(--ha-space-2);
    }
    .events-card {
      display: flex;
      flex-direction: column;
      min-height: 0;
      flex: 1;
      padding: var(--ha-space-2);
    }
    .events-toolbar {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }
    .empty-state {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      padding: var(--ha-space-8);
      color: var(--primary-text-color);
      text-align: center;
      font-size: var(--ha-font-size-xl);
      line-height: var(--ha-line-height-normal);
    }
    .event-info {
      flex: 1;
      text-align: center;
      font-size: var(--ha-font-size-m);
    }
    .counter {
      color: var(--secondary-text-color);
      margin-left: var(--ha-space-2);
    }
    ha-yaml-editor {
      display: flex;
      flex-direction: column;
      min-height: 0;
      flex: 1;
      margin-top: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "event-subscribe-card": EventSubscribeCard;
  }
}

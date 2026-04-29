import {
  mdiChevronDoubleLeft,
  mdiChevronDoubleRight,
  mdiChevronLeft,
  mdiChevronRight,
  mdiInformationOutline,
} from "@mdi/js";
import type { HassEvent } from "home-assistant-js-websocket";
import type { TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatTimeWithSeconds } from "../../../../common/datetime/format_time";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import "../../../../components/ha-yaml-editor";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import type { HomeAssistant } from "../../../../types";

const MAX_BUFFERED_EVENTS = 100;

interface SubscribedEvent {
  id: number;
  event: HassEvent;
}

@customElement("event-subscribe-card")
class EventSubscribeCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

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
    const bufferTotal = this._events.length;
    const index = this._resolveViewedIndex();
    const event = this._events[index];
    const position = event.id + 1;

    const bufferPosition = bufferTotal - index;
    const atNewest = index === 0;

    const hasRolledOver = this._events[bufferTotal - 1].id > 0;

    return html`
      <ha-card class="events-card">
        <div class="events-toolbar">
          <ha-icon-button
            .path=${mdiChevronDoubleLeft}
            .disabled=${index >= bufferTotal - 1}
            .label=${this.hass!.localize(
              "ui.panel.config.developer-tools.tabs.events.oldest_event"
            )}
            @click=${this._showOldest}
          ></ha-icon-button>
          <ha-icon-button
            .path=${mdiChevronLeft}
            .disabled=${index >= bufferTotal - 1}
            .label=${this.hass!.localize(
              "ui.panel.config.developer-tools.tabs.events.older_event"
            )}
            @click=${this._showOlder}
          ></ha-icon-button>
          <div class="event-info">
            ${this.hass!.localize(
              "ui.panel.config.developer-tools.tabs.events.event_fired",
              {
                name: position,
                time: formatTimeWithSeconds(
                  new Date(event.event.time_fired),
                  this.hass!.locale,
                  this.hass!.config
                ),
              }
            )}
            <span class="counter">(${bufferPosition} / ${bufferTotal})</span>
            ${hasRolledOver
              ? html`
                  <ha-svg-icon
                    id="buffer-info"
                    class="buffer-info"
                    .path=${mdiInformationOutline}
                  ></ha-svg-icon>
                  <ha-tooltip for="buffer-info" placement="bottom">
                    <span class="buffer-tooltip">
                      ${this.hass!.localize(
                        "ui.panel.config.developer-tools.tabs.events.buffer_disclaimer",
                        { count: MAX_BUFFERED_EVENTS }
                      )}
                    </span>
                  </ha-tooltip>
                `
              : nothing}
          </div>
          <ha-icon-button
            .path=${mdiChevronRight}
            .disabled=${atNewest}
            .label=${this.hass!.localize(
              "ui.panel.config.developer-tools.tabs.events.newer_event"
            )}
            @click=${this._showNewer}
          ></ha-icon-button>
          <ha-icon-button
            .path=${mdiChevronDoubleRight}
            .disabled=${atNewest}
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

  private _resolveViewedIndex(): number {
    if (this._viewedEventId === undefined) {
      return 0;
    }
    const found = this._events.findIndex((e) => e.id === this._viewedEventId);

    // Fall back to the oldest available event when the viewed one has aged out.
    return found === -1 ? this._events.length - 1 : found;
  }

  private _showOldest() {
    if (!this._events.length) {
      return;
    }
    this._viewedEventId = this._events[this._events.length - 1].id;
  }

  private _showOlder() {
    if (!this._events.length) {
      return;
    }
    const next = Math.min(
      this._resolveViewedIndex() + 1,
      this._events.length - 1
    );
    this._viewedEventId = this._events[next].id;
  }

  private _showNewest() {
    if (!this._events.length) {
      return;
    }
    this._viewedEventId = this._events[0].id;
  }

  private _showNewer() {
    if (!this._events.length) {
      return;
    }
    const next = Math.max(this._resolveViewedIndex() - 1, 0);
    this._viewedEventId = this._events[next].id;
  }

  private _valueChanged(ev: InputEvent) {
    this._eventType = (ev.target as HaInput).value ?? "";
    this._error = undefined;
  }

  private _filterChanged(ev: InputEvent) {
    this._eventFilter = (ev.target as HaInput).value ?? "";
  }

  private _testEventFilter(event: HassEvent): boolean {
    if (!this._eventFilter) {
      return true;
    }

    const searchStr = this._eventFilter;

    function visit(node: unknown) {
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
              this._events.length >= MAX_BUFFERED_EVENTS
                ? this._events.slice(0, MAX_BUFFERED_EVENTS - 1)
                : this._events;
            const id = this._eventCount++;
            this._events = [
              {
                event,
                id,
              },
              ...tail,
            ];
            if (this._viewedEventId === undefined) {
              this._viewedEventId = id;
            }
          }, this._eventType);
      } catch (error) {
        this._error = this.hass!.localize(
          "ui.panel.config.developer-tools.tabs.events.subscribe_failed",
          {
            error:
              error instanceof Error
                ? error.message
                : this.hass!.localize(
                    "ui.panel.config.developer-tools.tabs.events.unknown_error"
                  ),
          }
        );
      }
    }
  }

  private _clearEvents() {
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
      height: 620px;
      padding: var(--ha-space-2);
    }
    :host([narrow]) .events-card {
      height: auto;
      min-height: 360px;
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
    .buffer-info {
      color: var(--secondary-text-color);
      margin-left: var(--ha-space-1);
      vertical-align: middle;
      --mdc-icon-size: 16px;
    }
    .buffer-tooltip {
      white-space: pre-line;
      display: block;
      max-width: 320px;
    }
    ha-yaml-editor {
      display: flex;
      flex-direction: column;
      min-height: 0;
      flex: 1;
      margin-top: var(--ha-space-2);
      --code-mirror-height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "event-subscribe-card": EventSubscribeCard;
  }
}

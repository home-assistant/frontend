import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { HomeAssistant } from "../types";
import type { Calendar, CalendarEvent, CalendarEventApiData } from "./calendar";
import {
  normalizeSubscriptionEventData,
  subscribeCalendarEvents,
} from "./calendar";

interface CalendarSubscription {
  unsub?: Promise<UnsubscribeFunc>;
}

/**
 * Reactive controller that keeps live event subscriptions for a set of
 * calendars over a date range, and collects their events for rendering in
 * `ha-full-calendar`.
 */
export class CalendarEventsController implements ReactiveController {
  /** Events of all subscribed calendars. */
  public events: CalendarEvent[] = [];

  /** Calendars that failed to return events in their last update. */
  public errorCalendars: string[] = [];

  private _host: ReactiveControllerHost;

  private _subscriptions: Record<string, CalendarSubscription> = {};

  private _received = new Set<string>();

  private _connected = false;

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    host.addController(this);
  }

  /** Whether there are subscriptions and every one has reported at least once. */
  public get loaded(): boolean {
    const entityIds = Object.keys(this._subscriptions);
    return (
      entityIds.length > 0 &&
      entityIds.every((entityId) => this._received.has(entityId))
    );
  }

  hostConnected(): void {
    this._connected = true;
  }

  hostDisconnected(): void {
    this._connected = false;
    this.unsubscribeAll();
  }

  /**
   * Subscribe the given calendars, replacing any existing subscription of them.
   * Does nothing while the host is disconnected, so a subscribe that was
   * awaiting `unsubscribeAll()` cannot outlive the host.
   */
  public subscribe(
    hass: HomeAssistant,
    calendars: Calendar[],
    start: Date,
    end: Date
  ): void {
    if (!this._connected) {
      return;
    }
    calendars.forEach((calendar) => {
      this.unsubscribe(calendar.entity_id);
      // Registered before subscribing, as the first update may arrive
      // before the subscribe call returns.
      const subscription: CalendarSubscription = {};
      this._subscriptions[calendar.entity_id] = subscription;
      subscription.unsub = subscribeCalendarEvents(
        hass,
        calendar.entity_id,
        start,
        end,
        (update) => {
          // Ignore updates still in flight for a replaced subscription
          if (this._subscriptions[calendar.entity_id] !== subscription) {
            return;
          }
          this._handleUpdate(calendar, update.events);
        }
      );
      subscription.unsub.catch(() => {
        // A rejected subscription reports no events, so show it as failed
        if (this._subscriptions[calendar.entity_id] === subscription) {
          this._handleUpdate(calendar, null);
        }
      });
    });
  }

  /** Unsubscribe one calendar and drop its events. */
  public unsubscribe(entityId: string): void {
    if (!(entityId in this._subscriptions)) {
      return;
    }
    const subscription = this._subscriptions[entityId];
    delete this._subscriptions[entityId];
    this._closeSubscription(subscription);
    this._removeCalendar(entityId);
    this._host.requestUpdate();
  }

  /** Unsubscribe all calendars and drop their events. */
  public async unsubscribeAll(): Promise<void> {
    const subscriptions = Object.values(this._subscriptions);
    this._subscriptions = {};
    this._received.clear();
    this.events = [];
    this.errorCalendars = [];
    this._host.requestUpdate();
    await Promise.all(
      subscriptions.map((subscription) => this._closeSubscription(subscription))
    );
  }

  private async _closeSubscription(
    subscription: CalendarSubscription
  ): Promise<void> {
    await subscription.unsub
      ?.then((unsubFunc) => unsubFunc())
      .catch(() => {
        // Subscription may have already been closed
      });
  }

  private _removeCalendar(entityId: string): void {
    this._received.delete(entityId);
    this.events = this.events.filter((event) => event.calendar !== entityId);
    this.errorCalendars = this.errorCalendars.filter((id) => id !== entityId);
  }

  private _handleUpdate(
    calendar: Calendar,
    events: CalendarEventApiData[] | null
  ): void {
    this._removeCalendar(calendar.entity_id);
    this._received.add(calendar.entity_id);

    if (events === null) {
      // Error fetching events
      this.errorCalendars = [...this.errorCalendars, calendar.entity_id];
    } else {
      this.events = [
        ...this.events,
        ...events
          .map((eventData) =>
            normalizeSubscriptionEventData(eventData, calendar)
          )
          .filter((event): event is CalendarEvent => event !== null),
      ];
    }

    this._host.requestUpdate();
  }
}

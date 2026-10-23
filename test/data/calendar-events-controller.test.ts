import type { ReactiveControllerHost } from "lit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Calendar,
  CalendarEventSubscription,
} from "../../src/data/calendar";
import { CalendarEventsController } from "../../src/data/calendar-events-controller";
import type { HomeAssistant } from "../../src/types";

// The calendar card, panel and more-info dialog rely on these rules to show
// the events of the range they are on, and to stop loading once every
// calendar has answered, while subscriptions are replaced and closed.

const START = new Date("2026-10-17T00:00:00Z");
const END = new Date("2026-10-24T00:00:00Z");

const FAMILY: Calendar = { entity_id: "calendar.family" };
const WORK: Calendar = { entity_id: "calendar.work" };

const EVENT = {
  summary: "Dentist",
  start: "2026-10-18T15:30:00Z",
  end: "2026-10-18T16:15:00Z",
};

interface MockSubscription {
  entityId: string;
  send: (update: CalendarEventSubscription) => void;
  unsub: ReturnType<typeof vi.fn>;
  reject: (err: unknown) => void;
}

const createHost = (): ReactiveControllerHost => ({
  addController: vi.fn(),
  removeController: vi.fn(),
  requestUpdate: vi.fn(),
  updateComplete: Promise.resolve(true),
});

describe("CalendarEventsController", () => {
  let subscriptions: MockSubscription[];
  let hass: HomeAssistant;
  let controller: CalendarEventsController;

  beforeEach(() => {
    subscriptions = [];
    hass = {
      connection: {
        subscribeMessage: (
          callback: (update: CalendarEventSubscription) => void,
          msg: { entity_id: string }
        ) =>
          new Promise((resolve, reject) => {
            const unsub = vi.fn();
            subscriptions.push({
              entityId: msg.entity_id,
              send: callback,
              unsub,
              reject,
            });
            resolve(unsub);
          }),
      },
    } as unknown as HomeAssistant;
    controller = new CalendarEventsController(createHost());
    controller.hostConnected();
  });

  it("collects events and is loaded once every calendar has answered", () => {
    controller.subscribe(hass, [FAMILY, WORK], START, END);
    subscriptions[0].send({ events: [EVENT] });
    expect(controller.events.map((event) => event.title)).toEqual(["Dentist"]);
    expect(controller.loaded).toBe(false);

    subscriptions[1].send({ events: [] });
    expect(controller.loaded).toBe(true);
  });

  it("reports a calendar that fails to fetch events as loaded with an error", () => {
    controller.subscribe(hass, [FAMILY], START, END);
    subscriptions[0].send({ events: null });
    expect(controller.errorCalendars).toEqual(["calendar.family"]);
    expect(controller.loaded).toBe(true);
  });

  it("reports a rejected subscription as loaded with an error", async () => {
    hass.connection.subscribeMessage = () =>
      Promise.reject(new Error("Entity not found")) as never;
    controller.subscribe(hass, [FAMILY], START, END);
    await vi.waitFor(() =>
      expect(controller.errorCalendars).toEqual(["calendar.family"])
    );
    expect(controller.loaded).toBe(true);
  });

  it("ignores updates from a replaced subscription", () => {
    controller.subscribe(hass, [FAMILY], START, END);
    const old = subscriptions[0];
    controller.subscribe(hass, [FAMILY], START, END);

    old.send({ events: [EVENT] });
    expect(controller.events).toEqual([]);
    expect(controller.loaded).toBe(false);
  });

  it("drops the events and closes the subscription of an unsubscribed calendar", async () => {
    controller.subscribe(hass, [FAMILY, WORK], START, END);
    subscriptions[0].send({ events: [EVENT] });
    subscriptions[1].send({ events: null });

    controller.unsubscribe("calendar.family");
    expect(controller.events).toEqual([]);
    expect(controller.errorCalendars).toEqual(["calendar.work"]);
    await vi.waitFor(() => expect(subscriptions[0].unsub).toHaveBeenCalled());
  });

  it("does not subscribe while the host is disconnected", async () => {
    controller.subscribe(hass, [FAMILY], START, END);
    controller.hostDisconnected();
    await vi.waitFor(() => expect(subscriptions[0].unsub).toHaveBeenCalled());

    // A host awaiting unsubscribeAll() before resubscribing when it was closed
    controller.subscribe(hass, [FAMILY], START, END);
    expect(subscriptions).toHaveLength(1);
  });
});

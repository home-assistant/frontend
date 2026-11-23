import { durationDataToSeconds } from "../../../src/common/datetime/duration_to_seconds";
import type {
  TimerListMessage,
  TimerListTimer,
} from "../../../src/data/timer_list";
import { timerListTimerRemaining } from "../../../src/data/timer_list";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export interface MockTimerListTimer {
  name?: string;
  // Seconds
  duration: number;
  remaining?: number;
  paused?: boolean;
}

type ChangeEventType = Extract<
  TimerListMessage,
  { type: "change" }
>["event_type"];

// Keeps the timers in memory, so the timer list actions work in demos.
export const mockTimerList = (
  hass: MockHomeAssistant,
  lists: Record<string, MockTimerListTimer[]>
) => {
  let nextId = 0;
  const listeners: Record<
    string,
    Set<(message: TimerListMessage) => void>
  > = {};

  const createTimer = (
    duration: number,
    name?: string,
    remaining = duration,
    paused = false
  ): TimerListTimer => ({
    timer_id: `timer-${nextId++}`,
    name: name ?? null,
    status: paused ? "paused" : "active",
    created_duration: duration,
    total_duration: duration,
    created_at: new Date().toISOString(),
    finishes_at: paused
      ? null
      : new Date(Date.now() + remaining * 1000).toISOString(),
    paused_remaining: paused ? remaining : null,
    ended_at: null,
    remaining,
  });

  const timers: Record<string, TimerListTimer[]> = Object.fromEntries(
    Object.entries(lists).map(([entityId, seeds]) => [
      entityId,
      seeds.map((seed) =>
        createTimer(seed.duration, seed.name, seed.remaining, seed.paused)
      ),
    ])
  );

  const change = (
    entityId: string,
    timer: TimerListTimer,
    eventType: ChangeEventType
  ) => {
    timers[entityId] = [
      ...timers[entityId].filter((item) => item.timer_id !== timer.timer_id),
      timer,
    ];
    listeners[entityId]?.forEach((listener) =>
      listener({ type: "change", event_type: eventType, timer })
    );
    hass.mockEntities[entityId].update({
      state: String(
        timers[entityId].filter((item) => item.status === "active").length
      ),
    });
  };

  const end = (
    entityId: string,
    timer: TimerListTimer,
    status: "finished" | "cancelled"
  ) =>
    change(
      entityId,
      {
        ...timer,
        status,
        finishes_at: null,
        paused_remaining: null,
        ended_at: new Date().toISOString(),
        remaining: 0,
      },
      status
    );

  const setRemaining = (
    entityId: string,
    timer: TimerListTimer,
    remaining: number,
    paused: boolean,
    eventType: ChangeEventType
  ) =>
    change(
      entityId,
      {
        ...timer,
        status: paused ? "paused" : "active",
        finishes_at: paused
          ? null
          : new Date(Date.now() + remaining * 1000).toISOString(),
        paused_remaining: paused ? remaining : null,
        total_duration: Math.max(timer.total_duration, Math.ceil(remaining)),
        remaining,
      },
      eventType
    );

  const mockTimerService = (
    service: string,
    handler: (
      entityId: string,
      timer: TimerListTimer,
      data: Record<string, any>
    ) => void
  ) =>
    hass.mockService("timer_list", service, (data, target) => {
      const entityId: string = target!.entity_id;
      const timer = timers[entityId].find(
        (item) => item.timer_id === data!.timer_id
      );
      if (timer) {
        handler(entityId, timer, data!);
      }
    });

  hass.mockService("timer_list", "create_timer", (data, target) =>
    change(
      target!.entity_id,
      createTimer(durationDataToSeconds(data!.duration), data!.name),
      "created"
    )
  );
  mockTimerService("pause_timer", (entityId, timer) =>
    setRemaining(
      entityId,
      timer,
      timerListTimerRemaining(timer),
      true,
      "paused"
    )
  );
  mockTimerService("unpause_timer", (entityId, timer) =>
    setRemaining(
      entityId,
      timer,
      timerListTimerRemaining(timer),
      false,
      "unpaused"
    )
  );
  mockTimerService("cancel_timer", (entityId, timer) =>
    end(entityId, timer, "cancelled")
  );
  mockTimerService("add_time", (entityId, timer, data) =>
    setRemaining(
      entityId,
      timer,
      timerListTimerRemaining(timer) + durationDataToSeconds(data.duration),
      timer.status === "paused",
      "time_changed"
    )
  );

  hass.mockWS("timer_list/item/subscribe", (msg, _hass, onChange) => {
    const entityId: string = msg.entity_id;
    listeners[entityId] ??= new Set();
    listeners[entityId].add(onChange!);
    onChange!({ type: "timers", timers: timers[entityId] ?? [] });
    return () => listeners[entityId].delete(onChange!);
  });

  window.setInterval(() => {
    for (const [entityId, items] of Object.entries(timers)) {
      for (const timer of items) {
        if (timer.status === "active" && !timerListTimerRemaining(timer)) {
          end(entityId, timer, "finished");
        }
      }
    }
  }, 1000);
};

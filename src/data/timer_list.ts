import type { Connection } from "home-assistant-js-websocket";
import type { HaDurationData } from "../components/ha-duration-input";
import type { HomeAssistant, ServiceCallResponse } from "../types";

export type TimerListTimerStatus =
  "active" | "paused" | "finished" | "cancelled";

export interface TimerListTimer {
  timer_id: string;
  name: string | null;
  status: TimerListTimerStatus;
  created_duration: number;
  total_duration: number;
  created_at: string;
  finishes_at: string | null;
  paused_remaining: number | null;
  ended_at: string | null;
  remaining: number;
}

export enum TimerListEntityFeature {
  CREATE_TIMER = 1,
  PAUSE_TIMER = 2,
  CANCEL_TIMER = 4,
  ADD_TIME = 8,
  REMOVE_TIMER = 16,
  FINISH_TIMER = 32,
}

export type TimerListMessage =
  | { type: "timers"; timers: TimerListTimer[] }
  | {
      type: "change";
      event_type:
        | "created"
        | "paused"
        | "unpaused"
        | "time_changed"
        | "finished"
        | "cancelled"
        | "removed";
      timer: TimerListTimer;
      delta?: number;
    };

export const applyTimerListMessage = (
  timers: TimerListTimer[],
  message: TimerListMessage
): TimerListTimer[] => {
  if (message.type === "timers") {
    return message.timers;
  }
  const { timer } = message;
  if (message.event_type === "removed") {
    return timers.filter((item) => item.timer_id !== timer.timer_id);
  }
  return timers.some((item) => item.timer_id === timer.timer_id)
    ? timers.map((item) => (item.timer_id === timer.timer_id ? timer : item))
    : [...timers, timer];
};

export const subscribeTimerListTimers = (
  connection: Connection,
  entity_id: string,
  callback: (timers: TimerListTimer[]) => void
) => {
  let timers: TimerListTimer[] = [];
  return connection.subscribeMessage<TimerListMessage>(
    (message) => {
      timers = applyTimerListMessage(timers, message);
      callback(timers);
    },
    { type: "timer_list/item/subscribe", entity_id }
  );
};

// Seconds left, from the browser clock for an active timer.
export const timerListTimerRemaining = (
  timer: TimerListTimer,
  now = Date.now()
): number => {
  if (timer.status === "active" && timer.finishes_at) {
    return Math.max(0, (new Date(timer.finishes_at).getTime() - now) / 1000);
  }
  if (timer.status === "paused") {
    return timer.paused_remaining ?? 0;
  }
  return 0;
};

// "9:53" or "1:02:05", without a leading zero on the first unit, as the timer
// entity shows its countdown. Minutes always show, so a short time reads "0:35".
export const formatTimerListRemaining = (remaining: number): string => {
  const total = Math.ceil(remaining);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
};

const FINISHED_VISIBLE_MS = 5 * 60 * 1000;

// Active and paused timers, and timers that finished in the last 5 minutes.
// The backend keeps ended timers much longer than is useful to show.
export const timerListTimerVisible = (
  timer: TimerListTimer,
  now = Date.now()
): boolean =>
  timer.status === "active" ||
  timer.status === "paused" ||
  (timer.status === "finished" &&
    timer.ended_at !== null &&
    now - new Date(timer.ended_at).getTime() < FINISHED_VISIBLE_MS);

export const createTimerListTimer = (
  callService: HomeAssistant["callService"],
  entity_id: string,
  duration: HaDurationData,
  name?: string
): Promise<ServiceCallResponse> =>
  callService(
    "timer_list",
    "create_timer",
    { duration, name: name || undefined },
    { entity_id }
  );

export const addTimerListTimerTime = (
  callService: HomeAssistant["callService"],
  entity_id: string,
  timer_id: string,
  duration: HaDurationData
): Promise<ServiceCallResponse> =>
  callService("timer_list", "add_time", { timer_id, duration }, { entity_id });

export const callTimerListTimerAction = (
  callService: HomeAssistant["callService"],
  entity_id: string,
  action: "pause_timer" | "unpause_timer" | "cancel_timer" | "remove_timer",
  timer_id: string
): Promise<ServiceCallResponse> =>
  callService("timer_list", action, { timer_id }, { entity_id });

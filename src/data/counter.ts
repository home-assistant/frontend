import { HomeAssistant } from "../types";

export interface Counter {
  id: string;
  name: string;
  icon?: string;
  initial?: number;
  restore?: boolean;
  minimum?: number;
  maximum?: number;
  step?: number;
}

export interface CounterMutableParams {
  name: string;
  icon: string;
  initial: number;
  restore: boolean;
  minimum: number;
  maximum: number;
  step: number;
}

export const fetchCounter = (hass: HomeAssistant) =>
  hass.callWS<Counter[]>({ type: "counter/list" });

export const createCounter = (
  hass: HomeAssistant,
  values: CounterMutableParams
) =>
  hass.callWS<Counter>({
    type: "counter/create",
    ...values,
  });

export const updateCounter = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<CounterMutableParams>
) =>
  hass.callWS<Counter>({
    type: "counter/update",
    counter_id: id,
    ...updates,
  });

export const deleteCounter = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "counter/delete",
    counter_id: id,
  });

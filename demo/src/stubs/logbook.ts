import type { LogbookStreamMessage } from "../../../src/data/logbook";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

/**
 * Answers logbook subscriptions with an empty logbook. No entries come from
 * an automation or script trace.
 */
export const mockLogbook = (hass: MockHomeAssistant) => {
  hass.mockWS("logbook/event_stream", (_msg, _currentHass, onChange) => {
    onChange?.({ events: [] } satisfies LogbookStreamMessage);

    return () => undefined;
  });
  hass.mockWS("trace/contexts", () => ({}));
};

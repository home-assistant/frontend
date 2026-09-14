import type { HomeAssistant } from "../types";

/**
 * The entity we last told the external app about, so that a repeated report — the more info
 * dialog re-rendering, or closing twice as `_open` and `_entityId` both clear — does not turn
 * into a message. The app treats every report as the new truth, so only changes are worth sending.
 */
let lastReportedEntityId: string | null = null;

/**
 * Tells the external app which entity the frontend is showing front and centre, so the platform's
 * voice assistant can resolve "this one" against it. `null` means the frontend stopped showing a
 * single entity, which leaves the app to fall back to the page itself.
 *
 * Apps that predate `onscreen_context/set` do not report `hasOnscreenContext`, and are left alone.
 */
export const setExternalOnscreenEntity = (
  hass: HomeAssistant | undefined,
  entityId: string | null
): void => {
  const external = hass?.auth.external;
  if (!external?.config.hasOnscreenContext) {
    return;
  }
  if (lastReportedEntityId === entityId) {
    return;
  }
  lastReportedEntityId = entityId;
  external.fireMessage({
    type: "onscreen_context/set",
    payload: { entity_id: entityId },
  });
};

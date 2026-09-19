import { computeDomain } from "../../common/entity/compute_domain";
import type { NativeModalSize } from "../../external_app/external_messaging";

/**
 * Domains whose more-info fits half a screen to begin with: a state row with
 * history and activity underneath, or a single small control. Everything else,
 * including a domain we do not know, gets the whole screen, because a light's
 * slider, a climate dial, a media player and a camera stream all need it.
 */
const COMPACT_DOMAINS = new Set<string>([
  "ai_task",
  "air_quality",
  "alert",
  "assist_satellite",
  "automation",
  "binary_sensor",
  "button",
  "calendar",
  "configurator",
  "counter",
  "date",
  "datetime",
  "device_tracker",
  "event",
  "geo_location",
  "image_processing",
  "infrared",
  "input_button",
  "input_datetime",
  "input_number",
  "input_select",
  "input_text",
  "notify",
  "number",
  "person",
  "plant",
  "radio_frequency",
  "scene",
  "schedule",
  "select",
  "sensor",
  "stt",
  "sun",
  "tag",
  "text",
  "time",
  "tts",
  "wake_word",
  "zone",
]);

/**
 * How much room an entity's more-info asks for when an app shows it in a modal
 * of its own. The app decides what that means on its platform; on iOS it picks
 * the sheet's detents.
 */
export const computeMoreInfoModalSize = (entityId: string): NativeModalSize =>
  COMPACT_DOMAINS.has(computeDomain(entityId)) ? "compact" : "full";

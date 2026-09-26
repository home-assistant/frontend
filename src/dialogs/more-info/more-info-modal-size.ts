import { computeDomain } from "../../common/entity/compute_domain";
import type { NativeModalSize } from "../../external_app/external_messaging";

/**
 * Domains whose more-info fits half a screen: a state row with history under it,
 * or one small control. Everything else, a domain we do not know included, gets
 * the whole screen.
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

/** How much room an entity's more-info asks for in a native modal. */
export const computeMoreInfoModalSize = (entityId: string): NativeModalSize =>
  COMPACT_DOMAINS.has(computeDomain(entityId)) ? "compact" : "full";

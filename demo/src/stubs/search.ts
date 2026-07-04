import type { RelatedResult } from "../../../src/data/search";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockSearch = (hass: MockHomeAssistant) => {
  // The demo has no relationship graph, so report no related items.
  hass.mockWS("search/related", (): RelatedResult => ({}));
};

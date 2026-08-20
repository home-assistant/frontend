import { slugify } from "../../../src/common/string/slugify";
import type { fetchSlug } from "../../../src/data/ws-slugify";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockSlugify = (hass: MockHomeAssistant) => {
  hass.mockWS<typeof fetchSlug>("slugify", (msg: { text: string }) => ({
    slug: slugify(msg.text),
  }));
};

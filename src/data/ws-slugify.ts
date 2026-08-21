import type { HomeAssistantApi } from "../types";

export const fetchSlug = (
  api: HomeAssistantApi,
  text: string
): Promise<{ slug: string }> =>
  api.callWS<{ slug: string }>({
    type: "slugify",
    text,
  });

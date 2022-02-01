import { HomeAssistant } from "../types";
import { MediaPlayerItem } from "./media-player";

export interface ResolvedMediaSource {
  url: string;
  mime_type: string;
}

export const resolveMediaSource = (
  hass: HomeAssistant,
  media_content_id: string
) =>
  hass.callWS<ResolvedMediaSource>({
    type: "media_source/resolve_media",
    media_content_id,
  });

export const browseLocalMediaPlayer = (
  hass: HomeAssistant,
  mediaContentId?: string
): Promise<MediaPlayerItem> =>
  hass.callWS<MediaPlayerItem>({
    type: "media_source/browse_media",
    media_content_id: mediaContentId,
  });

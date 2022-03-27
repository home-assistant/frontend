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

export const isLocalMediaSourceContentId = (mediaId: string) =>
  mediaId.startsWith("media-source://media_source");

export const uploadLocalMedia = async (
  hass: HomeAssistant,
  media_content_id: string,
  file: File
) => {
  const fd = new FormData();
  fd.append("media_content_id", media_content_id);
  fd.append("file", file);
  const resp = await hass.fetchWithAuth(
    "/api/media_source/local_source/upload",
    {
      method: "POST",
      body: fd,
    }
  );
  if (resp.status === 413) {
    throw new Error(`Uploaded file is too large (${file.name})`);
  } else if (resp.status !== 200) {
    throw new Error("Unknown error");
  }
  return resp.json();
};

export const removeLocalMedia = async (
  hass: HomeAssistant,
  media_content_id: string
) =>
  hass.callWS({
    type: "media_source/local_source/remove",
    media_content_id,
  });

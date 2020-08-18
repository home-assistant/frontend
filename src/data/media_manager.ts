import { HomeAssistant } from "../types";

interface Media {
  filesize: number;
  name: string;
  uploaded_at: string; // isoformat date
  content_type: string;
  id: string;
}

export interface MediaMutableParams {
  name: string;
}

export const generateMediaThumbnailUrl = (mediaId: string, size: number) =>
  `/api/media_manager/serve/${mediaId}/${size}x${size}`;

export const fetchMedia = (hass: HomeAssistant) =>
  hass.callWS<Media[]>({ type: "media_manager/list" });

export const createMedia = async (
  hass: HomeAssistant,
  file: File
): Promise<Media> => {
  const fd = new FormData();
  fd.append("file", file);
  const resp = await hass.fetchWithAuth("/api/media_manager/upload", {
    method: "POST",
    body: fd,
  });
  return await resp.json();
};

export const updateMedia = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<MediaMutableParams>
) =>
  hass.callWS<Media>({
    type: "media_manager/update",
    media_id: id,
    ...updates,
  });

export const deleteMedia = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "media_manager/delete",
    media_id: id,
  });

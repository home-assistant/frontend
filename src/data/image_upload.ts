import { HomeAssistant } from "../types";

interface Image {
  filesize: number;
  name: string;
  uploaded_at: string; // isoformat date
  content_type: string;
  id: string;
}

export interface ImageMutableParams {
  name: string;
}

export const generateImageThumbnailUrl = (mediaId: string, size: number) =>
  `/api/image/serve/${mediaId}/${size}x${size}`;

export const fetchImages = (hass: HomeAssistant) =>
  hass.callWS<Image[]>({ type: "image/list" });

export const createImage = async (
  hass: HomeAssistant,
  file: File
): Promise<Image> => {
  const fd = new FormData();
  fd.append("file", file);
  const resp = await hass.fetchWithAuth("/api/image/upload", {
    method: "POST",
    body: fd,
  });
  if (resp.status === 413) {
    throw new Error(`Uploaded image is too large (${file.name})`);
  } else if (resp.status !== 200) {
    throw new Error("Unknown error");
  }
  return resp.json();
};

export const updateImage = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<ImageMutableParams>
) =>
  hass.callWS<Image>({
    type: "image/update",
    media_id: id,
    ...updates,
  });

export const deleteImage = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "image/delete",
    media_id: id,
  });

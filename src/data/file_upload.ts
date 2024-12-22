import { HomeAssistant } from "../types";

export const uploadFile = async (hass: HomeAssistant, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  const resp = await hass.fetchWithAuth("/api/file_upload", {
    method: "POST",
    body: fd,
  });
  if (resp.status === 413) {
    throw new Error(`Uploaded file is too large (${file.name})`);
  } else if (resp.status !== 200) {
    throw new Error("Unknown error");
  }
  const data = await resp.json();
  return data.file_id;
};

export const removeFile = async (hass: HomeAssistant, file_id: string) =>
  hass.callApi("DELETE", "file_upload", {
    file_id,
  });

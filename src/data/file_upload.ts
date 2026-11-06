import type { LocalizeFunc } from "../common/translations/localize";
import type { HomeAssistant } from "../types";

export const uploadFile = async (
  fetchWithAuth: HomeAssistant["fetchWithAuth"],
  localize: LocalizeFunc,
  file: File
) => {
  const fd = new FormData();
  fd.append("file", file);
  const resp = await fetchWithAuth("/api/file_upload", {
    method: "POST",
    body: fd,
  });
  if (resp.status === 413) {
    throw new Error(
      localize("ui.common.upload_file_too_large", {
        name: file.name,
      })
    );
  } else if (resp.status !== 200) {
    throw new Error(localize("ui.common.unknown_error"));
  }
  const data = await resp.json();
  return data.file_id;
};

export const removeFile = async (
  callApi: HomeAssistant["callApi"],
  file_id: string
) =>
  callApi("DELETE", "file_upload", {
    file_id,
  });

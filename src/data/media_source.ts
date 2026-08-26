import { timeCacheEntityPromiseFunc } from "../common/util/time-cache-entity-promise-func";
import type { HomeAssistant } from "../types";
import type { MediaPlayerItem, SearchMediaResult } from "./media-player";

export interface ResolvedMediaSource {
  url: string;
  mime_type: string;
}

export const resolveMediaSource = (
  hass: Pick<HomeAssistant, "callWS">,
  media_content_id: string
) =>
  hass.callWS<ResolvedMediaSource>({
    type: "media_source/resolve_media",
    media_content_id,
  });

// Resolved URLs are signed and valid for 24 hours (CONTENT_AUTH_EXPIRY_TIME in
// core). Resolving again returns a different signature, which would defeat the
// browser cache, so reuse the resolved URL for just under its validity.
export const RESOLVE_CACHE_TIME = 23 * 60 * 60 * 1000; // 23 hours

export const resolveMediaSourceWithCache = (
  hass: Pick<HomeAssistant, "callWS" | "hassUrl">,
  media_content_id: string
): Promise<ResolvedMediaSource> =>
  timeCacheEntityPromiseFunc(
    "_resolvedMediaSource",
    RESOLVE_CACHE_TIME,
    resolveMediaSource,
    hass,
    media_content_id
  );

export const browseLocalMediaPlayer = (
  hass: HomeAssistant,
  mediaContentId?: string
): Promise<MediaPlayerItem> =>
  hass.callWS<MediaPlayerItem>({
    type: "media_source/browse_media",
    media_content_id: mediaContentId,
  });

export const searchMedia = (
  hass: HomeAssistant,
  mediaContentId: string | undefined,
  searchQuery: string,
  mediaFilterClasses?: string[]
): Promise<SearchMediaResult> =>
  hass.callWS<SearchMediaResult>({
    type: "media_source/search_media",
    media_content_id: mediaContentId,
    search_query: searchQuery,
    media_filter_classes: mediaFilterClasses,
  });

export const MANUAL_MEDIA_SOURCE_PREFIX = "__MANUAL_ENTRY__";

export const isManualMediaSourceContentId = (mediaContentId: string) =>
  mediaContentId.startsWith(MANUAL_MEDIA_SOURCE_PREFIX);

export const isMediaSourceContentId = (mediaId: string) =>
  mediaId.startsWith("media-source://");

export const isLocalMediaSourceContentId = (mediaId: string) =>
  mediaId.startsWith("media-source://media_source");

export const isImageUploadMediaSourceContentId = (mediaId: string) =>
  mediaId.startsWith("media-source://image_upload");

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
    throw new Error(
      hass.localize("ui.common.upload_file_too_large", {
        name: file.name,
      })
    );
  } else if (resp.status !== 200) {
    throw new Error(hass.localize("ui.common.unknown_error"));
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

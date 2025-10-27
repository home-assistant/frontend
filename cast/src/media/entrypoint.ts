import { framework } from "../receiver/cast_framework";

const castContext = framework.CastReceiverContext.getInstance();

const playerManager = castContext.getPlayerManager();

playerManager.setMessageInterceptor(
  "LOAD" as framework.messages.MessageType.LOAD,
  (loadRequestData) => {
    const media = loadRequestData.media;
    // Special handling if it came from Google Assistant
    if (media.entity) {
      media.contentId = media.entity;
      media.streamType = "LIVE" as framework.messages.StreamType.LIVE;
      media.contentType = "application/vnd.apple.mpegurl";
      // @ts-ignore
      media.hlsVideoSegmentFormat =
        "fmp4" as framework.messages.HlsVideoSegmentFormat.FMP4;
    }
    return loadRequestData;
  }
);

castContext.start();

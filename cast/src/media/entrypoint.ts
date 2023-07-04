import { framework } from "../receiver/cast_framework";

const castContext = framework.CastReceiverContext.getInstance();

const playerManager = castContext.getPlayerManager();

playerManager.setMessageInterceptor(
  framework.messages.MessageType.LOAD,
  (loadRequestData) => {
    const media = loadRequestData.media;
    // Special handling if it came from Google Assistant
    if (media.entity) {
      media.contentId = media.entity;
      media.streamType = framework.messages.StreamType.LIVE;
      media.contentType = "application/vnd.apple.mpegurl";
      // @ts-ignore
      media.hlsVideoSegmentFormat =
        framework.messages.HlsVideoSegmentFormat.FMP4;
    }
    return loadRequestData;
  }
);

castContext.start();

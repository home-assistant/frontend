import { CastReceiverContext } from "chromecast-caf-receiver/cast.framework";

const castContext =
  cast.framework.CastContext.getInstance() as unknown as CastReceiverContext;

const playerManager = castContext.getPlayerManager();

playerManager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  (loadRequestData) => {
    const media = loadRequestData.media;
    // Special handling if it came from Google Assistant
    if (media.entity) {
      media.contentId = media.entity;
      media.streamType = cast.framework.messages.StreamType.LIVE;
      media.contentType = "application/vnd.apple.mpegurl";
      // @ts-ignore
      media.hlsVideoSegmentFormat =
        cast.framework.messages.HlsVideoSegmentFormat.FMP4;
    }
    return loadRequestData;
  }
);

castContext.start();

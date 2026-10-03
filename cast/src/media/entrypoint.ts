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
      // type definition is wrong, should be "FMP4" instead of "fmp4"
      // https://developers.google.com/cast/docs/reference/web_receiver/cast.framework.messages#.HlsVideoSegmentFormat
      media.hlsVideoSegmentFormat =
        "FMP4" as framework.messages.HlsVideoSegmentFormat.FMP4;
    }
    return loadRequestData;
  }
);

castContext.start();

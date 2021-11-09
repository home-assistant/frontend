/* eslint-disable no-undef */
import { CAST_NS } from "../../../src/cast/const";
import { HassMessage } from "../../../src/cast/receiver_messages";
import "../../../src/resources/custom-card-support";
import { castContext } from "./cast_context";
import { HcMain } from "./layout/hc-main";
import { ReceivedMessage } from "./types";

const lovelaceController = new HcMain();
document.body.append(lovelaceController);
lovelaceController.addEventListener("cast-view-changed", (ev) => {
  playDummyMedia(ev.detail.title);
});

const mediaPlayer = document.createElement("cast-media-player");
mediaPlayer.style.display = "none";
document.body.append(mediaPlayer);
const playerStylesAdded = false;

let controls: HTMLElement | null;

const setTouchControlsVisibility = (visible: boolean) => {
  if (!castContext.getDeviceCapabilities().touch_input_supported) {
    return;
  }
  controls =
    controls ||
    (document.body.querySelector("touch-controls") as HTMLElement | null);
  if (controls) {
    controls.style.display = visible ? "initial" : "none";
  }
};

let timeOut: number | undefined;

const playDummyMedia = (viewTitle?: string) => {
  const loadRequestData = new cast.framework.messages.LoadRequestData();
  loadRequestData.autoplay = true;
  loadRequestData.media = new cast.framework.messages.MediaInformation();
  loadRequestData.media.contentId =
    "https://cast.home-assistant.io/images/google-nest-hub.png";
  loadRequestData.media.contentType = "image/jpeg";
  loadRequestData.media.streamType = cast.framework.messages.StreamType.NONE;
  const metadata = new cast.framework.messages.GenericMediaMetadata();
  metadata.title = viewTitle;
  loadRequestData.media.metadata = metadata;

  loadRequestData.requestId = 0;
  playerManager.load(loadRequestData);
  if (timeOut) {
    clearTimeout(timeOut);
    timeOut = undefined;
  }
  if (castContext.getDeviceCapabilities().touch_input_supported) {
    timeOut = window.setTimeout(() => playDummyMedia(viewTitle), 540000); // repeat every 9 minutes to keep it active (gets deactivated after 10 minutes)
  }
};

const showLovelaceController = () => {
  mediaPlayer.style.display = "none";
  lovelaceController.style.display = "initial";
  document.body.setAttribute("style", "overflow-y: auto !important");
  setTouchControlsVisibility(false);
};

const showMediaPlayer = () => {
  lovelaceController.style.display = "none";
  mediaPlayer.style.display = "initial";
  document.body.removeAttribute("style");
  setTouchControlsVisibility(true);
  if (!playerStylesAdded) {
    const style = document.createElement("style");
    style.innerHTML = `
    body {
      --logo-image: url('https://www.home-assistant.io/images/home-assistant-logo.svg');
      --logo-repeat: no-repeat;
      --playback-logo-image: url('https://www.home-assistant.io/images/home-assistant-logo.svg');
      --theme-hue: 200;
      --progress-color: #03a9f4;
      --splash-image: url('https://home-assistant.io/images/cast/splash.png');
      --splash-size: cover;
      --background-color: #41bdf5;
    }
    `;
    document.head.appendChild(style);
  }
};

const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;
options.customNamespaces = {
  [CAST_NS]: cast.framework.system.MessageType.JSON,
};

castContext.addCustomMessageListener(
  CAST_NS,
  // @ts-ignore
  (ev: ReceivedMessage<HassMessage>) => {
    // We received a show Lovelace command, stop media from playing, hide media player and show Lovelace controller
    if (
      playerManager.getPlayerState() !==
      cast.framework.messages.PlayerState.IDLE
    ) {
      playerManager.stop();
    } else {
      showLovelaceController();
    }
    const msg = ev.data;
    msg.senderId = ev.senderId;
    lovelaceController.processIncomingMessage(msg);
  }
);

const playerManager = castContext.getPlayerManager();

playerManager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  (loadRequestData) => {
    if (
      loadRequestData.media.contentId ===
      "https://cast.home-assistant.io/images/google-nest-hub.png"
    ) {
      return loadRequestData;
    }
    // We received a play media command, hide Lovelace and show media player
    showMediaPlayer();
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

playerManager.addEventListener(
  cast.framework.events.EventType.MEDIA_STATUS,
  (event) => {
    if (
      event.mediaStatus?.playerState ===
        cast.framework.messages.PlayerState.IDLE &&
      event.mediaStatus?.idleReason &&
      event.mediaStatus?.idleReason !==
        cast.framework.messages.IdleReason.INTERRUPTED
    ) {
      // media finished or stopped, return to default Lovelace
      showLovelaceController();
    }
  }
);

castContext.start(options);

/* eslint-disable no-undef */
import { CAST_NS } from "../../../src/cast/const";
import { HassMessage } from "../../../src/cast/receiver_messages";
import "../../../src/resources/custom-card-support";
import { castContext } from "./cast_context";
import { HcMain } from "./layout/hc-main";
import { ReceivedMessage } from "./types";

const lovelaceController = new HcMain();
document.body.append(lovelaceController);

const removeTouchControls = () => {
  if (!castContext.getDeviceCapabilities().touch_input_supported) {
    return;
  }
  const controls = document.body.querySelector(
    "touch-controls"
  ) as HTMLElement | null;
  if (controls) {
    controls.remove();
  }
  document.body.setAttribute("style", "overflow-y: auto !important");
};

const playMedia = () => {
  const playerManager = castContext.getPlayerManager();
  const loadRequestData = new cast.framework.messages.LoadRequestData();
  loadRequestData.autoplay = true;
  loadRequestData.media = new cast.framework.messages.MediaInformation();
  loadRequestData.media.contentId =
    "https://www.home-assistant.io/images/blog/2018-09-thinking-big/social.png";
  loadRequestData.media.contentType = "image/jpeg";
  loadRequestData.media.streamType = cast.framework.messages.StreamType.NONE;
  const metadata = new cast.framework.messages.GenericMediaMetadata();
  metadata.title = "Home Assistant Lovelace";
  loadRequestData.media.metadata = metadata;

  loadRequestData.requestId = 0;
  playerManager.load(loadRequestData);
};

const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;
// @ts-ignore
options.skipPlayersLoad = true;
options.customNamespaces = {
  [CAST_NS]: cast.framework.system.MessageType.JSON,
};

castContext.addCustomMessageListener(
  CAST_NS,
  // @ts-ignore
  (ev: ReceivedMessage<HassMessage>) => {
    // Remove touch controls, so touch can be used
    removeTouchControls();
    const msg = ev.data;
    msg.senderId = ev.senderId;
    lovelaceController.processIncomingMessage(msg);
    // Play media so the media state will not be idle, to prevent the app from getting closed
    playMedia();
  }
);

castContext.start(options);

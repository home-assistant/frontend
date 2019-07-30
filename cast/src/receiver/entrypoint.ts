import "../../../src/resources/custom-card-support";
import { castContext } from "./cast_context";
import { ReceivedMessage } from "./types";
import { HassMessage } from "../../../src/cast/receiver_messages";
import { HcMain } from "./layout/hc-main";
import { CAST_NS } from "../../../src/cast/const";

const controller = new HcMain();
document.body.append(controller);

const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;
options.customNamespaces = {
  // @ts-ignore
  [CAST_NS]: cast.framework.system.MessageType.JSON,
};

// The docs say we need to set options.touchScreenOptimizeApp = true
// https://developers.google.com/cast/docs/caf_receiver/customize_ui#accessing_ui_controls
// This doesn't work.
// @ts-ignore
options.touchScreenOptimizedApp = true;

// The class reference say we can set a uiConfig in options to set it
// https://developers.google.com/cast/docs/reference/caf_receiver/cast.framework.CastReceiverOptions#uiConfig
// This doesn't work either.
// @ts-ignore
options.uiConfig = new cast.framework.ui.UiConfig();
// @ts-ignore
options.uiConfig.touchScreenOptimizedApp = true;

castContext.addCustomMessageListener(
  CAST_NS,
  // @ts-ignore
  (ev: ReceivedMessage<HassMessage>) => {
    const msg = ev.data;
    msg.senderId = ev.senderId;
    controller.processIncomingMessage(msg);
  }
);

castContext.start(options);

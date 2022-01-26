import {
  setPassiveTouchGestures,
  setCancelSyntheticClickEvents,
} from "@polymer/polymer/lib/utils/settings";
import "../layouts/home-assistant";
import "../resources/ha-style";
import "../resources/roboto";
import "../util/legacy-support";

setPassiveTouchGestures(true);
setCancelSyntheticClickEvents(false);

(window as any).frontendVersion = __VERSION__;

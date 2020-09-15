import { setPassiveTouchGestures } from "@polymer/polymer/lib/utils/settings";
import "../resources/roboto";
import "../resources/ha-style";
import "../layouts/home-assistant";
import "../util/legacy-support";

setPassiveTouchGestures(true);

(window as any).frontendVersion = __VERSION__;

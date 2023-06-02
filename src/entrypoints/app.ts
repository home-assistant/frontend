import {
  setPassiveTouchGestures,
  setCancelSyntheticClickEvents,
} from "@polymer/polymer/lib/utils/settings";
import "@webcomponents/scoped-custom-element-registry/scoped-custom-element-registry.min";
import "../layouts/home-assistant";
import "../resources/ha-style";
import "../resources/roboto";

setPassiveTouchGestures(true);
setCancelSyntheticClickEvents(false);

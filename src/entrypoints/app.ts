import "@webcomponents/scoped-custom-element-registry/scoped-custom-element-registry.min";
import "../layouts/home-assistant";

import("../resources/ha-style");
import("@polymer/polymer/lib/utils/settings").then(
  ({ setCancelSyntheticClickEvents, setPassiveTouchGestures }) => {
    setCancelSyntheticClickEvents(false);
    setPassiveTouchGestures(true);
  }
);

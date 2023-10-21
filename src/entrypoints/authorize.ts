// Compat needs to be first import
import "../resources/compatibility";
import "../auth/ha-authorize";
import "../resources/safari-14-attachshadow-patch";
import "../resources/array.flat.polyfill";

import("../resources/ha-style");
import("@polymer/polymer/lib/utils/settings").then(
  ({ setCancelSyntheticClickEvents }) => setCancelSyntheticClickEvents(false)
);

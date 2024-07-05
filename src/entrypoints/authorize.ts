// Compat needs to be first import
import "../resources/compatibility";
import "../auth/ha-authorize";

import("../resources/ha-style");
import("@polymer/polymer/lib/utils/settings").then(
  ({ setCancelSyntheticClickEvents }) => setCancelSyntheticClickEvents(false)
);

// Compat needs to be first import
import "../resources/compatibility";
import "../onboarding/ha-onboarding";

import("../resources/ha-style");
import("@polymer/polymer/lib/utils/settings").then(
  ({ setCancelSyntheticClickEvents }) => setCancelSyntheticClickEvents(false)
);

declare global {
  interface Window {
    stepsPromise: Promise<Response>;
  }
}

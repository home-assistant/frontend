import "../onboarding/ha-onboarding";

import("../resources/ha-style");

declare global {
  interface Window {
    stepsPromise: Promise<Response>;
  }
}

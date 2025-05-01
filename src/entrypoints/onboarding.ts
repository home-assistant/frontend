import "../onboarding/ha-onboarding";

import("../resources/append-ha-style");

declare global {
  interface Window {
    stepsPromise: Promise<Response>;
  }
}

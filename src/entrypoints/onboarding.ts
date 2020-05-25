// Compat needs to be first import
import "../resources/compatibility";
import "../onboarding/ha-onboarding";
import "../resources/ha-style";
import "../resources/roboto";

declare global {
  interface Window {
    stepsPromise: Promise<Response>;
  }
}

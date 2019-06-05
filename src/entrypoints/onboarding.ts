import "../components/ha-iconset-svg";
import "../resources/ha-style";
import "../resources/roboto";
import "../onboarding/ha-onboarding";

declare global {
  interface Window {
    stepsPromise: Promise<Response>;
  }
}

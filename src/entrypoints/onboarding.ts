import "../components/ha-iconset-svg";
import "../onboarding/ha-onboarding";
import "../resources/ha-style";
import "../resources/roboto";

declare global {
  interface Window {
    stepsPromise: Promise<Response>;
  }
}

import { LitElement } from "lit";
import { property } from "lit/decorators";
import { afterNextRender } from "../../common/util/render-status";
import type { HomeAssistant } from "../../types";
import { removeLaunchScreen } from "../../util/launch-screen";
import { decideNativeModalDialog } from "./native-modal-dialog-request";

/**
 * Shared behaviour of the frameless pages a companion app shows in a modal:
 * answering the app's commands, clearing the launch screen, and handing on any
 * dialog asked for over the page.
 */
export abstract class NativeModalHostPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  public connectedCallback() {
    super.connectedCallback();
    this.addEventListener("show-dialog", this._dialogAsked);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("show-dialog", this._dialogAsked);
  }

  /**
   * The main frontend is not rendered on these routes, so the app's commands are
   * answered here, and nothing else will clear the launch screen.
   */
  protected attachToApp() {
    if (this.hass.auth.external) {
      import("../../external_app/external_app_entrypoint").then((mod) =>
        mod.attachExternalToApp(this)
      );
    }
    afterNextRender(() => {
      const external = this.hass.auth?.external;
      if (removeLaunchScreen(!!external?.config.hasSplashscreen)) {
        external?.fireMessage({ type: "frontend/loaded" });
      }
    });
  }

  private _dialogAsked = (ev: Event) => {
    const external = this.hass?.auth.external;
    if (!external) {
      return;
    }
    const decision = decideNativeModalDialog(
      (ev as CustomEvent).detail,
      !!external.config.hasNativeModal,
      this.hass.localize
    );
    if (decision.action === "grow") {
      external.fireMessage({ type: "modal/size", payload: { size: "full" } });
      return;
    }
    // Stopped so the dialog manager does not also draw it in this page.
    ev.stopPropagation();
    external.fireMessage({
      type: "modal/open",
      payload: { path: decision.path, title: decision.title, size: "full" },
    });
  };
}

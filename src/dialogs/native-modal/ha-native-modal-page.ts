import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mainWindow } from "../../common/dom/get_main_window";
import { decodeNativeModalDialogUrl } from "../../common/url/native-modal-url";
import { afterNextRender } from "../../common/util/render-status";
import "../../components/ha-alert";
import type { HomeAssistant } from "../../types";
import { removeLaunchScreen } from "../../util/launch-screen";
import { NATIVE_MODAL_DIALOGS } from "./native-modal-dialogs";

/**
 * Frameless page showing the one dialog named in the URL, without the sidebar
 * or any panel around it. A companion app loads it in a modal of its own so a
 * dialog asked for inside another modal stacks over it, the way a native app
 * stacks its screens, instead of being drawn inside the page underneath.
 */
@customElement("ha-native-modal-page")
export class HaNativeModalPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _failed = false;

  private _shown = false;

  protected render() {
    if (this._failed) {
      return html`
        <ha-alert alert-type="error">
          ${this.hass.localize("ui.dialogs.more_info_control.no_entity")}
        </ha-alert>
      `;
    }
    return nothing;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    if (this.hass.auth.external) {
      import("../../external_app/external_app_entrypoint").then((mod) =>
        mod.attachExternalToApp(this)
      );
    }
    this._showDialog();
    // No panel to wait for, so the launch screen goes once the page has painted.
    afterNextRender(() => {
      const external = this.hass.auth?.external;
      if (removeLaunchScreen(!!external?.config.hasSplashscreen)) {
        external?.fireMessage({ type: "frontend/loaded" });
      }
    });
  }

  /**
   * The dialog is created here rather than through the dialog manager: it is the
   * page, not something over it, and it is told to render frameless so the app's
   * own modal is the only surface.
   */
  private async _showDialog() {
    if (this._shown) {
      return;
    }
    const request = decodeNativeModalDialogUrl(mainWindow.location.hash);
    const dialog = request && NATIVE_MODAL_DIALOGS[request.tag];
    if (!request || !dialog) {
      this._failed = true;
      return;
    }
    this._shown = true;
    await dialog.load();
    const element = document.createElement(request.tag) as HTMLElement & {
      hass: HomeAssistant;
      standalone: boolean;
      withoutHeader: boolean;
      showDialog: (params: unknown) => void;
    };
    element.hass = this.hass;
    element.standalone = true;
    element.withoutHeader =
      !!this.hass.auth.external?.config.hasNativeModalHeader;
    this.shadowRoot!.appendChild(element);
    element.showDialog(request.params);
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    const dialog = this.shadowRoot?.lastElementChild as
      (HTMLElement & { hass?: HomeAssistant }) | null;
    if (changedProps.has("hass") && dialog && "hass" in dialog) {
      dialog.hass = this.hass;
    }
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    ha-alert {
      display: block;
      margin: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-native-modal-page": HaNativeModalPage;
  }
}

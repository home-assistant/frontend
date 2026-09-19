import type { PropertyValues } from "lit";
import { css, nothing } from "lit";
import { customElement } from "lit/decorators";
import { mainWindow } from "../../common/dom/get_main_window";
import { decodeNativeModalDialogUrl } from "../../common/url/native-modal-url";
import type { HomeAssistant } from "../../types";
import { NATIVE_MODAL_DIALOGS } from "./native-modal-dialogs";
import { NativeModalHostPage } from "./native-modal-host-page";

/** What a dialog has to accept to be shown as the whole of a native modal. */
interface HostedDialog extends HTMLElement {
  hass: HomeAssistant;
  standalone: boolean;
  withoutHeader: boolean;
  showDialog: (params: unknown) => void;
}

/**
 * Frameless page showing the one dialog named in the URL, without the sidebar
 * or any panel around it. A companion app loads it in a modal of its own so a
 * dialog asked for inside another modal stacks over it, the way a native app
 * stacks its screens, instead of being drawn inside the page underneath.
 */
@customElement("ha-native-modal-page")
export class HaNativeModalPage extends NativeModalHostPage {
  private _shown = false;

  protected render() {
    return nothing;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this.attachToApp();
    this._showDialog();
  }

  /**
   * Created here rather than through the dialog manager: it is the page, not
   * something over it, so it renders frameless and leaves the header to the app.
   */
  private async _showDialog() {
    if (this._shown) {
      return;
    }
    const request = decodeNativeModalDialogUrl(mainWindow.location.hash);
    const dialog = request && NATIVE_MODAL_DIALOGS[request.tag];
    if (!request || !dialog) {
      // Only reachable if something other than the frontend built the URL; there
      // is nothing to show, so the modal goes rather than sitting there empty.
      this.hass.auth.external?.fireMessage({ type: "modal/close" });
      return;
    }
    this._shown = true;
    await dialog.load();
    const element = document.createElement(dialog.tag) as HostedDialog;
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

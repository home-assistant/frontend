import type { PropertyValues } from "lit";
import { css, nothing } from "lit";
import { customElement } from "lit/decorators";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { mainWindow } from "../../common/dom/get_main_window";
import {
  registerNavigationInterceptor,
  unregisterNavigationInterceptor,
} from "../../common/navigate";
import {
  decodeNativeModalDialogUrl,
  isNativeModalPath,
} from "../../common/url/native-modal-url";
import type { HomeAssistant } from "../../types";
import { NATIVE_MODAL_DIALOGS } from "./native-modal-dialogs";
import { NativeModalHostPage } from "./native-modal-host-page";

/** What a dialog has to accept to be shown as the whole of a native modal. */
interface HostedDialog extends HTMLElement {
  hass: HomeAssistant;
  standalone: boolean;
  withoutHeader: boolean;
  showDialog: (params: unknown) => void;
  /** Answers a tap on the app's navigation bar, for a dialog that describes one. */
  performHeaderAction?: (id: string) => void;
}

/**
 * Frameless page showing the one dialog named in the URL, without the sidebar
 * or any panel around it. A companion app loads it in a modal of its own so a
 * dialog asked for inside another modal stacks over it, the way a native app
 * stacks its screens, instead of being drawn inside the page underneath.
 *
 * The URL is the only source of what is on screen: an app reusing a modal it
 * already has navigates this page to the next dialog.
 */
@customElement("ha-native-modal-page")
export class HaNativeModalPage extends NativeModalHostPage {
  /** The fragment the dialog on screen was built from. */
  private _shownFragment?: string;

  private _dialog?: HostedDialog;

  public connectedCallback() {
    super.connectedCallback();
    mainWindow.addEventListener("location-changed", this._urlChanged);
    mainWindow.addEventListener("popstate", this._urlChanged);
    registerNavigationInterceptor(this._relayNavigation);
    this.addEventListener("native-modal-action", this._headerAction);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    mainWindow.removeEventListener("location-changed", this._urlChanged);
    mainWindow.removeEventListener("popstate", this._urlChanged);
    unregisterNavigationInterceptor(this._relayNavigation);
    this.removeEventListener("native-modal-action", this._headerAction);
  }

  protected render() {
    return nothing;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this.attachToApp();
    this._showDialog();
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (changedProps.has("hass") && this._dialog) {
      this._dialog.hass = this.hass;
    }
  }

  private _urlChanged = () => {
    this._showDialog();
  };

  /**
   * The dialog is created here rather than through the dialog manager: it is
   * the page, not something over it, so it renders frameless and leaves the
   * header to the app.
   */
  private async _showDialog() {
    const fragment = mainWindow.location.hash;
    if (fragment === this._shownFragment) {
      return;
    }
    this._shownFragment = fragment;
    const request = decodeNativeModalDialogUrl(fragment);
    const dialog = request && NATIVE_MODAL_DIALOGS[request.tag];
    if (!request || !dialog) {
      // Only reachable if something other than the frontend built the URL; there
      // is nothing to show, so the modal goes rather than sitting there empty.
      this.hass.auth.external?.fireMessage({ type: "modal/close" });
      return;
    }
    await dialog.load();
    if (this._shownFragment !== fragment) {
      // The app asked for another dialog while this one was loading.
      return;
    }
    if (this._dialog?.localName !== dialog.tag) {
      this._dialog?.remove();
      this._dialog = document.createElement(dialog.tag) as HostedDialog;
      this._dialog.hass = this.hass;
      this._dialog.standalone = true;
      this._dialog.withoutHeader =
        !!this.hass.auth.external?.config.hasNativeModal;
      this.shadowRoot!.appendChild(this._dialog);
    }
    this._dialog.showDialog(request.params);
  }

  /**
   * A link out of the dialog (device page, entity editor, related items) is for
   * the app's main frontend; this screen keeps showing its dialog until the app
   * dismisses it. Without an app the page is replaced by the framed frontend.
   */
  private _relayNavigation = (path: string): boolean => {
    const external = this.hass?.auth.external;
    if (
      !external ||
      // The app navigating this page to the next dialog, not a link out of it.
      isNativeModalPath(new URL(path, mainWindow.location.origin).pathname)
    ) {
      return false;
    }
    external.fireMessage({ type: "modal/navigate", payload: { path } });
    return true;
  };

  /** The app's native header was tapped; the dialog answers as if its own button was. */
  private _headerAction = (
    ev: HASSDomEvent<HASSDomEvents["native-modal-action"]>
  ) => {
    this._dialog?.performHeaderAction?.(ev.detail.id);
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-native-modal-page": HaNativeModalPage;
  }

  interface HTMLElementEventMap {
    "native-modal-action": HASSDomEvent<HASSDomEvents["native-modal-action"]>;
  }
}

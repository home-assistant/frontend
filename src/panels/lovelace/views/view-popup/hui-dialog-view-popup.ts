import { mdiClose } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import {
  fetchConfig,
  isStrategyDashboard,
} from "../../../../data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { generateLovelaceDashboardStrategy } from "../../strategies/get-strategy";
import type { Lovelace, LovelaceDialogSize } from "../../types";
import "../hui-view";
import type { HUIView } from "../hui-view";
import type { ViewPopupDialogParams } from "./show-view-popup-dialog";

@customElement("hui-dialog-view-popup")
export class DialogViewPopup
  extends LitElement
  implements HassDialog<ViewPopupDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ViewPopupDialogParams;

  @state() private _viewIndex?: number;

  @state() private _view?: HUIView;

  @state() private _viewSize?: LovelaceDialogSize;

  @state() private _viewConfig?: LovelaceViewConfig;

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("hass") && this._view) {
      this._view.hass = this.hass;
    }
  }

  public showDialog(params: ViewPopupDialogParams): void {
    this._params = params;
    this.fetchConfig();
  }

  public closeDialog() {
    this._params = undefined;
    this._view = undefined;
    this._viewConfig = undefined;
    this._viewSize = undefined;
    this._viewIndex = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  public async fetchConfig() {
    if (!this._params) {
      return;
    }

    const dashboardPath = this._params.dashboard_path ?? null;

    const rawConfig = await fetchConfig(
      this.hass.connection,
      this._params?.dashboard_path ?? null,
      false
    );

    let config: LovelaceConfig;

    if (isStrategyDashboard(rawConfig)) {
      config = await generateLovelaceDashboardStrategy(rawConfig, this.hass);
    } else {
      config = rawConfig;
    }

    const lovelace: Lovelace = {
      config: config,
      rawConfig: rawConfig,
      editMode: false,
      urlPath: dashboardPath,
      enableFullEditMode: () => undefined,
      mode: "storage",
      locale: this.hass.locale,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
      showToast: () => undefined,
    };

    this._viewIndex = config.views.findIndex(
      (v) => v.path === this._params?.view_path
    );

    const view = document.createElement("hui-view");
    view.lovelace = lovelace;
    view.hass = this.hass;
    view.index = this._viewIndex;
    this._view = view;
    this._view.addEventListener(
      "view-updated",
      (ev) => {
        ev.stopPropagation();
        this._viewSize = this._view?.getDialogSize();
      },
      { once: true }
    );
    this._viewConfig = config.views[this._viewIndex!];
    await this.updateComplete;

    this._viewSize = this._view.getDialogSize();
  }

  protected render() {
    if (!this._params || !this._view) {
      return nothing;
    }

    const width = this._viewSize?.width ?? "auto";
    const height = this._viewSize?.height ?? "auto";
    const dialogMinWidth =
      width === "full"
        ? "100vw"
        : typeof width === "number"
          ? `${width}px`
          : undefined;
    const dialogMinHeight =
      height === "full"
        ? "100vh"
        : typeof height === "number"
          ? `${height}px`
          : undefined;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this._viewConfig?.title ?? " "}
        hideActions
        flexContent
        style=${styleMap({
          "--dialog-width": dialogMinWidth,
          "--dialog-height": dialogMinHeight,
        })}
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            @click=${this.closeDialog}
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">${this._viewConfig?.title}</span>
        </ha-dialog-header>
        <div class="content">${this._view}</div>
      </ha-dialog>
    `;
  }

  static get styles() {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
          --mdc-dialog-max-width: 90vw;
          --mdc-dialog-max-height: 90vw;
          --mdc-dialog-min-width: min(var(--dialog-width, none), 90vw);
          --mdc-dialog-min-height: min(var(--dialog-height, none), 90vh);
        }

        .content {
          display: block;
          flex: 1 1 0;
          width: auto;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: calc(
              100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
            );
            --mdc-dialog-max-width: calc(
              100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
            );
            --mdc-dialog-min-height: 100%;
            --mdc-dialog-max-height: 100%;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-view-popup": DialogViewPopup;
  }
}

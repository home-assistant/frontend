import "@home-assistant/webawesome/dist/components/divider/divider";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { listenMediaQuery } from "../../../common/dom/media_query";
import { ADAPTIVE_DIALOG_MEDIA_QUERY } from "../../../components/ha-adaptive-dialog";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-adaptive-popover";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import "../sections/hui-section";

type DesktopPopupMode = "popover" | "dialog";

type MobilePopupMode = "bottom-sheet" | "dialog";

export interface LovelacePopupDialogParams {
  hass: HomeAssistant;
  title?: string;
  desktopMode?: DesktopPopupMode;
  mobileMode?: MobilePopupMode;
  cards: LovelaceCardConfig[];
}

@customElement("dialog-lovelace-popup")
export class DialogLovelacePopup extends DialogMixin<LovelacePopupDialogParams>(
  LitElement
) {
  @property({ attribute: false }) public params?: LovelacePopupDialogParams;

  @state() private _narrow = false;

  private _unsubMediaQuery?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this._unsubMediaQuery = listenMediaQuery(
      ADAPTIVE_DIALOG_MEDIA_QUERY,
      (matches) => {
        this._narrow = matches;
      }
    );
  }

  disconnectedCallback() {
    this._unsubMediaQuery?.();
    this._unsubMediaQuery = undefined;
    super.disconnectedCallback();
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }

    const mode = this._narrow
      ? (this.params.mobileMode ?? "bottom-sheet")
      : (this.params.desktopMode ?? "popover");

    return html`
      <ha-adaptive-popover
        .dialogAnchor=${mode === "popover" ? this.dialogAnchor : undefined}
        .mode=${mode === "bottom-sheet" ? "bottom-sheet" : "dialog"}
        .headerTitle=${this.params.title}
        ?withoutHeader=${!this.params.title}
        open
        width="large"
      >
        ${this.params.title ? html`<wa-divider></wa-divider>` : nothing}
        <hui-section
          .hass=${this.params.hass}
          .config=${{ cards: this.params.cards }}
          .index=${0}
          .viewIndex=${0}
          import-only
        ></hui-section>
      </ha-adaptive-popover>
    `;
  }

  static styles = css`
    ha-adaptive-popover {
      --dialog-content-padding: var(--ha-space-4);
    }

    hui-section {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-lovelace-popup": DialogLovelacePopup;
  }
}

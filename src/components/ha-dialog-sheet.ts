import { mdiClose } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HomeAssistant } from "../types";
import "./ha-bottom-sheet";
import "./ha-dialog-header";
import "./ha-icon-button";
import "./ha-wa-dialog";
import type { DialogWidth } from "./ha-wa-dialog";

type DialogMode = "dialog" | "bottom-sheet";

@customElement("ha-dialog-sheet")
export class HaDialogSheet extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "aria-labelledby" })
  public ariaLabelledBy?: string;

  @property({ attribute: "aria-describedby" })
  public ariaDescribedBy?: string;

  @property({ type: Boolean, reflect: true })
  public open = false;

  @property({ type: String, reflect: true, attribute: "width" })
  public width: DialogWidth = "medium";

  @property({ attribute: "header-title" })
  public headerTitle?: string;

  @property({ attribute: "header-subtitle" })
  public headerSubtitle?: string;

  @property({ type: String, attribute: "header-subtitle-position" })
  public headerSubtitlePosition: "above" | "below" = "below";

  @property({ type: Boolean, reflect: true, attribute: "flexcontent" })
  public flexContent = false;

  @state() private _mode: DialogMode = "dialog";

  @query(".body") public bodyContainer!: HTMLDivElement;

  @state()
  private _bodyScrolled = false;

  connectedCallback() {
    super.connectedCallback();
    this._updateMode();
    window.addEventListener("resize", this._updateMode);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._updateMode);
  }

  private _updateMode = () => {
    this._mode =
      window.matchMedia("(max-width: 870px)").matches ||
      window.matchMedia("(max-height: 500px)").matches
        ? "bottom-sheet"
        : "dialog";
  };

  render() {
    if (this._mode === "bottom-sheet") {
      return html`
        <ha-bottom-sheet .open=${this.open} ?flexcontent=${this.flexContent}>
          <ha-dialog-header
            slot="header"
            .subtitlePosition=${this.headerSubtitlePosition}
            .showBorder=${this._bodyScrolled}
          >
            <slot name="headerNavigationIcon" slot="navigationIcon">
              <ha-icon-button
                data-drawer="close"
                .label=${this.hass?.localize("ui.common.close") ?? "Close"}
                .path=${mdiClose}
              ></ha-icon-button>
            </slot>
            ${this.headerTitle !== undefined
              ? html`<span slot="title" class="title" id="ha-wa-dialog-title">
                  ${this.headerTitle}
                </span>`
              : html`<slot name="headerTitle" slot="title"></slot>`}
            ${this.headerSubtitle !== undefined
              ? html`<span slot="subtitle">${this.headerSubtitle}</span>`
              : html`<slot name="headerSubtitle" slot="subtitle"></slot>`}
            <slot name="headerActionItems" slot="actionItems"></slot>
          </ha-dialog-header>
          <slot></slot>
        </ha-bottom-sheet>
      `;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this.open}
        .width=${this.width}
        .ariaLabelledBy=${this.ariaLabelledBy}
        .ariaDescribedBy=${this.ariaDescribedBy}
        .headerTitle=${this.headerTitle}
        .headerSubtitle=${this.headerSubtitle}
        .headerSubtitlePosition=${this.headerSubtitlePosition}
        ?flexcontent=${this.flexContent}
      >
        <slot></slot>
      </ha-wa-dialog>
    `;
  }

  static styles = css`
    ha-bottom-sheet {
      --ha-bottom-sheet-surface-background: var(
        --ha-dialog-surface-background,
        var(--card-background-color, var(--ha-color-surface-default))
      );
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-sheet": HaDialogSheet;
  }
}

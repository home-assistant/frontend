import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-markdown";
import { haStyleDialog } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { hassioStyle } from "../../resources/hassio-style";
import { HassioMarkdownDialogParams } from "./show-dialog-hassio-markdown";

@customElement("dialog-hassio-markdown")
class HassioMarkdownDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public title!: string;

  @property() public content!: string;

  @state() private _opened = false;

  public showDialog(params: HassioMarkdownDialogParams) {
    this.title = params.title;
    this.content = params.content;
    this._opened = true;
  }

  public closeDialog() {
    this._opened = false;
  }

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, this.title)}
      >
        <ha-markdown .content=${this.content || ""}></ha-markdown>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      hassioStyle,
      css`
        ha-paper-dialog {
          min-width: 350px;
          font-size: 14px;
          border-radius: 2px;
        }
        app-toolbar {
          margin: 0;
          padding: 0 16px;
          color: var(--primary-text-color);
          background-color: var(--secondary-background-color);
        }
        app-toolbar [main-title] {
          margin-left: 16px;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-paper-dialog {
            max-height: 100%;
          }
          ha-paper-dialog::before {
            content: "";
            position: fixed;
            z-index: -1;
            top: 0px;
            left: 0px;
            right: 0px;
            bottom: 0px;
            background-color: inherit;
          }
          app-toolbar {
            color: var(--text-primary-color);
            background-color: var(--primary-color);
          }
          ha-markdown {
            padding: 16px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-markdown": HassioMarkdownDialog;
  }
}

import type { HomeAssistant } from "../../../../src/types";
import type { HassioMarkdownDialogParams } from "./show-dialog-hassio-markdown";
import type { CSSResultGroup } from "lit";

import "../../../../src/components/ha-markdown";

import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";

import { createCloseHeading } from "../../../../src/components/ha-dialog";
import { haStyleDialog } from "../../../../src/resources/styles";
import { hassioStyle } from "../../resources/hassio-style";

@customElement("dialog-hassio-markdown")
class HassioMarkdownDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
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

  protected render() {
    if (!this._opened) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, this.title)}
      >
        <ha-markdown
          .content=${this.content || ""}
          dialogInitialFocus
        ></ha-markdown>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      hassioStyle,
      css`
        @media all and (max-width: 450px), all and (max-height: 500px) {
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

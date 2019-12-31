import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-icon-button/paper-icon-button";
import { PaperDialogElement } from "@polymer/paper-dialog";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  query,
} from "lit-element";

import { hassioStyle } from "../../resources/hassio-style";
import { haStyleDialog } from "../../../../src/resources/styles";
import { HassioMarkdownDialogParams } from "./show-dialog-hassio-markdown";

import "../../../../src/components/dialog/ha-paper-dialog";
import "../../../../src/components/ha-markdown";

@customElement("dialog-hassio-markdown")
class HassioMarkdownDialog extends LitElement {
  @property() public title!: string;
  @property() public content!: string;
  @query("#dialog") private _dialog!: PaperDialogElement;

  public showDialog(params: HassioMarkdownDialogParams) {
    this.title = params.title;
    this.content = params.content;
    this._dialog.open();
  }

  protected render(): TemplateResult | void {
    return html`
      <ha-paper-dialog id="dialog" with-backdrop="">
        <app-toolbar>
          <paper-icon-button
            icon="hassio:close"
            dialog-dismiss=""
          ></paper-icon-button>
          <div main-title="">${this.title}</div>
        </app-toolbar>
        <paper-dialog-scrollable>
          <ha-markdown .content=${this.content || ""}></ha-markdown>
        </paper-dialog-scrollable>
      </ha-paper-dialog>
    `;
  }

  static get styles(): CSSResult[] {
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
        paper-checkbox {
          display: block;
          margin: 4px;
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

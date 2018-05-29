import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../src/components/ha-markdown.js';
import '../../src/resources/ha-style.js';

class HassioMarkdownDialog extends PolymerElement {
  static get template() {
    return html`
    <style include="ha-style-dialog">
      paper-dialog {
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
        paper-dialog {
          max-height: 100%;
        }
        paper-dialog::before {
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
    </style>
    <paper-dialog id="dialog" with-backdrop="">
      <app-toolbar>
        <paper-icon-button icon="hassio:close" dialog-dismiss=""></paper-icon-button>
        <div main-title="">[[title]]</div>
      </app-toolbar>
      <paper-dialog-scrollable>
        <ha-markdown content="[[content]]"></ha-markdown>
      </paper-dialog-scrollable>
    </paper-dialog>
`;
  }

  static get properties() {
    return {
      title: String,
      content: String,
    };
  }

  openDialog() {
    this.$.dialog.open();
  }
}
customElements.define('hassio-markdown-dialog', HassioMarkdownDialog);

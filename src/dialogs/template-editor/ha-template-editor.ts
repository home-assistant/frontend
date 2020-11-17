import "../../panels/developer-tools/template/developer-tools-template";
import "@material/mwc-button/mwc-button";
import "../../components/ha-code-editor";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-circular-progress";
import "../../components/ha-dialog";
import "../../components/ha-header-bar";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { TemplateEditorParams } from "./show-dialog-template-editor";

@customElement("ha-template-editor")
export class TemplateEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _opened = false;

  @internalProperty() private _startingTemplate?: string;

  public showDialog(params: TemplateEditorParams) {
    this._startingTemplate = `${params.startingTemplate}\n\n\n\n`;
    this._opened = true;
  }

  public closeDialog() {
    this._opened = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._opened) {
      return html``;
    }

    return html`<ha-dialog
      .heading=${true}
      open
      @closed=${this.closeDialog}
      hideActions
    >
      <div slot="heading">
        <ha-header-bar>
          <span slot="title">
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.templates.editor"
            )}
          </span>
        </ha-header-bar>
      </div>
      <div class="content">
        <developer-tools-template
          .narrow=${true}
          .hass=${this.hass}
          .simple=${true}
          .startingTemplate=${this._startingTemplate}
        ></developer-tools-template>
      </div>
    </ha-dialog>`;
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        :host {
          width: 100%;
          --mdc-dialog-max-width: 700px;
          --mdc-dialog-min-width: 700px;
          --mdc-dialog-max-height: calc(100% - 72px);
          --mdc-dialog-min-height: 400px;
          --dialog-content-padding: 0px;
          --template-results-width: 100%;
          --mdc-dialog-content-ink-color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-template-editor": TemplateEditor;
  }
}

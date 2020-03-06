import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";

import { HomeAssistant } from "../../../../types";
import { HASSDomEvent } from "../../../../common/dom/fire_event";
import "./hui-edit-view";
import { EditViewDialogParams } from "./show-edit-view-dialog";

declare global {
  // for fire event
  interface HASSDomEvents {
    "reload-lovelace": undefined;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "reload-lovelace": HASSDomEvent<undefined>;
  }
}

@customElement("hui-dialog-edit-view")
export class HuiDialogEditView extends LitElement {
  @property() protected hass?: HomeAssistant;

  @property() private _params?: EditViewDialogParams;

  public async showDialog(params: EditViewDialogParams): Promise<void> {
    this._params = params;
    await this.updateComplete;
    (this.shadowRoot!.children[0] as any).showDialog();
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    return html`
      <hui-edit-view
        .hass=${this.hass}
        .lovelace="${this._params.lovelace}"
        .viewIndex="${this._params.viewIndex}"
      >
      </hui-edit-view>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-view": HuiDialogEditView;
  }
}

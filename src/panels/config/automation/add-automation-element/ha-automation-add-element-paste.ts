import "@home-assistant/webawesome/dist/components/divider/divider";
import { consume, type ContextType } from "@lit/context";
import { mdiAppleKeyboardCommand, mdiContentPaste, mdiPlus } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-svg-icon";
import "../../../../components/item/ha-list-item-button";
import {
  internationalizationContext,
  narrowViewportContext,
} from "../../../../data/context";
import { isMac } from "../../../../util/is_mac";
import type { AddAutomationElementDialogParams } from "../show-add-automation-element-dialog";

@customElement("ha-automation-add-element-paste")
export class HaAutomationAddElementPaste extends LitElement {
  @property({ attribute: "clipboard-item" }) public clipboardItem?;

  @property({ attribute: "automation-element-type" })
  public automationElementType!: AddAutomationElementDialogParams["type"];

  @property({ type: Boolean }) public divider = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  protected _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: narrowViewportContext, subscribe: true })
  protected _narrow!: ContextType<typeof narrowViewportContext>;

  protected render() {
    if (!this.clipboardItem) {
      return nothing;
    }

    return html`<ha-list-item-button class="paste" @click=${this._paste}>
        <div slot="headline" class="label">
          ${this._i18n.localize(
            `ui.panel.config.automation.editor.${this.automationElementType}s.paste`
          )}
        </div>
        <div slot="supporting-text">
          ${this._i18n.localize(
            // @ts-ignore
            `ui.panel.config.automation.editor.${this.automationElementType}s.type.${this.clipboardItem}.label`
          )}
        </div>
        ${
          !this._narrow
            ? html`<span slot="end" class="shortcut">
                <span
                  >${
                    isMac
                      ? html`<ha-svg-icon
                          slot="start"
                          .path=${mdiAppleKeyboardCommand}
                        ></ha-svg-icon>`
                      : this._i18n.localize(
                          "ui.panel.config.automation.editor.ctrl"
                        )
                  }</span
                >
                <span>+</span>
                <span>V</span>
              </span>`
            : nothing
        }
        <ha-svg-icon slot="start" .path=${mdiContentPaste}></ha-svg-icon
        ><ha-svg-icon class="plus" slot="end" .path=${mdiPlus}></ha-svg-icon>
      </ha-list-item-button>
      ${this.divider ? html`<wa-divider></wa-divider>` : nothing}`;
  }

  private _paste() {
    fireEvent(this, "paste-element");
  }

  static styles = css`
    :host {
      display: block;
    }
    wa-divider {
      --spacing: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-add-element-paste": HaAutomationAddElementPaste;
  }

  interface HASSDomEvents {
    "paste-element": undefined;
  }
}

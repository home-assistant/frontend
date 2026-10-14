import type { ContextType } from "@lit/context";
import { mdiContentPaste } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-svg-icon";
import { internationalizationContext } from "../../../../data/context";
import type { AddAutomationElementDialogParams } from "../show-add-automation-element-dialog";

/**
 * Contextual action bar pinned to the bottom of the dialog's list pane.
 * Place it as the last child of a scrolling container.
 */
@customElement("ha-automation-add-element-paste")
export class HaAutomationAddElementPaste extends LitElement {
  @property({ attribute: "clipboard-item", reflect: true })
  public clipboardItem?: string;

  @property({ attribute: "automation-element-type" })
  public automationElementType!: AddAutomationElementDialogParams["type"];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  protected _i18n!: ContextType<typeof internationalizationContext>;

  protected render() {
    if (!this.clipboardItem) {
      return nothing;
    }

    return html`<ha-button appearance="filled" size="s" @click=${this._paste}>
      <ha-svg-icon slot="start" .path=${mdiContentPaste}></ha-svg-icon>
      ${this._i18n.localize(
        `ui.panel.config.automation.editor.${this.automationElementType}s.paste_element`
      )}
    </ha-button>`;
  }

  private _paste() {
    fireEvent(this, "paste-element");
  }

  static styles = css`
    :host {
      position: sticky;
      bottom: 0;
      /* In a flex column shorter than its box, sit at the bottom anyway. */
      margin-top: auto;
      z-index: 3;
      display: flex;
      gap: var(--ha-space-2);
      align-items: center;
      padding: var(--ha-space-3);
      padding-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-3));
      background-color: var(--ha-color-surface-low);
    }
    :host(:not([clipboard-item])) {
      display: none;
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

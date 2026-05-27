import { consume, type ContextType } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-settings-row";
import { internationalizationContext } from "../../../data/context";

@customElement("ha-automation-note")
export class HaAutomationNote extends LitElement {
  @property() public note!: string;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  protected render() {
    return html`
      <ha-settings-row narrow>
        <div class="heading" slot="heading">
          <span class="title" id="note-label">
            ${this._i18n.localize(
              "ui.panel.config.automation.editor.note.label"
            )}
          </span>
          <ha-button
            @click=${this._handleClick}
            size="small"
            appearance="plain"
          >
            ${this._i18n.localize("ui.common.edit")}
          </ha-button>
        </div>
        <p aria-labelledby="note-label">${this.note}</p>
      </ha-settings-row>
    `;
  }

  private _handleClick() {
    fireEvent(this, "edit-note");
  }

  static styles = css`
    ha-settings-row {
      margin-inline: calc(-1 * var(--ha-space-4));
    }
    ha-settings-row::part(heading) {
      padding-inline-end: 0;
      overflow: visible;
    }
    .heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    p {
      margin: var(--ha-space-2) 0 0;
      border: var(--ha-border-width-sm) solid
        var(--ha-color-border-neutral-quiet);
      padding: var(--ha-space-1) var(--ha-space-3);
      border-radius: var(--ha-border-radius-lg);
      background-color: var(--ha-color-fill-neutral-quiet-resting);
      white-space: pre-wrap;
    }
    ha-button {
      margin-inline-end: calc(-1 * var(--ha-space-3));
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-note": HaAutomationNote;
  }

  interface HASSDomEvents {
    "edit-note": undefined;
  }
}

import { mdiChevronDown } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-icon-button";
import "../../../components/item/ha-list-item-button";

/**
 * The row that expands and collapses the devices of a config entry that do
 * not belong to a sub entry. It draws the top of the frame around them.
 */
@customElement("ha-config-entry-toggle-row")
class HaConfigEntryToggleRow extends LitElement {
  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render() {
    return html`<ha-list-item-button aria-expanded=${this.expanded}>
      <ha-icon-button
        class="expand-button"
        .path=${mdiChevronDown}
        slot="start"
      ></ha-icon-button>
      <span slot="headline"
        >${this._localize(
          "ui.panel.config.integrations.config_entry.devices_without_subentry"
        )}</span
      >
    </ha-list-item-button>`;
  }

  static styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      padding-inline: var(--ha-space-4);
    }
    :host(:not([expanded])) {
      padding-bottom: var(--ha-space-4);
    }
    ha-list-item-button {
      overflow: hidden;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
    }
    :host([expanded]) ha-list-item-button {
      border-bottom: none;
      border-end-start-radius: 0;
      border-end-end-radius: 0;
    }
    ha-icon-button {
      color: var(--ha-color-fill-neutral-loud-resting);
    }
    .expand-button {
      margin: 0 -12px;
      transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    :host([expanded]) .expand-button {
      transform: rotate(180deg);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-entry-toggle-row": HaConfigEntryToggleRow;
  }
}

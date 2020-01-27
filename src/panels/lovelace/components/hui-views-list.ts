import {
  customElement,
  LitElement,
  property,
  TemplateResult,
  html,
  CSSResult,
  css,
} from "lit-element";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-icon-item";
import "../../../../src/components/ha-icon";
import { toggleAttribute } from "../../../../src/common/dom/toggle_attribute";
import { fireEvent } from "../../../common/dom/fire_event";
import { LovelaceConfig } from "../../../data/lovelace";

declare global {
  interface HASSDomEvents {
    "view-selected": {
      view: number;
    };
  }
}

@customElement("hui-views-list")
class HuiViewsList extends LitElement {
  @property() private lovelaceConfig?: LovelaceConfig | undefined;
  @property() private selected?: number | undefined;

  protected render(): TemplateResult {
    if (!this.lovelaceConfig) {
      return html``;
    }

    return html`
      <paper-listbox attr-for-selected="data-index" .selected=${this.selected}>
        ${this.lovelaceConfig.views.map(
          (view, index) => html`
            <paper-icon-item @click=${this._handlePickView} data-index=${index}>
              ${view.icon
                ? html`
                    <ha-icon .icon=${view.icon} slot="item-icon"></ha-icon>
                  `
                : ""}
              ${view.title || view.path}
            </paper-icon-item>
          `
        )}
      </paper-listbox>
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    toggleAttribute(
      this,
      "hide-icons",
      this.lovelaceConfig
        ? !this.lovelaceConfig.views.some((view) => view.icon)
        : true
    );
  }

  private async _handlePickView(ev: Event) {
    const view = Number((ev.currentTarget as any).getAttribute("data-index"));
    fireEvent(this, "view-selected", { view });
  }

  static get styles(): CSSResult {
    return css`
      paper-listbox {
        padding-top: 0;
      }

      paper-listbox ha-icon {
        padding: 12px;
        color: var(--secondary-text-color);
      }

      paper-icon-item {
        cursor: pointer;
      }

      paper-icon-item[disabled] {
        cursor: initial;
      }

      :host([hide-icons]) paper-icon-item {
        --paper-item-icon-width: 0px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-views-list": HuiViewsList;
  }
}

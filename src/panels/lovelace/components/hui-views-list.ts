import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { toggleAttribute } from "../../../common/dom/toggle_attribute";
import "../../../components/ha-icon";
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
  @state() private lovelaceConfig?: LovelaceConfig | undefined;

  @state() private selected?: number | undefined;

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
              ${view.title || view.path || "Unnamed view"}
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

  static get styles(): CSSResultGroup {
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

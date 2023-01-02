import { html, LitElement, TemplateResult, css, CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-help-tooltip";
import "../../../components/ha-service-control";
import { HomeAssistant } from "../../../types";
import { EditorTarget } from "../editor/types";
import "../../../components/ha-navigation-picker";
import { SortConfig } from "../cards/types";
import "./hui-sort-config-picker";

@customElement("hui-sort-config-editor")
export class HuiSortConfigEditor extends LitElement {
  @property() public config?: SortConfig[];

  @property() public label?: string;

  @property() protected hass?: HomeAssistant;

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      ${this.config?.map(
        (sortConf: SortConfig, i: number) => html`
          <hui-sort-config-picker
            .hass=${this.hass}
            .config=${sortConf}
            .configValue=${i}
            @value-changed=${this._sortConfigChanged}
          >
          </hui-sort-config-picker>
        `
      )}
      <hui-sort-config-picker
        .hass=${this.hass}
        .configValue=${"add"}
        @value-changed=${this._sortConfigChanged}
      >
      </hui-sort-config-picker>
    `;
  }

  private _sortConfigChanged(ev): void {
    ev.stopPropagation();
    if (!this.hass) {
      return;
    }

    const target = ev.target! as EditorTarget;
    const sortConf = ev.detail.value as SortConfig;

    if (sortConf === undefined) {
      return;
    }

    if (target.configValue === "add") {
      fireEvent(this, "value-changed", {
        value:
          this.config !== undefined
            ? this.config!.concat(sortConf)
            : [sortConf],
      });
      return;
    }

    const changedConfigIndex = Number(target.configValue);
    if (isNaN(changedConfigIndex)) {
      return;
    }

    if (sortConf.type === "") {
      delete this.config![changedConfigIndex];
    } else {
      this.config![changedConfigIndex] = sortConf;
    }

    fireEvent(this, "value-changed", {
      value: this.config,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sort-config-editor": HuiSortConfigEditor;
  }
}

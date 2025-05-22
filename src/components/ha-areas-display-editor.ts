import { mdiTextureBox } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { getAreaContext } from "../common/entity/context/get_area_context";
import { areaCompare } from "../data/area_registry";
import type { HomeAssistant } from "../types";
import "./ha-expansion-panel";
import "./ha-items-display-editor";
import type { DisplayItem, DisplayValue } from "./ha-items-display-editor";
import "./ha-svg-icon";
import "./ha-textfield";

export interface AreasDisplayValue {
  hidden?: string[];
  order?: string[];
}

@customElement("ha-areas-display-editor")
export class HaAreasDisplayEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ attribute: false }) public value?: AreasDisplayValue;

  @property() public helper?: string;

  @property({ type: Boolean }) public expanded = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "show-navigation-button" })
  public showNavigationButton = false;

  protected render(): TemplateResult {
    const compare = areaCompare(this.hass.areas);

    const areas = Object.values(this.hass.areas).sort((areaA, areaB) =>
      compare(areaA.area_id, areaB.area_id)
    );

    const items: DisplayItem[] = areas.map((area) => {
      const { floor } = getAreaContext(area, this.hass!);
      return {
        value: area.area_id,
        label: area.name,
        icon: area.icon ?? undefined,
        iconPath: mdiTextureBox,
        description: floor?.name,
      };
    });

    const value: DisplayValue = {
      order: this.value?.order ?? [],
      hidden: this.value?.hidden ?? [],
    };

    return html`
      <ha-expansion-panel
        outlined
        .header=${this.label}
        .expanded=${this.expanded}
      >
        <ha-svg-icon slot="leading-icon" .path=${mdiTextureBox}></ha-svg-icon>
        <ha-items-display-editor
          .hass=${this.hass}
          .items=${items}
          .value=${value}
          @value-changed=${this._areaDisplayChanged}
          .showNavigationButton=${this.showNavigationButton}
        ></ha-items-display-editor>
      </ha-expansion-panel>
    `;
  }

  private async _areaDisplayChanged(ev) {
    ev.stopPropagation();
    const value = ev.detail.value as DisplayValue;
    const newValue: AreasDisplayValue = {
      ...this.value,
      ...value,
    };
    if (newValue.hidden?.length === 0) {
      delete newValue.hidden;
    }
    if (newValue.order?.length === 0) {
      delete newValue.order;
    }

    fireEvent(this, "value-changed", { value: newValue });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-areas-display-editor": HaAreasDisplayEditor;
  }
}

import { mdiDragHorizontalVariant } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/ha-area-controls-picker";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import "../../../../components/chips/ha-input-chip";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import {
  getAreaControlEntities,
  MAX_DEFAULT_AREA_CONTROLS,
} from "../../../../data/area/area_controls";
import {
  AREA_CONTROL_DOMAINS,
  type AreaControl,
  type AreaControlDomain,
  type AreaControlsCardFeatureConfig,
} from "../../card-features/types";
import type { AreaCardFeatureContext } from "../../cards/hui-area-card";
import type { LovelaceCardFeatureEditor } from "../../types";

type AreaControlsCardFeatureData = AreaControlsCardFeatureConfig & {
  customize_controls: boolean;
};

@customElement("hui-area-controls-card-feature-editor")
export class HuiAreaControlsCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: AreaCardFeatureContext;

  @state() private _config?: AreaControlsCardFeatureConfig;

  public setConfig(config: AreaControlsCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = [
    {
      name: "customize_controls",
      selector: {
        boolean: {},
      },
    },
  ] as const satisfies readonly HaFormSchema[];

  private _supportedControls = memoizeOne(
    (
      areaId: string,
      excludeEntities: string[] | undefined,
      // needed to update memoized function when entities, devices or areas change
      _entities: HomeAssistant["entities"],
      _devices: HomeAssistant["devices"],
      _areas: HomeAssistant["areas"]
    ) => {
      if (!this.hass) {
        return [];
      }
      const controlEntities = getAreaControlEntities(
        AREA_CONTROL_DOMAINS as unknown as AreaControlDomain[],
        areaId,
        excludeEntities,
        this.hass!
      );
      return (
        Object.keys(controlEntities) as (keyof typeof controlEntities)[]
      ).filter((control) => controlEntities[control].length > 0);
    }
  );

  protected render() {
    if (!this.hass || !this._config || !this.context?.area_id) {
      return nothing;
    }

    const supportedControls = this._supportedControls(
      this.context.area_id,
      this.context.exclude_entities,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas
    );

    if (supportedControls.length === 0) {
      return html`
        <ha-alert alert-type="warning">
          ${this.hass.localize(
            "ui.panel.lovelace.editor.features.types.area-controls.no_compatible_controls"
          )}
        </ha-alert>
      `;
    }

    const data: AreaControlsCardFeatureData = {
      ...this._config,
      customize_controls: this._config.controls !== undefined,
    };

    const value = this._config.controls || [];
    const excludeValues = value.map((control) =>
      typeof control === "string" ? control : control.entity_id
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      ${data.customize_controls
        ? html`
            ${value.length
              ? html`
                  <ha-sortable
                    no-style
                    @item-moved=${this._itemMoved}
                    handle-selector="button.primary.action"
                  >
                    <ha-chip-set>
                      ${repeat(
                        value,
                        (item) =>
                          typeof item === "string" ? item : item.entity_id,
                        (item, idx) => {
                          const label = this._getItemLabel(item);
                          return html`
                            <ha-input-chip
                              .idx=${idx}
                              @remove=${this._removeItem}
                              .label=${label}
                              selected
                            >
                              <ha-svg-icon
                                slot="icon"
                                .path=${mdiDragHorizontalVariant}
                              ></ha-svg-icon>
                              ${label}
                            </ha-input-chip>
                          `;
                        }
                      )}
                    </ha-chip-set>
                  </ha-sortable>
                `
              : nothing}
            <ha-area-controls-picker
              .hass=${this.hass}
              .areaId=${this.context.area_id}
              .excludeEntities=${this.context.exclude_entities}
              .excludeValues=${excludeValues}
              .value=${""}
              .addButtonLabel=${this.hass.localize(
                "ui.panel.lovelace.editor.features.types.area-controls.controls"
              )}
              @value-changed=${this._controlChanged}
            ></ha-area-controls-picker>
          `
        : nothing}
    `;
  }

  private _getItemLabel(item: AreaControl): string {
    if (!this.hass) {
      return typeof item === "string" ? item : JSON.stringify(item);
    }

    if (typeof item === "string") {
      if (AREA_CONTROL_DOMAINS.includes(item as AreaControlDomain)) {
        return this.hass.localize(
          `ui.panel.lovelace.editor.features.types.area-controls.controls_options.${item}`
        );
      }
      // Invalid/unknown domain string
      return item;
    }

    if ("entity_id" in item) {
      const entityState = this.hass.states[item.entity_id];
      if (entityState) {
        return computeStateName(entityState);
      }
      return item.entity_id;
    }

    return JSON.stringify(item);
  }

  private _itemMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const controls = [...(this._config!.controls || [])];
    const item = controls.splice(oldIndex, 1)[0];
    controls.splice(newIndex, 0, item);
    this._updateControls(controls);
  }

  private _removeItem(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).idx;
    const controls = [...(this._config!.controls || [])];
    controls.splice(index, 1);
    this._updateControls(controls);
  }

  private _controlChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (!value) {
      return;
    }
    // If it's a domain control (in AREA_CONTROL_DOMAINS), save as string for backwards compatibility
    // If it's an entity, save in explicit format
    const control = AREA_CONTROL_DOMAINS.includes(value as AreaControlDomain)
      ? value
      : { entity_id: value };
    const controls = [...(this._config!.controls || []), control];
    this._updateControls(controls);
  }

  private _updateControls(controls: AreaControl[]): void {
    const config = { ...this._config!, controls };
    fireEvent(this, "config-changed", { config });
  }

  private _valueChanged(ev: CustomEvent): void {
    const { customize_controls, ...config } = ev.detail
      .value as AreaControlsCardFeatureData;

    if (customize_controls && !config.controls) {
      config.controls = this._supportedControls(
        this.context!.area_id!,
        this.context!.exclude_entities,
        this.hass!.entities,
        this.hass!.devices,
        this.hass!.areas
      ).slice(0, MAX_DEFAULT_AREA_CONTROLS); // Limit to max default controls
    }

    if (!customize_controls && config.controls) {
      delete config.controls;
    }

    fireEvent(this, "config-changed", { config: config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof this._schema>
  ) => {
    switch (schema.name) {
      case "customize_controls":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.area-controls.${schema.name}`
        );
      default:
        return "";
    }
  };

  static styles = css`
    ha-sortable {
      display: block;
      margin-bottom: var(--ha-space-2);
    }
    ha-chip-set {
      margin-bottom: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-area-controls-card-feature-editor": HuiAreaControlsCardFeatureEditor;
  }
}

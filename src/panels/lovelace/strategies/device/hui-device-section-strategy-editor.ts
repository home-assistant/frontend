import { mdiFormatListBulleted } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { LovelaceStrategyEditor } from "../types";
import {
  DEFAULT_DEVICE_SECTION_CATEGORIES,
  DEVICE_SECTION_CATEGORIES,
  DEVICE_SECTION_HEADINGS,
  type DeviceSectionStrategyConfig,
} from "./device-section-strategy";

@customElement("hui-device-section-strategy-editor")
export class HuiDeviceSectionStrategyEditor
  extends LitElement
  implements LovelaceStrategyEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @state() private _config?: DeviceSectionStrategyConfig;

  public setConfig(config: DeviceSectionStrategyConfig): void {
    this._config = config;
  }

  private _deviceEntities = memoizeOne(
    (deviceId: string | undefined, entities: HomeAssistant["entities"]) =>
      deviceId
        ? Object.values(entities)
            .filter((entry) => entry.device_id === deviceId && !entry.hidden)
            .map((entry) => entry.entity_id)
        : []
  );

  private _schema = memoizeOne(
    (localize: LocalizeFunc, deviceEntities: string[]) =>
      [
        {
          name: "device_id",
          required: true,
          selector: { device: {} },
        },
        {
          name: "heading",
          selector: {
            select: {
              mode: "dropdown",
              options: DEVICE_SECTION_HEADINGS.map((heading) => ({
                value: heading,
                label: localize(
                  `ui.panel.lovelace.editor.strategy.device.heading_options.${heading}`
                ),
              })),
            },
          },
        },
        {
          name: "categories",
          selector: {
            select: {
              multiple: true,
              mode: "list",
              options: DEVICE_SECTION_CATEGORIES.map((category) => ({
                value: category,
                label: localize(
                  `ui.panel.lovelace.strategy.device.categories.${category}`
                ),
              })),
            },
          },
        },
        {
          name: "display",
          selector: {
            select: {
              mode: "box",
              options: (["tiles", "list"] as const).map((display) => ({
                value: display,
                label: localize(
                  `ui.panel.lovelace.editor.strategy.device.display_options.${display}`
                ),
                description: localize(
                  `ui.panel.lovelace.editor.strategy.device.display_options.${display}_description`
                ),
              })),
            },
          },
        },
        {
          name: "group_by_category",
          selector: { boolean: {} },
        },
        ...(deviceEntities.length
          ? ([
              {
                name: "entities",
                type: "expandable",
                flatten: true,
                iconPath: mdiFormatListBulleted,
                schema: [
                  {
                    name: "exclude_entities",
                    selector: {
                      entity: {
                        multiple: true,
                        include_entities: deviceEntities,
                      },
                    },
                  },
                ],
              },
            ] as const)
          : []),
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this._config) return nothing;

    const data = {
      categories: DEFAULT_DEVICE_SECTION_CATEGORIES,
      display: "tiles",
      heading: "device",
      ...this._config,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(
          this._localize,
          this._deviceEntities(
            this._config.device_id,
            this.hass?.entities ?? {}
          )
        )}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this._localize(`ui.panel.lovelace.editor.strategy.device.${schema.name}`);

  private _computeHelper = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    schema.name === "group_by_category" ||
    schema.name === "heading" ||
    schema.name === "exclude_entities"
      ? this._localize(
          `ui.panel.lovelace.editor.strategy.device.${schema.name}_helper`
        )
      : "";

  private _valueChanged(ev: ValueChangedEvent<DeviceSectionStrategyConfig>) {
    ev.stopPropagation();
    const config = { ...this._config, ...ev.detail.value };
    if (config.device_id !== this._config?.device_id) {
      delete config.exclude_entities;
    }
    fireEvent(this, "config-changed", { config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-device-section-strategy-editor": HuiDeviceSectionStrategyEditor;
  }
}

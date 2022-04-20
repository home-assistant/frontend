import "../../../../components/ha-form/ha-form";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { domainIcon } from "../../../../common/entity/domain_icon";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { EntitiesCardEntityConfig } from "../../cards/types";
import type { LovelaceRowEditor } from "../../types";
import { entitiesConfigStruct } from "../structs/entities-struct";

const SecondaryInfoValues: { [key: string]: { domains?: string[] } } = {
  none: {},
  "entity-id": {},
  "last-changed": {},
  "last-updated": {},
  "last-triggered": { domains: ["automation", "script"] },
  position: { domains: ["cover"] },
  "tilt-position": { domains: ["cover"] },
  brightness: { domains: ["light"] },
};

@customElement("hui-generic-entity-row-editor")
export class HuiGenericEntityRowEditor
  extends LitElement
  implements LovelaceRowEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntitiesCardEntityConfig;

  public setConfig(config: EntitiesCardEntityConfig): void {
    assert(config, entitiesConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      entity: string,
      icon: string | undefined,
      entityState: HassEntity,
      localize: LocalizeFunc
    ): HaFormSchema[] => {
      const domain = computeDomain(entity);

      return [
        { name: "entity", required: true, selector: { entity: {} } },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "name", selector: { text: {} } },
            {
              name: "icon",
              selector: {
                icon: {
                  placeholder: icon || entityState?.attributes.icon,
                  fallbackPath:
                    !icon && !entityState?.attributes.icon && entityState
                      ? domainIcon(domain, entityState)
                      : undefined,
                },
              },
            },
          ],
        },
        {
          name: "secondary_info",
          selector: {
            select: {
              options: Object.keys(SecondaryInfoValues)
                .filter(
                  (info) =>
                    !("domains" in SecondaryInfoValues[info]) ||
                    ("domains" in SecondaryInfoValues[info] &&
                      SecondaryInfoValues[info].domains!.includes(domain))
                )
                .map((info) => ({
                  value: info,
                  label: localize(
                    `ui.panel.lovelace.editor.card.entities.secondary_info_values.${info}`
                  ),
                })),
            },
          },
        },
      ];
    }
  );

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const entityState = this.hass.states[this._config.entity];

    const schema = this._schema(
      this._config.entity,
      this._config.icon,
      entityState,
      this.hass.localize
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (schema: HaFormSchema) => {
    if (schema.name === "entity") {
      return this.hass!.localize(
        "ui.panel.lovelace.editor.card.generic.entity"
      );
    }

    return (
      this.hass!.localize(
        `ui.panel.lovelace.editor.card.generic.${schema.name}`
      ) ||
      this.hass!.localize(
        `ui.panel.lovelace.editor.card.entity-row.${schema.name}`
      )
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-generic-entity-row-editor": HuiGenericEntityRowEditor;
  }
}

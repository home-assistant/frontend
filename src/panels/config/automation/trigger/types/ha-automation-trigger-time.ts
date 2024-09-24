import { html, LitElement, PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { TimeTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";

const MODE_TIME = "time";
const MODE_ENTITY = "entity";

@customElement("ha-automation-trigger-time")
export class HaTimeTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: TimeTrigger;

  @property({ type: Boolean }) public disabled = false;

  @state() private _inputMode:
    | undefined
    | typeof MODE_TIME
    | typeof MODE_ENTITY;

  public static get defaultConfig(): TimeTrigger {
    return { platform: "time", at: "" };
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      inputMode: typeof MODE_TIME | typeof MODE_ENTITY,
      showOffset: boolean
    ) =>
      [
        {
          name: "mode",
          type: "select",
          required: true,
          options: [
            [
              MODE_TIME,
              localize(
                "ui.panel.config.automation.editor.triggers.type.time.type_value"
              ),
            ],
            [
              MODE_ENTITY,
              localize(
                "ui.panel.config.automation.editor.triggers.type.time.type_input"
              ),
            ],
          ],
        },
        ...(inputMode === MODE_TIME
          ? ([{ name: "time", selector: { time: {} } }] as const)
          : ([
              {
                name: "entity",
                selector: {
                  entity: {
                    filter: [
                      { domain: "input_datetime" },
                      { domain: "sensor", device_class: "timestamp" },
                    ],
                  },
                },
              },
            ] as const)),
        ...(showOffset
          ? ([{ name: "offset", selector: { text: {} } }] as const)
          : ([] as const)),
      ] as const
  );

  public willUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("trigger")) {
      return;
    }
    // We dont support multiple times atm.
    if (this.trigger && Array.isArray(this.trigger.at)) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(this.hass.localize("ui.errors.config.editor_not_supported"))
      );
    }
  }

  private _data = memoizeOne(
    (
      inputMode: undefined | typeof MODE_ENTITY | typeof MODE_TIME,
      at:
        | string
        | { entity_id: string | undefined; offset?: string | undefined }
    ): {
      mode: typeof MODE_TIME | typeof MODE_ENTITY;
      entity: string | undefined;
      time: string | undefined;
      offset: string | undefined;
    } => {
      const entity =
        typeof at === "object"
          ? at.entity_id
          : at?.startsWith("input_datetime.") || at?.startsWith("sensor.")
            ? at
            : undefined;
      const time = entity ? undefined : (at as string | undefined);
      const offset = typeof at === "object" ? at.offset : undefined;
      const mode = inputMode ?? (entity ? MODE_ENTITY : MODE_TIME);
      return {
        mode,
        entity,
        time,
        offset,
      };
    }
  );

  protected render() {
    const at = this.trigger.at;

    if (Array.isArray(at)) {
      return nothing;
    }
    const data = this._data(this._inputMode, at);
    const showOffset =
      data.mode === MODE_ENTITY && data.entity?.startsWith("sensor.");
    const schema = this._schema(this.hass.localize, data.mode, !!showOffset);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newValue = { ...ev.detail.value };
    this._inputMode = newValue.mode;
    if (newValue.mode === MODE_TIME) {
      delete newValue.entity;
      delete newValue.offset;
    } else {
      delete newValue.time;
      if (!newValue.entity?.startsWith("sensor.")) {
        delete newValue.offset;
      }
    }
    fireEvent(this, "value-changed", {
      value: {
        platform: "time",
        at: newValue.offset
          ? {
              entity_id: newValue.entity,
              offset: newValue.offset,
            }
          : newValue.entity || newValue.time,
      },
    });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "time":
        return this.hass.localize(
          `ui.panel.config.automation.editor.triggers.type.time.at`
        );
    }
    return this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.time.${schema.name}`
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-time": HaTimeTrigger;
  }
}

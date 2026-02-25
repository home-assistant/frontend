import timezones from "google-timezones-json";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  boolean,
  defaulted,
  enums,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { ClockCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { TimeFormat } from "../../../../data/translation";
import {
  CLOCK_CARD_DATE_PARTS,
  getClockCardDateConfig,
} from "../../cards/clock/clock-date-format";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    clock_style: optional(enums(["digital", "analog"])),
    clock_size: optional(enums(["small", "medium", "large"])),
    time_format: optional(enums(Object.values(TimeFormat))),
    time_zone: optional(enums(Object.keys(timezones))),
    show_seconds: optional(boolean()),
    no_background: optional(boolean()),
    date_format: optional(defaulted(array(enums(CLOCK_CARD_DATE_PARTS)), [])),
    // Analog clock options
    border: optional(defaulted(boolean(), false)),
    ticks: optional(
      defaulted(enums(["none", "quarter", "hour", "minute"]), "hour")
    ),
    seconds_motion: optional(
      defaulted(enums(["continuous", "tick"]), "continuous")
    ),
    face_style: optional(
      defaulted(enums(["markers", "numbers_upright", "roman"]), "markers")
    ),
  })
);

type ClockCardFormData = Omit<ClockCardConfig, "time_format"> & {
  time_format?: ClockCardConfig["time_format"] | "auto";
};

type ClockCardValueChangedEvent = ValueChangedEvent<ClockCardFormData>;

@customElement("hui-clock-card-editor")
export class HuiClockCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ClockCardConfig;

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      clockStyle: ClockCardConfig["clock_style"],
      ticks: ClockCardConfig["ticks"],
      showSeconds: boolean | undefined
    ) =>
      [
        { name: "title", selector: { text: {} } },
        {
          name: "clock_style",
          selector: {
            select: {
              mode: "box",
              options: ["digital", "analog"].map((value) => ({
                value,
                label: localize(
                  `ui.panel.lovelace.editor.card.clock.clock_styles.${value}`
                ),
              })),
            },
          },
        },
        {
          name: "clock_size",
          selector: {
            select: {
              mode: "dropdown",
              options: ["small", "medium", "large"].map((value) => ({
                value,
                label: localize(
                  `ui.panel.lovelace.editor.card.clock.clock_sizes.${value}`
                ),
              })),
            },
          },
        },
        { name: "show_seconds", selector: { boolean: {} } },
        { name: "no_background", selector: { boolean: {} } },
        {
          name: "date_format",
          required: false,
          selector: {
            ui_clock_date_format: {},
          },
        },
        ...(clockStyle === "digital"
          ? ([
              {
                name: "time_format",
                selector: {
                  select: {
                    mode: "dropdown",
                    options: ["auto", ...Object.values(TimeFormat)].map(
                      (value) => ({
                        value,
                        label: localize(
                          `ui.panel.lovelace.editor.card.clock.time_formats.${value}`
                        ),
                      })
                    ),
                  },
                },
              },
            ] as const satisfies readonly HaFormSchema[])
          : clockStyle === "analog"
            ? ([
                {
                  name: "border",
                  description: {
                    suffix: localize(
                      `ui.panel.lovelace.editor.card.clock.border.description`
                    ),
                  },
                  default: false,
                  selector: {
                    boolean: {},
                  },
                },
                {
                  name: "ticks",
                  description: {
                    suffix: localize(
                      `ui.panel.lovelace.editor.card.clock.ticks.description`
                    ),
                  },
                  default: "hour",
                  selector: {
                    select: {
                      mode: "dropdown",
                      options: ["none", "quarter", "hour", "minute"].map(
                        (value) => ({
                          value,
                          label: localize(
                            `ui.panel.lovelace.editor.card.clock.ticks.${value}.label`
                          ),
                          description: localize(
                            `ui.panel.lovelace.editor.card.clock.ticks.${value}.description`
                          ),
                        })
                      ),
                    },
                  },
                },
                ...(showSeconds
                  ? ([
                      {
                        name: "seconds_motion",
                        description: {
                          suffix: localize(
                            `ui.panel.lovelace.editor.card.clock.seconds_motion.description`
                          ),
                        },
                        default: "continuous",
                        selector: {
                          select: {
                            mode: "dropdown",
                            options: ["continuous", "tick"].map((value) => ({
                              value,
                              label: localize(
                                `ui.panel.lovelace.editor.card.clock.seconds_motion.${value}.label`
                              ),
                              description: localize(
                                `ui.panel.lovelace.editor.card.clock.seconds_motion.${value}.description`
                              ),
                            })),
                          },
                        },
                      },
                    ] as const satisfies readonly HaFormSchema[])
                  : []),
                ...(ticks !== "none"
                  ? ([
                      {
                        name: "face_style",
                        description: {
                          suffix: localize(
                            `ui.panel.lovelace.editor.card.clock.face_style.description`
                          ),
                        },
                        default: "markers",
                        selector: {
                          select: {
                            mode: "dropdown",
                            options: [
                              "markers",
                              "numbers_upright",
                              "roman",
                            ].map((value) => ({
                              value,
                              label: localize(
                                `ui.panel.lovelace.editor.card.clock.face_style.${value}.label`
                              ),
                              description: localize(
                                `ui.panel.lovelace.editor.card.clock.face_style.${value}.description`
                              ),
                            })),
                          },
                        },
                      },
                    ] as const satisfies readonly HaFormSchema[])
                  : []),
              ] as const satisfies readonly HaFormSchema[])
            : []),
        { name: "time_zone", selector: { timezone: {} } },
      ] as const satisfies readonly HaFormSchema[]
  );

  private _data = memoizeOne((config: ClockCardConfig): ClockCardFormData => {
    const dateConfig = getClockCardDateConfig(config);

    const data: ClockCardFormData = {
      ...config,
      clock_style: config.clock_style ?? "digital",
      clock_size: config.clock_size ?? "small",
      time_format: config.time_format ?? "auto",
      show_seconds: config.show_seconds ?? false,
      no_background: config.no_background ?? false,
      // Analog clock options
      border: config.border ?? false,
      ticks: config.ticks ?? "hour",
      face_style: config.face_style ?? "markers",
    };

    if (config.date_format === undefined) {
      data.date_format = dateConfig.parts;
    }

    return data;
  });

  public setConfig(config: ClockCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._data(this._config)}
        .schema=${this._schema(
          this.hass.localize,
          this._data(this._config)
            .clock_style as ClockCardConfig["clock_style"],
          this._data(this._config).ticks as ClockCardConfig["ticks"],
          this._data(this._config).show_seconds
        )}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: ClockCardValueChangedEvent): void {
    const config = ev.detail.value;

    if (!config.date_format || config.date_format.length === 0) {
      delete config.date_format;
    }

    if (config.time_format === "auto") {
      delete config.time_format;
    }

    if (config.clock_style === "analog") {
      config.border = config.border ?? false;
      config.ticks = config.ticks ?? "hour";
      config.face_style = config.face_style ?? "markers";
      if (config.show_seconds) {
        config.seconds_motion = config.seconds_motion ?? "continuous";
      } else {
        delete config.seconds_motion;
      }
    } else {
      delete config.border;
      delete config.ticks;
      delete config.face_style;
      delete config.seconds_motion;
    }

    if (config.ticks !== "none") {
      config.face_style = config.face_style ?? "markers";
    } else {
      delete config.face_style;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "title":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.title"
        );
      case "clock_style":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.clock_style`
        );
      case "clock_size":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.clock_size`
        );
      case "time_format":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.time_format`
        );
      case "time_zone":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.time_zone`
        );
      case "show_seconds":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.show_seconds`
        );
      case "no_background":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.no_background`
        );
      case "date_format":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.date.label`
        );
      case "border":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.border.label`
        );
      case "ticks":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.ticks.label`
        );
      case "seconds_motion":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.seconds_motion.label`
        );
      case "face_style":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.face_style.label`
        );
      default:
        return undefined;
    }
  };

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "date_format":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.date.description`
        );
      case "border":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.border.description`
        );
      case "ticks":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.ticks.description`
        );
      case "seconds_motion":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.seconds_motion.description`
        );
      case "face_style":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.clock.face_style.description`
        );
      default:
        return undefined;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-clock-card-editor": HuiClockCardEditor;
  }
}

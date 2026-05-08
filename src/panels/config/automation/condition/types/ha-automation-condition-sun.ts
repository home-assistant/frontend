import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/chart/state-history-chart-timeline";
import "../../../../../components/ha-form/ha-form";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import type {
  TimelineEntity,
  TimelineState,
} from "../../../../../data/history";
import type { SunCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { ConditionElement } from "../ha-automation-condition-row";

type FormType = "before" | "after" | "between";

const offsetToMs = (offset: unknown): number => {
  if (!offset && offset !== 0) return 0;
  if (typeof offset === "number") {
    return Number.isFinite(offset) ? offset * 1000 : 0;
  }
  const d = offset as {
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
  };
  const total =
    ((d.days ?? 0) * 86400 +
      (d.hours ?? 0) * 3600 +
      (d.minutes ?? 0) * 60 +
      (d.seconds ?? 0)) *
    1000;
  return Number.isFinite(total) ? total : 0;
};

const BEFORE_DEFAULT = "sunrise";
const AFTER_DEFAULT = "sunset";

@customElement("ha-automation-condition-sun")
export class HaSunCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: SunCondition;

  @property({ type: Boolean }) public disabled = false;

  @state() private _formType: FormType = "before";

  public connectedCallback() {
    super.connectedCallback();
    if (this.condition.before && this.condition.after) {
      this._formType = "between";
    } else if (this.condition.after) {
      this._formType = "after";
    }
  }

  public static get defaultConfig(): SunCondition {
    return { condition: "sun", before: BEFORE_DEFAULT };
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, formType: FormType) =>
      [
        ...(["between", "before"].includes(formType)
          ? [
              {
                name: "before",
                type: "select",
                default: BEFORE_DEFAULT,
                options: [
                  [
                    "sunrise",
                    localize(
                      "ui.panel.config.automation.editor.conditions.type.sun.sunrise"
                    ),
                  ],
                  [
                    "sunset",
                    localize(
                      "ui.panel.config.automation.editor.conditions.type.sun.sunset"
                    ),
                  ],
                ],
              },
              {
                name: "before_offset",
                selector: {
                  duration: {
                    allow_negative: true,
                  },
                },
              },
            ]
          : []),
        ...(["between", "after"].includes(formType)
          ? [
              {
                name: "after",
                type: "select",
                default: AFTER_DEFAULT,
                options: [
                  [
                    "sunrise",
                    localize(
                      "ui.panel.config.automation.editor.conditions.type.sun.sunrise"
                    ),
                  ],
                  [
                    "sunset",
                    localize(
                      "ui.panel.config.automation.editor.conditions.type.sun.sunset"
                    ),
                  ],
                ],
              },
              {
                name: "after_offset",
                selector: {
                  duration: {
                    allow_negative: true,
                  },
                },
              },
            ]
          : []),
      ] as const
  );

  protected render() {
    const schema = this._schema(this.hass.localize, this._formType);
    return html`
      <ha-select
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type_select"
        )}
        .value=${this._formType}
        @selected=${this._typeSelected}
        .options=${[
          {
            value: "before",
            label: this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.sun.before"
            ),
          },
          {
            value: "after",
            label: this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.sun.after"
            ),
          },
          {
            value: "between",
            label: this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.sun.between"
            ),
          },
        ]}
      >
      </ha-select>
      <ha-form
        .schema=${schema}
        .data=${this.condition}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      ${this._renderSunTimeline()}
    `;
  }

  private _buildTimelineData(
    sunState: (typeof this.hass.states)[string],
    sunrise: Date,
    sunset: Date,
    startOfDay: Date
  ): TimelineEntity[] {
    // Sun state
    const sunRow: TimelineEntity = {
      name: this.hass.localize(
        "ui.panel.config.automation.editor.triggers.type.sun.label"
      ),
      entity_id: "sun.sun",
      data: [
        {
          state: "below_horizon",
          state_localize: this.hass.formatEntityState(
            sunState,
            "below_horizon"
          ),
          last_changed: startOfDay.getTime(),
        },
        {
          state: "above_horizon",
          state_localize: this.hass.formatEntityState(
            sunState,
            "above_horizon"
          ),
          last_changed: sunrise.getTime(),
        },
        {
          state: "below_horizon",
          state_localize: this.hass.formatEntityState(
            sunState,
            "below_horizon"
          ),
          last_changed: sunset.getTime(),
        },
      ],
    };

    // Condition result
    const beforeEvent = this.condition.before === "sunrise" ? sunrise : sunset;
    const afterEvent = this.condition.after === "sunrise" ? sunrise : sunset;

    const beforeTime = this.condition.before
      ? new Date(
          beforeEvent.getTime() + offsetToMs(this.condition.before_offset)
        )
      : undefined;
    const afterTime = this.condition.after
      ? new Date(afterEvent.getTime() + offsetToMs(this.condition.after_offset))
      : undefined;

    const trueLocalize = this.hass.localize(
      "ui.panel.config.automation.editor.conditions.type.sun.condition_chart_true"
    );
    const falseLocalize = this.hass.localize(
      "ui.panel.config.automation.editor.conditions.type.sun.condition_chart_false"
    );

    const mkState = (isTrue: boolean, time: number): TimelineState => ({
      state: isTrue ? "on" : "off",
      state_localize: isTrue ? trueLocalize : falseLocalize,
      last_changed: time,
    });

    let conditionData: TimelineState[];
    if (this._formType === "before" && beforeTime) {
      conditionData = [
        mkState(true, startOfDay.getTime()),
        mkState(false, beforeTime.getTime()),
      ];
    } else if (this._formType === "after" && afterTime) {
      conditionData = [
        mkState(false, startOfDay.getTime()),
        mkState(true, afterTime.getTime()),
      ];
    } else if (this._formType === "between" && afterTime && beforeTime) {
      if (afterTime <= beforeTime) {
        conditionData = [
          mkState(false, startOfDay.getTime()),
          mkState(true, afterTime.getTime()),
          mkState(false, beforeTime.getTime()),
        ];
      } else {
        conditionData = [
          mkState(true, startOfDay.getTime()),
          mkState(false, beforeTime.getTime()),
          mkState(true, afterTime.getTime()),
        ];
      }
    } else {
      return [sunRow];
    }

    return [
      sunRow,
      {
        name: this.hass.localize(
          "ui.panel.config.automation.editor.conditions.condition"
        ),
        entity_id: "sun.condition",
        data: conditionData,
      },
    ];
  }

  private _renderSunTimeline() {
    const sunState = this.hass?.states["sun.sun"];
    if (!sunState?.attributes) return nothing;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const dayMs = 86400000;
    const endOfDay = new Date(startOfDay.getTime() + dayMs);

    //Today's window
    const intoToday = (iso: string): Date | null => {
      const base = new Date(iso);
      if (isNaN(base.getTime())) return null;
      let d = new Date(base);
      for (let i = 0; i < 3; i++) {
        if (d >= startOfDay && d < endOfDay) return d;
        d = new Date(d.getTime() + (d < startOfDay ? dayMs : -dayMs));
      }
      return null;
    };

    const sunrise = intoToday(sunState.attributes.next_rising as string);
    const sunset = intoToday(sunState.attributes.next_setting as string);
    if (!sunrise || !sunset) return nothing;

    const beforeEvent = this.condition.before === "sunrise" ? sunrise : sunset;
    const afterEvent = this.condition.after === "sunrise" ? sunrise : sunset;
    const beforeTime = this.condition.before
      ? new Date(
          beforeEvent.getTime() + offsetToMs(this.condition.before_offset)
        )
      : undefined;
    const afterTime = this.condition.after
      ? new Date(afterEvent.getTime() + offsetToMs(this.condition.after_offset))
      : undefined;

    const nowMs = now.getTime();
    let isTrue: boolean;
    switch (this._formType) {
      case "before":
        isTrue = beforeTime !== undefined && nowMs <= beforeTime.getTime();
        break;
      case "after":
        isTrue = afterTime !== undefined && nowMs >= afterTime.getTime();
        break;
      case "between":
        if (afterTime !== undefined && beforeTime !== undefined) {
          isTrue =
            afterTime <= beforeTime
              ? nowMs >= afterTime.getTime() && nowMs <= beforeTime.getTime()
              : nowMs <= beforeTime.getTime() || nowMs >= afterTime.getTime();
        } else {
          isTrue = false;
        }
        break;
    }

    const pad2 = (n: number) => String(n).padStart(2, "0");
    const fmtTime = (d: Date) =>
      `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

    // Inject a "sun.condition" entity so computeTimelineColor resolves
    // --state-sun-on/off-color for the condition row without
    // triggering the unavailable-color fallback.
    const hassWithCondition = {
      ...this.hass,
      states: {
        ...this.hass.states,
        "sun.condition": { ...sunState, entity_id: "sun.condition" },
      },
    };

    const timelineData = this._buildTimelineData(
      sunState,
      sunrise,
      sunset,
      startOfDay
    );

    return html`
      <div class="sun-preview">
        <state-history-chart-timeline
          .hass=${hassWithCondition}
          .data=${timelineData}
          .startTime=${startOfDay}
          .endTime=${endOfDay}
          show-names
          hide-reset-button
        ></state-history-chart-timeline>
        <div class="sun-legend">
          <span class="sun-legend-rise">
            <ha-icon icon="mdi:weather-sunset-up"></ha-icon>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.sun.sunrise"
            )}
            ${fmtTime(sunrise)}
          </span>
          <span class="sun-legend-set">
            <ha-icon icon="mdi:weather-sunset-down"></ha-icon>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.type.sun.sunset"
            )}
            ${fmtTime(sunset)}
          </span>
          <span class="sun-legend-status ${isTrue ? "true" : "false"}">
            <ha-icon
              icon=${isTrue ? "mdi:check-circle" : "mdi:close-circle"}
            ></ha-icon>
            ${isTrue
              ? this.hass.localize(
                  "ui.panel.config.automation.editor.conditions.type.sun.preview_currently_true"
                )
              : this.hass.localize(
                  "ui.panel.config.automation.editor.conditions.type.sun.preview_currently_false"
                )}
          </span>
        </div>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  private _computeLabelCallback = (schema: {
    name: "before" | "after";
  }): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.conditions.type.sun.${schema.name}`
    );

  private _typeSelected(ev: HaSelectSelectEvent): void {
    const value = ev.detail.value as FormType;
    this._formType = value;

    if (value === "after") {
      delete this.condition.before;
      delete this.condition.before_offset;
    } else if (!this.condition.before) {
      this.condition.before = BEFORE_DEFAULT;
    }

    if (value === "before") {
      delete this.condition.after;
      delete this.condition.after_offset;
    } else if (!this.condition.after) {
      this.condition.after = AFTER_DEFAULT;
    }
    fireEvent(this, "value-changed", { value: { ...this.condition } });
  }

  static styles = css`
    :host {
      --state-sun-on-color: var(--success-color);
      --state-sun-off-color: var(--error-color);
    }

    ha-select {
      display: block;
      margin-bottom: var(--ha-space-4);
    }

    .sun-preview {
      margin-top: var(--ha-space-4);
    }

    .sun-legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-4);
      margin-top: var(--ha-space-2);
      font-size: 12px;
      color: var(--secondary-text-color);
      align-items: center;
    }

    .sun-legend span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sun-legend ha-icon {
      --mdc-icon-size: 16px;
    }

    .sun-legend-rise ha-icon {
      color: var(--warning-color, #ffa726);
    }

    .sun-legend-set ha-icon {
      color: var(--info-color, #ff7043);
    }

    .sun-legend-status.true {
      color: var(--success-color, #4caf50);
      margin-inline-start: auto;
    }

    .sun-legend-status.false {
      color: var(--secondary-text-color);
      margin-inline-start: auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-sun": HaSunCondition;
  }
}

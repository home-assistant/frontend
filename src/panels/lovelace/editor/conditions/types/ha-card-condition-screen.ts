import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { getAllCombinations } from "../../../../../common/array/combinations";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import { HaFormSchema } from "../../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../../types";
import { ScreenCondition } from "../../../common/validate-condition";

const BREAKPOINT_VALUES = [0, 768, 1024, 1280, Infinity];
const BREAKPOINTS = ["mobile", "tablet", "desktop", "wide"] as const;

type BreakpointSize = [number, number];
type Breakpoint = (typeof BREAKPOINTS)[number];

function mergeConsecutiveRanges(arr: [number, number][]): [number, number][] {
  if (arr.length === 0) {
    return [];
  }

  [...arr].sort((a, b) => a[0] - b[0]);

  const mergedRanges = [arr[0]];

  for (let i = 1; i < arr.length; i++) {
    const currentRange = arr[i];
    const previousRange = mergedRanges[mergedRanges.length - 1];

    if (currentRange[0] <= previousRange[1] + 1) {
      previousRange[1] = currentRange[1];
    } else {
      mergedRanges.push(currentRange);
    }
  }

  return mergedRanges;
}

function buildMediaQuery(size: BreakpointSize) {
  const [min, max] = size;
  const query: string[] = [];
  if (min != null) {
    query.push(`(min-width: ${min}px)`);
  }
  if (max != null && max !== Infinity) {
    query.push(`(max-width: ${max - 1}px)`);
  }
  return query.join(" and ");
}

function computeBreakpointsSize(breakpoints: Breakpoint[]) {
  const sizes = breakpoints.map<BreakpointSize>((breakpoint) => {
    const index = BREAKPOINTS.indexOf(breakpoint);
    return [BREAKPOINT_VALUES[index], BREAKPOINT_VALUES[index + 1] || Infinity];
  });

  const mergedSizes = mergeConsecutiveRanges(sizes);

  const queries = mergedSizes
    .map((size) => buildMediaQuery(size))
    .filter((size) => size);

  return queries.join(", ");
}

function computeBreakpointsKey(breakpoints) {
  return [...breakpoints].sort().join("_");
}

// Compute all possible media queries from each breakpoints combination (2 ^ breakpoints = 16)
const queries = getAllCombinations(BREAKPOINTS as unknown as Breakpoint[])
  .filter((arr) => arr.length !== 0)
  .map(
    (breakpoints) =>
      [breakpoints, computeBreakpointsSize(breakpoints)] as [
        Breakpoint[],
        string,
      ]
  );

// Store them in maps to avoid recomputing them
const mediaQueryMap = new Map(
  queries.map(([b, m]) => [computeBreakpointsKey(b), m])
);
const mediaQueryReverseMap = new Map(queries.map(([b, m]) => [m, b]));

type ScreenConditionData = {
  breakpoints: Breakpoint[];
};

@customElement("ha-card-condition-screen")
export class HaCardConditionScreen extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: ScreenCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): ScreenCondition {
    return { condition: "screen", media_query: "" };
  }

  protected static validateUIConfig(
    condition: ScreenCondition,
    hass: HomeAssistant
  ) {
    const valid =
      !condition.media_query || mediaQueryReverseMap.has(condition.media_query);
    if (!valid) {
      throw new Error(
        hass.localize("ui.errors.config.media_query_not_supported")
      );
    }
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "breakpoints",
          selector: {
            select: {
              mode: "list",
              options: BREAKPOINTS.map((b) => {
                const value = BREAKPOINT_VALUES[BREAKPOINTS.indexOf(b)];
                return {
                  value: b,
                  label: `${localize(
                    `ui.panel.lovelace.editor.condition-editor.condition.screen.breakpoints_list.${b}`
                  )}${
                    value
                      ? ` (${localize(
                          `ui.panel.lovelace.editor.condition-editor.condition.screen.min`,
                          { size: value }
                        )})`
                      : ""
                  }`,
                };
              }),
              multiple: true,
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    const breakpoints = this.condition.media_query
      ? mediaQueryReverseMap.get(this.condition.media_query)
      : undefined;

    const data: ScreenConditionData = {
      breakpoints: breakpoints ?? [],
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(this.hass.localize)}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const data = ev.detail.value as ScreenConditionData;

    const { breakpoints } = data;

    const condition: ScreenCondition = {
      condition: "screen",
      media_query: mediaQueryMap.get(computeBreakpointsKey(breakpoints)) ?? "",
    };

    fireEvent(this, "value-changed", { value: condition });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "breakpoints":
        return this.hass.localize(
          `ui.panel.lovelace.editor.condition-editor.condition.screen.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-screen": HaCardConditionScreen;
  }
}

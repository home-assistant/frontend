import type { EChartsType } from "echarts/core";
import type { SunburstSeriesOption } from "echarts/types/dist/echarts";
import type { CallbackDataParams } from "echarts/types/src/util/types";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { getGraphColorByIndex } from "../../common/color/colors";
import { filterXSS } from "../../common/util/xss";
import type { ECOption } from "../../resources/echarts/echarts";
import type { HomeAssistant } from "../../types";
import "./ha-chart-base";

// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/consistent-type-imports
let SunburstChart: typeof import("echarts/lib/chart/sunburst/install");

export interface SunburstNode {
  id: string;
  label?: string;
  value: number;
  itemStyle?: {
    color?: string;
  };
  children?: SunburstNode[];
}

@customElement("ha-sunburst-chart")
export class HaSunburstChart extends LitElement {
  public hass!: HomeAssistant;

  @property({ attribute: false }) public data?: SunburstNode;

  @property({ type: String, attribute: false }) public valueFormatter?: (
    value: number
  ) => string;

  @property({ type: String, attribute: false }) public labelFormatter?: (
    id: string
  ) => string;

  public chart?: EChartsType;

  constructor() {
    super();
    if (!SunburstChart) {
      import("echarts/lib/chart/sunburst/install").then((module) => {
        SunburstChart = module;
        this.requestUpdate();
      });
    }
  }

  render() {
    if (!SunburstChart || !this.data) {
      return nothing;
    }

    const options = {
      tooltip: {
        trigger: "item",
        formatter: this._renderTooltip,
        appendTo: document.body,
      },
    } as ECOption;

    return html`<ha-chart-base
      .data=${this._createData(this.data)}
      .options=${options}
      height="100%"
      .extraComponents=${[SunburstChart]}
    ></ha-chart-base>`;
  }

  private _renderTooltip = (params: CallbackDataParams) => {
    const data = params.data as Record<string, any>;
    const value = this.valueFormatter
      ? this.valueFormatter(data.value)
      : data.value;
    const label = this.labelFormatter
      ? this.labelFormatter(data.name)
      : data.name;
    return `${params.marker} ${filterXSS(label)}<br>${value}`;
  };

  private _createData = memoizeOne(
    (data: SunburstNode): SunburstSeriesOption => {
      const computedStyles = getComputedStyle(this);

      // Transform to echarts format (uses 'name' instead of 'id')
      const transformNode = (
        node: SunburstNode,
        index: number,
        depth: number
      ) => {
        const result: Record<string, unknown> = {
          name: node.id, // echarts uses 'name' for identification
          value: node.value,
        };

        // Apply colors to first-level children only
        if (depth === 1) {
          result.itemStyle = {
            color: getGraphColorByIndex(index, computedStyles),
          };
        }

        if (node.children && node.children.length > 0) {
          result.children = node.children.map((child, i) =>
            transformNode(child, depth === 0 ? i : index, depth + 1)
          );
        }

        return result;
      };

      const transformedData = transformNode(data, 0, 0);

      return {
        type: "sunburst",
        data: (transformedData.children as Record<string, unknown>[]) || [
          transformedData,
        ],
        radius: [0, "95%"],
        sort: undefined, // Keep original order
        label: {
          rotate: "radial",
          minAngle: 15,
          formatter: (params) => {
            const name = (params.data as { name: string }).name;
            return this.labelFormatter ? this.labelFormatter(name) : name;
          },
        },
        itemStyle: {
          borderRadius: 4,
          borderWidth: 2,
          borderColor: "var(--card-background-color, #fff)",
        },
        levels: [
          {
            // Root level (center)
            r0: "0%",
            r: "15%",
            itemStyle: {
              color: "transparent",
            },
            label: {
              show: false,
            },
          },
          {
            // First level
            r0: "15%",
            r: "55%",
            label: {
              align: "center",
            },
          },
          {
            // Second level
            r0: "55%",
            r: "80%",
            label: {
              align: "center",
            },
          },
          {
            // Third level
            r0: "80%",
            r: "95%",
            label: {
              align: "center",
              position: "outside",
              padding: 3,
              silent: false,
            },
          },
        ],
        emphasis: {
          focus: "ancestor",
        },
      } as SunburstSeriesOption;
    }
  );

  static styles = css`
    :host {
      display: block;
      flex: 1;
    }
    ha-chart-base {
      width: 100%;
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sunburst-chart": HaSunburstChart;
  }
}

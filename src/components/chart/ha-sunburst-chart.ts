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
  name?: string;
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
    return `${params.marker} ${filterXSS(data.name)}<br>${value}`;
  };

  private _createData = memoizeOne(
    (data: SunburstNode): SunburstSeriesOption => {
      const computedStyles = getComputedStyle(this);

      // Transform to echarts format (uses 'name' instead of 'id')
      const transformNode = (
        node: SunburstNode,
        index: number,
        depth: number,
        parentColor?: string
      ) => {
        const result = {
          ...node,
          name: node.name || node.id,
        };

        if (depth > 0 && !node.itemStyle?.color) {
          // Don't assign color to root node
          result.itemStyle = {
            color: parentColor ?? getGraphColorByIndex(index, computedStyles),
          };
        }

        if (node.children && node.children.length > 0) {
          result.children = node.children.map((child, i) =>
            transformNode(child, i, depth + 1, result.itemStyle?.color)
          );
        }

        return result;
      };

      const transformedData = transformNode(data, 0, 0);

      return {
        type: "sunburst",
        data: transformedData.children || [transformedData],
        radius: [0, "90%"],
        sort: undefined, // Keep original order
        label: {
          show: false,
          align: "center",
          rotate: "radial",
          minAngle: 15,
          hideOverlap: true,
        },
        emphasis: {
          focus: "ancestor",
          label: {
            show: false,
          },
        },
        itemStyle: {
          borderRadius: 2,
        },
        levels: [
          {
            // Root level (center)
            r0: "0%",
            r: "15%",
            itemStyle: {
              color: "transparent",
            },
          },
          {
            // First level
            r0: "15%",
            r: "55%",
            label: { show: true },
          },
          {
            // Second level
            r0: "55%",
            r: "80%",
          },
          {
            // Third level
            r0: "80%",
            r: "95%",
          },
        ],
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

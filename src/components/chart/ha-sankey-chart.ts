import { customElement, property, state } from "lit/decorators";
import { LitElement, html, css } from "lit";
import type { EChartsType } from "echarts/core";
import type { CallbackDataParams } from "echarts/types/dist/shared";
import type { SankeySeriesOption } from "echarts/types/dist/echarts";
import { SankeyChart } from "echarts/charts";
import memoizeOne from "memoize-one";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { HomeAssistant } from "../../types";
import type { ECOption } from "../../resources/echarts";
import { measureTextWidth } from "../../util/text";
import "./ha-chart-base";
import { NODE_SIZE } from "../trace/hat-graph-const";
import "../ha-alert";

export interface Node {
  id: string;
  value: number;
  index: number; // like z-index but for x/y
  label?: string;
  tooltip?: string;
  color?: string;
  passThrough?: boolean;
}
export interface Link {
  source: string;
  target: string;
  value?: number;
}

export interface SankeyChartData {
  nodes: Node[];
  links: Link[];
}

type ProcessedLink = Link & {
  value: number;
};

const OVERFLOW_MARGIN = 5;
const FONT_SIZE = 12;
const NODE_GAP = 8;
const LABEL_DISTANCE = 5;

@customElement("ha-sankey-chart")
export class HaSankeyChart extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: SankeyChartData = {
    nodes: [],
    links: [],
  };

  @property({ type: Boolean }) public vertical = false;

  @property({ type: String, attribute: false }) public valueFormatter?: (
    value: number
  ) => string;

  public chart?: EChartsType;

  @state() private _sizeController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect,
  });

  render() {
    const options = {
      grid: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      tooltip: {
        trigger: "item",
        formatter: this._renderTooltip,
        appendTo: document.body,
      },
    } as ECOption;

    return html`<ha-chart-base
      .data=${this._createData(this.data, this._sizeController.value?.width)}
      .options=${options}
      height="100%"
      .extraComponents=${[SankeyChart]}
    ></ha-chart-base>`;
  }

  private _renderTooltip = (params: CallbackDataParams) => {
    const data = params.data as Record<string, any>;
    const value = this.valueFormatter
      ? this.valueFormatter(data.value)
      : data.value;
    if (data.id) {
      const node = this.data.nodes.find((n) => n.id === data.id);
      return `${params.marker} ${node?.label ?? data.id}<br>${value}`;
    }
    if (data.source && data.target) {
      const source = this.data.nodes.find((n) => n.id === data.source);
      const target = this.data.nodes.find((n) => n.id === data.target);
      return `${source?.label ?? data.source} → ${target?.label ?? data.target}<br>${value}`;
    }
    return null;
  };

  private _createData = memoizeOne((data: SankeyChartData, width = 0) => {
    const filteredNodes = data.nodes.filter((n) => n.value > 0);
    const indexes = [...new Set(filteredNodes.map((n) => n.index))];
    const links = this._processLinks(filteredNodes, data.links);
    const sectionWidth = width / indexes.length;
    const labelSpace = sectionWidth - NODE_SIZE - LABEL_DISTANCE;

    return {
      id: "sankey",
      type: "sankey",
      nodes: filteredNodes.map((node) => ({
        id: node.id,
        value: node.value,
        itemStyle: {
          color: node.color,
        },
        depth: node.index,
      })),
      links,
      draggable: false,
      orient: this.vertical ? "vertical" : "horizontal",
      nodeWidth: 15,
      nodeGap: NODE_GAP,
      lineStyle: {
        color: "gradient",
        opacity: 0.4,
      },
      layoutIterations: 0,
      label: {
        formatter: (params) =>
          data.nodes.find((node) => node.id === (params.data as Node).id)
            ?.label ?? (params.data as Node).id,
        position: this.vertical ? "bottom" : "right",
        distance: LABEL_DISTANCE,
        minMargin: 5,
        overflow: "break",
      },
      labelLayout: (params) => {
        if (this.vertical) {
          // reduce the label font size so the longest word fits on one line
          const longestWord = params.text
            .split(" ")
            .reduce(
              (longest, current) =>
                longest.length > current.length ? longest : current,
              ""
            );
          const wordWidth = measureTextWidth(longestWord, FONT_SIZE);
          const fontSize = Math.min(
            FONT_SIZE,
            (params.rect.width / wordWidth) * FONT_SIZE
          );
          return {
            fontSize: fontSize > 1 ? fontSize : 0,
            width: params.rect.width,
            align: "center",
          };
        }

        // estimate the number of lines after the label is wrapped
        // this is a very rough estimate, but it works for now
        const lineCount = Math.ceil(params.labelRect.width / labelSpace);
        // `overflow: "break"` allows the label to overflow outside its height, so we need to account for that
        const fontSize = Math.min(
          (params.rect.height / lineCount) * FONT_SIZE,
          FONT_SIZE
        );
        return {
          fontSize,
          lineHeight: fontSize,
          width: labelSpace,
          height: params.rect.height,
        };
      },
      top: this.vertical ? 0 : OVERFLOW_MARGIN,
      bottom: this.vertical ? 25 : OVERFLOW_MARGIN,
      left: this.vertical ? OVERFLOW_MARGIN : 0,
      right: this.vertical ? OVERFLOW_MARGIN : labelSpace + LABEL_DISTANCE,
      emphasis: {
        focus: "adjacency",
      },
    } as SankeySeriesOption;
  });

  private _processLinks(nodes: Node[], rawLinks: Link[]) {
    const accountedIn = new Map<string, number>();
    const accountedOut = new Map<string, number>();
    const links: ProcessedLink[] = [];
    rawLinks.forEach((link) => {
      const sourceNode = nodes.find((n) => n.id === link.source);
      const targetNode = nodes.find((n) => n.id === link.target);
      if (!sourceNode || !targetNode) {
        return;
      }
      const sourceAccounted = accountedOut.get(sourceNode.id) || 0;
      const targetAccounted = accountedIn.get(targetNode.id) || 0;

      // if no value is provided, we infer it from the remaining capacity of the source and target nodes
      const sourceRemaining = sourceNode.value - sourceAccounted;
      const targetRemaining = targetNode.value - targetAccounted;
      // ensure the value is not greater than the remaining capacity of the nodes
      const value = Math.min(
        link.value ?? sourceRemaining,
        sourceRemaining,
        targetRemaining
      );

      accountedIn.set(targetNode.id, targetAccounted + value);
      accountedOut.set(sourceNode.id, sourceAccounted + value);

      if (value > 0) {
        links.push({
          ...link,
          value,
        });
      }
    });
    return links;
  }

  static styles = css`
    :host {
      display: block;
      flex: 1;
      background: var(--ha-card-background, var(--card-background-color));
    }
    ha-chart-base {
      width: 100%;
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sankey-chart": HaSankeyChart;
  }
}

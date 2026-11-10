import type { EChartsType } from "echarts/core";
import type { GraphSeriesOption } from "echarts/charts";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators";

import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import { mdiFormatTextVariant, mdiGoogleCirclesGroup } from "@mdi/js";
import memoizeOne from "memoize-one";
import { consume } from "../../common/decorators/consume";
import { fireEvent } from "../../common/dom/fire_event";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../common/translations/localize";
import { reducedMotionContext } from "../../data/context";
import type { HaECOption } from "../../resources/echarts/echarts";
import "./ha-chart-base";
import type { HaChartBase } from "./ha-chart-base";
import { deepEqual } from "../../common/util/deep-equal";

export interface NetworkNode {
  id: string;
  name?: string;
  context?: string;
  category?: number;
  value?: number;
  symbolSize?: number;
  symbol?: string;
  itemStyle?: {
    color?: string;
    borderColor?: string;
    borderWidth?: number;
    opacity?: number;
  };
  label?: {
    position?: "left" | "right" | "top" | "bottom";
    show?: boolean;
    fontWeight?: "normal" | "bold";
    fontSize?: number;
    distance?: number;
  };
  /**
   * False for a node that does not get the dark border of a clicked node
   */
  selectable?: boolean;
  fixed?: boolean;
  /**
   * Distance from the center, where 0 is the center and 1 is the edge
   */
  polarDistance?: number;
  x?: number;
  y?: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  value?: number;
  reverseValue?: number;
  lineStyle?: {
    width?: number;
    color?: string;
    type?: "solid" | "dashed" | "dotted";
    opacity?: number;
  };
  symbolSize?: number | number[];
  symbol?: string;
  label?: {
    show?: boolean;
    formatter?: string;
  };
  ignoreForceLayout?: boolean;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
  categories?: { name: string; symbol: string }[];
}

const PHYSICS_DISABLE_THRESHOLD = 512;

const SELECTED_NODE_MAX_ZOOM = 2;

// Keeps neighbors clear of the search field, buttons and legend
const SELECTED_NODE_FIT_MARGIN = 72;

const FOLLOW_ROAM = "follow-selected-node";

// Every event of a change of the legend selection, each with the whole
// selection
const LEGEND_SELECT_EVENTS = [
  "legendselectchanged",
  "legendselected",
  "legendunselected",
  "legendselectall",
  "legendinverseselect",
];

const SELECTED_NODE_ANIMATION_DURATION = 800;

// A frame that takes longer, such as the first one after new data, advances
// the animation by at most this, so the acceleration is not skipped
const MAX_ANIMATION_FRAME_TIME = 1000 / 30;

// Zoom per pixel of wheel or pinch movement, as in exp(-pixels * speed)
const WHEEL_ZOOM_SPEED = 0.0025;
const PINCH_ZOOM_SPEED = 0.01;
const MAX_WHEEL_ZOOM_STEP = 1.5;
// Time constant in ms of the zoom easing towards its target
const WHEEL_ZOOM_TIME = 80;

// Fades along with the view moving to a selected node
const STYLE_FADE_DURATION = SELECTED_NODE_ANIMATION_DURATION;

const FADED_STYLE_PROPERTIES = [
  "opacity",
  "fill",
  "stroke",
  "lineWidth",
] as const;

const isColor = (value: unknown): value is string =>
  typeof value === "string" && value !== "none" && value !== "transparent";

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

type Displayable = ReturnType<
  ReturnType<EChartsType["getZr"]>["storage"]["getDisplayList"]
>[number];

type FadedStyle = Partial<
  Record<(typeof FADED_STYLE_PROPERTIES)[number], unknown>
>;

interface FollowRoam {
  dx: number;
  dy: number;
  zoom?: number;
  originX: number;
  originY: number;
}

// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/consistent-type-imports
let GraphChart: typeof import("echarts/lib/chart/graph/install");

@customElement("ha-network-graph")
export class HaNetworkGraph extends LitElement {
  public chart?: EChartsType;

  @property({ attribute: false }) public data!: NetworkData;

  @property({ attribute: false }) public tooltipFormatter?: (
    params: TopLevelFormatterParams
  ) => TemplateResult | typeof nothing | null;

  /**
   * Optional callback that returns additional searchable strings for a node.
   * These are matched against the search filter in addition to the node's name and context.
   */
  @property({ attribute: false }) public searchableAttributes?: (
    nodeId: string
  ) => string[];

  @property({ attribute: false }) public searchFilter = "";

  /**
   * Id of a node to highlight. The view centers on it, zoomed so its neighbors
   * stay visible, and follows it until the user moves the view.
   */
  @property({ attribute: false }) public selectedNode?: string;

  /**
   * Highlight the neighbors of a node on hover and fade the rest.
   */
  @property({ attribute: false }) public hoverFocus = true;

  /**
   * Distance in pixels from the center of a node within which a click next to
   * it still clicks the node, so small nodes are easier to hit. 0 is off.
   */
  @property({ attribute: false }) public nodeClickRadius = 0;

  /**
   * Place the nodes at the x and y of the data, without the force layout or
   * positions saved from it.
   */
  @property({ attribute: false }) public fixedLayout = false;

  /**
   * Names of the legend categories that are switched off. Keep it up to date
   * with `network-legend-changed`, or leave it out to let the legend keep its
   * own selection.
   */
  @property({ attribute: false }) public hiddenCategories?: string[];

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @state() private _highlightedNodes?: Set<string>;

  @state()
  @consume({ context: reducedMotionContext, subscribe: true })
  private _reducedMotion = false;

  @state() private _physicsEnabled?: boolean;

  @state() private _showLabels = true;

  private _nodePositions: Record<string, { x: number; y: number }> = {};

  private _followSelectedNode = false;

  private _followedChart?: EChartsType;

  private _selectAnimationFrame?: number;

  private _selectAnimationLastFrame?: number;

  private _selectAnimationElapsed = 0;

  private _selectAnimationEased = 0;

  private _previousStyles?: Map<Displayable, FadedStyle>;

  // The zoom factor the wheel asked for that is not applied yet
  private _pendingZoom = 1;

  private _zoomOrigin: [number, number] = [0, 0];

  private _zoomFrame?: number;

  private _zoomLastFrame?: number;

  @query("ha-chart-base") private _baseChart?: HaChartBase;

  constructor() {
    super();
    if (!GraphChart) {
      import("echarts/lib/chart/graph/install").then((module) => {
        GraphChart = module;
        this.requestUpdate();
      });
    }
    // Captured, before ECharts zooms in one step on every wheel event
    this.addEventListener("wheel", this._handleWheel, {
      capture: true,
      passive: false,
    });
  }

  private _handleWheel = (ev: WheelEvent) => {
    const chart = this._baseChart?.chart;
    if (
      !chart ||
      chart.isDisposed() ||
      this._reducedMotion ||
      !ev.composedPath().includes(chart.getDom())
    ) {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    const pixels =
      ev.deltaMode === WheelEvent.DOM_DELTA_LINE ? ev.deltaY * 16 : ev.deltaY;
    // A trackpad pinch sends many small deltas, a wheel a few large ones
    const factor = Math.exp(
      -pixels * (ev.ctrlKey ? PINCH_ZOOM_SPEED : WHEEL_ZOOM_SPEED)
    );
    this._pendingZoom *= Math.min(
      Math.max(factor, 1 / MAX_WHEEL_ZOOM_STEP),
      MAX_WHEEL_ZOOM_STEP
    );
    const rect = chart.getDom().getBoundingClientRect();
    this._zoomOrigin = [ev.clientX - rect.left, ev.clientY - rect.top];
    this._zoomFrame ??= requestAnimationFrame(this._animateZoom);
  };

  // Moves the zoom part of the way to the target each frame, so every wheel
  // step glides and quick steps add up
  private _animateZoom = (now: number) => {
    const chart = this._baseChart?.chart;
    const elapsed =
      this._zoomLastFrame === undefined
        ? MAX_ANIMATION_FRAME_TIME
        : Math.min(now - this._zoomLastFrame, MAX_ANIMATION_FRAME_TIME);
    this._zoomLastFrame = now;
    const remaining = Math.log(this._pendingZoom);
    const done = Math.abs(remaining) < 1e-3;
    const step = done
      ? this._pendingZoom
      : Math.exp(remaining * (1 - Math.exp(-elapsed / WHEEL_ZOOM_TIME)));
    this._pendingZoom /= step;
    if (chart && !chart.isDisposed()) {
      chart.dispatchAction({
        type: "graphRoam",
        seriesId: "network",
        zoom: step,
        originX: this._zoomOrigin[0],
        originY: this._zoomOrigin[1],
      });
    }
    if (done) {
      this._pendingZoom = 1;
      this._zoomFrame = undefined;
      this._zoomLastFrame = undefined;
      return;
    }
    this._zoomFrame = requestAnimationFrame(this._animateZoom);
  };

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (this._physicsEnabled === undefined && this.data?.nodes?.length > 1) {
      this._physicsEnabled =
        this.data.nodes.length <= PHYSICS_DISABLE_THRESHOLD;
    }
    if (changedProperties.has("data") && !this._reducedMotion) {
      this._previousStyles = this._getStyles();
    }
  }

  protected render() {
    if (!GraphChart || !this.data.nodes?.length) {
      return nothing;
    }

    const isMobile = window.matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;

    const hasHighlightedNodes =
      this._highlightedNodes && this._highlightedNodes.size > 0;

    return html`<ha-chart-base
      .data=${this._getSeries(
        this.data,
        !this.fixedLayout && (this._physicsEnabled ?? false),
        this._reducedMotion,
        this._showLabels,
        isMobile,
        hasHighlightedNodes,
        this.selectedNode,
        this.hoverFocus,
        this.fixedLayout
      )}
      .options=${this._createOptions(
        this.data?.categories,
        this.hiddenCategories
      )}
      height="100%"
      .extraComponents=${[GraphChart]}
      @chart-setup=${this._handleChartSetup}
    >
      <slot name="search" slot="search"></slot>
      <slot name="button" slot="button"></slot>
      ${
        this.fixedLayout
          ? nothing
          : html`<ha-icon-button
              slot="button"
              class=${this._physicsEnabled ? "active" : "inactive"}
              .path=${mdiGoogleCirclesGroup}
              @click=${this._togglePhysics}
              label=${this._localize(
                "ui.panel.config.common.graph.toggle_physics"
              )}
            ></ha-icon-button>`
      }
      <ha-icon-button
        slot="button"
        class=${this._showLabels ? "active" : "inactive"}
        .path=${mdiFormatTextVariant}
        @click=${this._toggleLabels}
        label=${this._localize("ui.panel.config.common.graph.toggle_labels")}
      ></ha-icon-button>
    </ha-chart-base>`;
  }

  private _createOptions = memoizeOne(
    (
      categories?: NetworkData["categories"],
      hiddenCategories?: string[]
    ): HaECOption => ({
      tooltip: {
        trigger: "item",
        confine: true,
        formatter: this.tooltipFormatter,
      },
      legend: {
        show: !!categories?.length,
        data: categories?.map((category) => ({
          ...category,
          icon: category.symbol,
        })),
        // Every category, as a category left out keeps its last selection
        ...(hiddenCategories && {
          selected: Object.fromEntries(
            (categories ?? []).map((category) => [
              category.name,
              !hiddenCategories.includes(category.name),
            ])
          ),
        }),
        bottom: 8,
      },
      dataZoom: {
        type: "inside",
        filterMode: "none",
      },
    }),
    deepEqual
  );

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    const previousStyles = this._previousStyles;
    if (previousStyles) {
      this._previousStyles = undefined;
      this._baseChart?.updateComplete.then(() =>
        this._animateStyleChanges(previousStyles)
      );
    }
    if (changedProperties.has("searchFilter")) {
      const filter = this.searchFilter;
      if (!filter) {
        this._highlightedNodes = undefined;
      } else {
        const lowerFilter = filter.toLowerCase();
        const matchingIds = new Set<string>();
        for (const node of this.data.nodes) {
          if (this._nodeMatchesFilter(node, lowerFilter)) {
            matchingIds.add(node.id);
          }
        }
        this._highlightedNodes = matchingIds;
      }
      this._applyHighlighting();
      this._updateMouseoverHandler();
    }
    if (changedProperties.has("selectedNode")) {
      this._followSelectedNode = !!this.selectedNode;
      this._stopSelectAnimation();
      if (this.selectedNode && !this._reducedMotion) {
        this._selectAnimationFrame = requestAnimationFrame(
          this._animateToSelectedNode
        );
      }
      this._updateFollowing();
    }
  }

  private _nodeMatchesFilter(node: NetworkNode, lowerFilter: string): boolean {
    if (node.name?.toLowerCase().includes(lowerFilter)) {
      return true;
    }
    if (node.context?.toLowerCase().includes(lowerFilter)) {
      return true;
    }
    if (node.id?.toLowerCase().includes(lowerFilter)) {
      return true;
    }
    if (this.searchableAttributes) {
      const extraValues = this.searchableAttributes(node.id);
      for (const value of extraValues) {
        if (value?.toLowerCase().includes(lowerFilter)) {
          return true;
        }
      }
    }
    return false;
  }

  private _getSeries = memoizeOne(
    (
      data: NetworkData,
      physicsEnabled: boolean,
      reducedMotion: boolean,
      showLabels: boolean,
      isMobile: boolean,
      hasHighlightedNodes?: boolean,
      selectedNode?: string,
      hoverFocus = true,
      fixedLayout = false
    ) => ({
      id: "network",
      type: "graph",
      layout: physicsEnabled ? "force" : "none",
      draggable: true,
      roam: true,
      roamTrigger: "global",
      selectedMode: "single",
      label: {
        show: showLabels,
        position: "right",
        formatter: (params: CallbackDataParams) => {
          const node = params.data as NetworkNode;
          if (node.context) {
            return `{primary|${node.name ?? ""}}\n{secondary|${node.context}}`;
          }
          return node.name ?? "";
        },
        rich: {
          // inherits the node label font, so a node can override it
          primary: {},
          secondary: {
            fontSize: 12,
            color: getComputedStyle(document.body).getPropertyValue(
              "--secondary-text-color"
            ),
            lineHeight: 16,
          },
        },
      },
      emphasis: {
        focus: hasHighlightedNodes
          ? "self"
          : isMobile || !hoverFocus
            ? "none"
            : "adjacency",
      },
      force: {
        repulsion: [400, 600],
        edgeLength: [200, 350],
        gravity: 0.05,
        layoutAnimation: !reducedMotion && data.nodes.length < 100,
      },
      edgeSymbol: ["none", "arrow"],
      edgeSymbolSize: 10,
      data: this._getSeriesData(
        data.nodes,
        data.links,
        fixedLayout ? {} : this._nodePositions,
        selectedNode
      ),
      links: data.links.map((link) => ({
        ...link,
        value: link.reverseValue
          ? Math.max(link.value ?? 0, link.reverseValue)
          : link.value,
        // remove arrow for bidirectional links
        symbolSize: link.reverseValue ? 1 : link.symbolSize, // 0 doesn't work
      })),
      categories: data.categories || [],
    }),
    deepEqual
  );

  private _getSeriesData = memoizeOne(
    (
      nodes: NetworkNode[],
      links: NetworkLink[],
      nodePositions: Record<string, { x: number; y: number }>,
      selectedNode?: string
    ) =>
      this._getPositionedNodes(nodes, links, nodePositions).map((node) => {
        const selected = node.id === selectedNode;
        return {
          id: node.id,
          name: node.name,
          context: node.context,
          category: node.category,
          value: node.value,
          symbolSize: node.symbolSize || 30,
          symbol: node.symbol || "circle",
          itemStyle: selected
            ? { ...node.itemStyle, borderWidth: 3 }
            : node.itemStyle || {},
          label: selected ? { ...node.label, fontWeight: "bold" } : node.label,
          select: node.selectable === false ? { disabled: true } : undefined,
          fixed: node.fixed,
          x: node.x,
          y: node.y,
        } as NonNullable<GraphSeriesOption["data"]>[number];
      }),
    deepEqual
  );

  private _getPositionedNodes(
    nodes: NetworkNode[],
    links: NetworkLink[],
    nodePositions: Record<string, { x: number; y: number }>
  ) {
    const containerWidth = this.clientWidth;
    const containerHeight = this.clientHeight;

    const positionedNodes: NetworkNode[] = nodes.map((node) => ({ ...node }));
    positionedNodes.forEach((node) => {
      if (nodePositions[node.id]) {
        node.x = nodePositions[node.id].x;
        node.y = nodePositions[node.id].y;
      }
      if (node.polarDistance === 0) {
        if (node.x == null && node.y == null) {
          node.x = containerWidth / 2;
          node.y = containerHeight / 2;
        }
        this._positionNodeNeighbors(
          node,
          positionedNodes,
          links,
          nodePositions
        );
      }
    });
    positionedNodes.forEach((node) => {
      // set positions for unconnected nodes
      if (node.polarDistance && node.x == null && node.y == null) {
        // set the position of the node at polarDistance from the center in a random direction
        const angle = Math.random() * 2 * Math.PI;
        node.x =
          ((Math.cos(angle) * containerWidth) / 2) * node.polarDistance +
          containerWidth / 2;
        node.y =
          ((Math.sin(angle) * containerHeight) / 2) * node.polarDistance +
          containerHeight / 2;
        // save the random position
        this._nodePositions[node.id] = {
          x: node.x,
          y: node.y,
        };
      }
    });
    return positionedNodes;
  }

  private _positionNodeNeighbors(
    node: NetworkNode,
    nodes: NetworkNode[],
    links: NetworkLink[],
    nodePositions: Record<string, { x: number; y: number }>,
    parentId?: string,
    minAngle = 0,
    maxAngle = Math.PI * 2
  ) {
    const neighbors = links
      .map((l) =>
        l.source === node.id && l.target !== parentId && !l.ignoreForceLayout
          ? nodes.find((n) => n.id === l.target)
          : l.target === node.id &&
              l.source !== parentId &&
              !l.ignoreForceLayout
            ? nodes.find((n) => n.id === l.source)
            : null
      )
      .filter(Boolean) as NetworkNode[];
    if (!neighbors.length) {
      return;
    }
    const angle = Math.abs(maxAngle - minAngle) / neighbors.length;
    const toContinue: { neighbor: NetworkNode; angle: number }[] = [];
    neighbors.forEach((neighbor, i) => {
      if (neighbor.x == null && neighbor.y == null) {
        const nodeAngle = minAngle + angle * i + angle / 2;
        toContinue.push({ neighbor, angle: nodeAngle });
        if (nodePositions[neighbor.id]) {
          neighbor.x = nodePositions[neighbor.id].x;
          neighbor.y = nodePositions[neighbor.id].y;
        } else {
          neighbor.x = node.x! + (Math.cos(nodeAngle) * this.clientWidth) / 4;
          neighbor.y = node.y! + (Math.sin(nodeAngle) * this.clientHeight) / 4;
        }
      }
    });
    toContinue.forEach(({ neighbor, angle: neighborAngle }) => {
      this._positionNodeNeighbors(
        neighbor,
        nodes,
        links,
        nodePositions,
        node.id,
        neighborAngle - Math.PI / 2,
        neighborAngle + Math.PI / 2
      );
    });
  }

  private _applyHighlighting() {
    const chart = this._baseChart?.chart;
    if (!chart) {
      return;
    }
    // Reset all nodes to normal opacity first
    chart.dispatchAction({ type: "downplay" });

    const highlighted = this._highlightedNodes;
    if (!highlighted || highlighted.size === 0) {
      return;
    }
    const dataIndices: number[] = [];
    this.data.nodes.forEach((node, index) => {
      if (highlighted.has(node.id)) {
        dataIndices.push(index);
      }
    });
    if (dataIndices.length > 0) {
      chart.dispatchAction({ type: "highlight", dataIndex: dataIndices });
    }
  }

  private _emphasisGuardHandler?: () => void;

  private _updateMouseoverHandler() {
    const chart = this._baseChart?.chart;
    if (!chart) {
      return;
    }

    // When there are highlighted nodes, re-apply highlighting on hover
    // and mouseout to prevent hover from overriding the search state
    if (this._highlightedNodes && this._highlightedNodes.size > 0) {
      if (this._emphasisGuardHandler) {
        // Guard already set
        return;
      }
      this._emphasisGuardHandler = () => {
        this._applyHighlighting();
      };
      chart.on("mouseover", this._emphasisGuardHandler);
      chart.on("mouseout", this._emphasisGuardHandler);
    } else {
      if (!this._emphasisGuardHandler) {
        return;
      }
      chart.off("mouseover", this._emphasisGuardHandler);
      chart.off("mouseout", this._emphasisGuardHandler);
      this._emphasisGuardHandler = undefined;
    }
  }

  private _handleChartSetup() {
    const chart = this._baseChart?.chart;
    chart?.getZr().on("click", this._handleEmptyClick);
    chart?.on("click", this._handleEdgeClick);
    for (const event of LEGEND_SELECT_EVENTS) {
      chart?.on(event, this._handleLegendChange);
    }
    this._updateFollowing();
  }

  private _handleLegendChange = (params: unknown) => {
    const { selected } = params as { selected: Record<string, boolean> };
    fireEvent(this, "network-legend-changed", {
      hidden: Object.keys(selected).filter((name) => !selected[name]),
    });
  };

  // A click next to a small node hits nothing, or a link that runs to its
  // center, so it clicks the nearest node within nodeClickRadius instead
  private _handleEmptyClick = (ev: {
    target?: unknown;
    offsetX: number;
    offsetY: number;
  }) => {
    if (!ev.target) {
      this._clickNearestNode(ev.offsetX, ev.offsetY);
    }
  };

  private _handleEdgeClick = (params: {
    dataType?: string;
    event?: { offsetX: number; offsetY: number };
  }) => {
    if (params.dataType === "edge" && params.event) {
      this._clickNearestNode(params.event.offsetX, params.event.offsetY);
    }
  };

  private _clickNearestNode(offsetX: number, offsetY: number) {
    const chart = this._baseChart?.chart;
    if (!this.nodeClickRadius || !chart || chart.isDisposed()) {
      return;
    }
    const series: any = chart
      // @ts-ignore private method but no other way to get the graph positions
      .getModel()
      .getSeriesByIndex(0);
    let nearest: { id: string; distance: number } | undefined;
    series?.getGraph().eachNode((node: any) => {
      const layout: number[] | undefined = node.getLayout();
      if (!layout) {
        return;
      }
      const [x, y] = chart.convertToPixel({ seriesId: "network" }, layout);
      const distance = Math.hypot(x - offsetX, y - offsetY);
      if (
        distance <= this.nodeClickRadius &&
        (!nearest || distance < nearest.distance)
      ) {
        nearest = { id: node.id, distance };
      }
    });
    if (nearest) {
      fireEvent(this, "chart-click", {
        dataType: "node",
        data: { id: nearest.id },
      } as unknown as HASSDomEvents["chart-click"]);
    }
  }

  private _updateFollowing() {
    const chart = this._followSelectedNode ? this._baseChart?.chart : undefined;
    if (chart !== this._followedChart) {
      const previous = this._followedChart;
      if (previous && !previous.isDisposed()) {
        previous.off("rendered", this._centerOnSelectedNode);
        previous.off("graphroam", this._handleGraphRoam);
        previous.getZr().off("drag", this._stopFollowing);
      }
      chart?.on("rendered", this._centerOnSelectedNode);
      chart?.on("graphroam", this._handleGraphRoam);
      chart?.getZr().on("drag", this._stopFollowing);
      this._followedChart = chart;
    }
    this._centerOnSelectedNode();
  }

  private _stopFollowing = () => {
    this._followSelectedNode = false;
    this._stopSelectAnimation();
    this._updateFollowing();
  };

  // Moves the view to a newly selected node in steps, so the user can follow
  // the change. The remaining distance is measured each frame, as the node can
  // still move.
  private _animateToSelectedNode = (now: number) => {
    if (this._selectAnimationLastFrame !== undefined) {
      this._selectAnimationElapsed += Math.min(
        now - this._selectAnimationLastFrame,
        MAX_ANIMATION_FRAME_TIME
      );
    }
    this._selectAnimationLastFrame = now;
    const progress = Math.min(
      1,
      this._selectAnimationElapsed / SELECTED_NODE_ANIMATION_DURATION
    );
    const eased = easeInOutCubic(progress);
    const fraction =
      progress >= 1
        ? 1
        : (eased - this._selectAnimationEased) /
          (1 - this._selectAnimationEased);
    this._selectAnimationEased = eased;
    const chart = this._followedChart;
    const roam = chart && this._selectedNodeRoam(chart);
    if (chart && roam) {
      const zoom = roam.zoom === undefined ? undefined : roam.zoom ** fraction;
      // The zoom around the center that follows the pan scales the node's
      // distance to the center, so the pan makes up for it
      const pan = 1 - (1 - fraction) / (zoom ?? 1);
      chart.dispatchAction({
        type: "graphRoam",
        from: FOLLOW_ROAM,
        seriesId: "network",
        dx: roam.dx * pan,
        dy: roam.dy * pan,
        zoom,
        originX: roam.originX,
        originY: roam.originY,
      });
    }
    if (progress < 1) {
      this._selectAnimationFrame = requestAnimationFrame(
        this._animateToSelectedNode
      );
    } else {
      this._stopSelectAnimation();
    }
  };

  private _stopSelectAnimation() {
    if (this._selectAnimationFrame !== undefined) {
      cancelAnimationFrame(this._selectAnimationFrame);
    }
    this._selectAnimationFrame = undefined;
    this._selectAnimationLastFrame = undefined;
    this._selectAnimationElapsed = 0;
    this._selectAnimationEased = 0;
  }

  // A roam dispatched while ECharts renders is queued, so a flag set around
  // dispatchAction would be cleared before the event fires
  private _handleGraphRoam = (ev: unknown) => {
    if ((ev as { from?: string }).from !== FOLLOW_ROAM) {
      this._stopFollowing();
    }
  };

  /**
   * The position of a node in pixels within the graph, or undefined when the
   * node is not drawn.
   */
  public getNodePosition(id: string): { x: number; y: number } | undefined {
    const chart = this._baseChart?.chart;
    if (!chart || chart.isDisposed()) {
      return undefined;
    }
    const series: any = chart
      // @ts-ignore private method but no other way to get the graph positions
      .getModel()
      .getSeriesByIndex(0);
    const position: number[] | undefined = series
      ?.getGraph()
      .getNodeById(id)
      ?.getLayout();
    if (!position) {
      return undefined;
    }
    const [x, y] = chart.convertToPixel({ seriesId: "network" }, position);
    return { x, y };
  }

  public hideTooltip(): void {
    const chart = this._baseChart?.chart;
    if (!chart || chart.isDisposed()) {
      return;
    }
    chart.dispatchAction({ type: "hideTip" });
    // A resize waits for running animations and shows the tooltip again, so
    // it is hidden once more when the chart has settled
    const hideWhenSettled = () => {
      chart.off("finished", hideWhenSettled);
      chart.dispatchAction({ type: "hideTip" });
    };
    chart.on("finished", hideWhenSettled);
  }

  private _getStyles(): Map<Displayable, FadedStyle> | undefined {
    const chart = this._baseChart?.chart;
    if (!chart || chart.isDisposed()) {
      return undefined;
    }
    return new Map(
      chart
        .getZr()
        .storage.getDisplayList(true)
        .map((el) => [el, this._fadedStyle(el)])
    );
  }

  private _fadedStyle(el: Displayable): FadedStyle {
    const style = el.style as Record<string, unknown>;
    return {
      opacity: style.opacity ?? 1,
      fill: style.fill,
      stroke: style.stroke,
      lineWidth: style.lineWidth ?? 0,
    };
  }

  // ECharts applies a new opacity or color at once, so a node or edge that
  // fades in or out would flash. Elements that stay are reused, so they can
  // be animated from their previous style.
  private _animateStyleChanges(previous: Map<Displayable, FadedStyle>) {
    const chart = this._baseChart?.chart;
    if (!chart || chart.isDisposed()) {
      return;
    }
    for (const el of chart.getZr().storage.getDisplayList(true)) {
      const from = previous.get(el);
      if (!from) {
        continue;
      }
      const to = this._fadedStyle(el);
      const start = { ...from };
      const end = { ...to };
      // A border that appears grows out of the fill, one that disappears
      // keeps its color while it thins out
      let restoreStroke = false;
      if (!isColor(start.stroke) && isColor(end.stroke)) {
        start.stroke = start.fill;
      } else if (isColor(start.stroke) && !isColor(end.stroke)) {
        restoreStroke = true;
        end.stroke = start.stroke;
      }
      const changed = FADED_STYLE_PROPERTIES.filter(
        (key) =>
          // Only colors can be animated, not gradients or patterns
          typeof start[key] === typeof end[key] &&
          typeof end[key] !== "object" &&
          start[key] !== end[key]
      );
      if (!changed.length) {
        continue;
      }
      el.setStyle(Object.fromEntries(changed.map((key) => [key, start[key]])));
      el.animateTo(
        {
          style: Object.fromEntries(changed.map((key) => [key, end[key]])),
        },
        {
          duration: STYLE_FADE_DURATION,
          easing: "cubicInOut",
          done: restoreStroke
            ? () => el.setStyle({ stroke: to.stroke })
            : undefined,
        }
      );
    }
  }

  private _centerOnSelectedNode = () => {
    const chart = this._followedChart;
    // While the view moves to a new node, the animation follows it
    if (!chart || this._selectAnimationFrame !== undefined) {
      return;
    }
    const roam = this._selectedNodeRoam(chart);
    if (roam) {
      chart.dispatchAction({
        type: "graphRoam",
        from: FOLLOW_ROAM,
        seriesId: "network",
        ...roam,
      });
    }
  };

  // The roam that centers the selected node, zoomed so its neighbors stay in
  // view, or undefined when it is centered already
  private _selectedNodeRoam(chart: EChartsType): FollowRoam | undefined {
    const series: any = chart
      // @ts-ignore private method but no other way to get the graph positions
      .getModel()
      .getSeriesByIndex(0);
    const node = series?.getGraph().getNodeById(this.selectedNode);
    const position: number[] | undefined = node?.getLayout();
    if (!position) {
      return undefined;
    }
    const toPixel = (point: number[]) =>
      chart.convertToPixel({ seriesId: "network" }, point);
    const [x, y] = toPixel(position);
    const zoom = series.coordinateSystem.getRoamTransform()[0];
    const centerX = chart.getWidth() / 2;
    const centerY = chart.getHeight() / 2;
    // Zoom so the neighbors stay in view
    const fitX = Math.max(centerX - SELECTED_NODE_FIT_MARGIN, centerX / 2);
    const fitY = Math.max(centerY - SELECTED_NODE_FIT_MARGIN, centerY / 2);
    let targetZoom = SELECTED_NODE_MAX_ZOOM;
    for (const edge of node.edges) {
      const neighbor: number[] | undefined = (
        edge.node1 === node ? edge.node2 : edge.node1
      ).getLayout();
      if (neighbor) {
        const [neighborX, neighborY] = toPixel(neighbor);
        targetZoom = Math.min(
          targetZoom,
          (zoom * fitX) / Math.abs(neighborX - x),
          (zoom * fitY) / Math.abs(neighborY - y)
        );
      }
    }
    const zoomChanged = Math.abs(zoom - targetZoom) >= 1e-3;
    if (
      !zoomChanged &&
      Math.abs(centerX - x) < 0.5 &&
      Math.abs(centerY - y) < 0.5
    ) {
      return undefined;
    }
    return {
      dx: centerX - x,
      dy: centerY - y,
      // Any zoom, even 1, rescales every node and edge
      zoom: zoomChanged ? targetZoom / zoom : undefined,
      originX: centerX,
      originY: centerY,
    };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopSelectAnimation();
    if (this._zoomFrame !== undefined) {
      cancelAnimationFrame(this._zoomFrame);
      this._zoomFrame = undefined;
      this._zoomLastFrame = undefined;
      this._pendingZoom = 1;
    }
    if (this._emphasisGuardHandler) {
      this._baseChart?.chart?.off("mouseover", this._emphasisGuardHandler);
      this._baseChart?.chart?.off("mouseout", this._emphasisGuardHandler);
      this._emphasisGuardHandler = undefined;
    }
  }

  private _togglePhysics() {
    this._saveNodePositions();
    this._physicsEnabled = !this._physicsEnabled;
  }

  private _toggleLabels() {
    this._showLabels = !this._showLabels;
  }

  private _saveNodePositions() {
    const positions = {};
    if (this._baseChart?.chart) {
      this._baseChart.chart
        // @ts-ignore private method but no other way to get the graph positions
        .getModel()
        .getSeriesByIndex(0)
        .getGraph()
        .eachNode((node: any) => {
          const layout = node.getLayout();
          if (layout) {
            positions[node.id] = {
              x: layout[0],
              y: layout[1],
            };
          }
        });
    }
    this._nodePositions = positions;
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
    }
    ha-chart-base {
      height: 100%;
      --chart-max-height: 100%;
    }

    ha-icon-button,
    ::slotted(ha-icon-button) {
      margin-inline-end: var(--ha-space-3);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-network-graph": HaNetworkGraph;
  }
  interface HASSDomEvents {
    "node-selected": { id: string };
    // The names of the legend categories that are switched off
    "network-legend-changed": { hidden: string[] };
  }
}

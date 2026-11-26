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

const LAYOUT_ANIMATION_THRESHOLD = 100;

// Every event of a change of the legend selection, each with the whole
// selection
const LEGEND_SELECT_EVENTS = [
  "legendselectchanged",
  "legendselected",
  "legendunselected",
  "legendselectall",
  "legendinverseselect",
];

const SELECTED_NODE_MAX_ZOOM = 2;

// Keeps neighbors clear of the search field, buttons and legend
const SELECTED_NODE_FIT_MARGIN = 72;

// In a fixed layout, the place of the selected node as a part of the width,
// and the room for the labels of the neighbors to its right
const FIXED_LAYOUT_SELECTED_NODE_X = 0.25;
const FIXED_LAYOUT_LABEL_ROOM = 240;

// The place of a selected node in a fixed layout that moved left to make room
// for its label
const FIXED_LAYOUT_MIN_SELECTED_NODE_X = 32;

// The room between the children of a selected node in a fixed layout and the
// least distance for their labels, also when they then no longer fit, e.g.
// many devices of a source on a phone
const FIXED_LAYOUT_CHILD_SPACING = 8;
const FIXED_LAYOUT_MIN_CHILD_GAP = 24;

const FOLLOW_ROAM = "follow-selected-node";

const SELECTED_NODE_ANIMATION_DURATION = 800;

// The nodes of another layout move for at most this many ms
const LAYOUT_ANIMATION_TIMEOUT = 1000;

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
   * positions saved from it. The layout is taken to grow to the right, like a
   * tree, so the selected node is kept left with room for its children.
   */
  @property({ attribute: false }) public fixedLayout = false;

  /**
   * Fade colors and borders when the data changes. Off for graphs that update
   * often, whose nodes and links would be fading most of the time.
   */
  @property({ attribute: false }) public animateStyleChanges = false;

  /**
   * Glide the wheel and pinch zoom, and the move of the view to a newly
   * selected node, instead of changing the view at once.
   */
  @property({ attribute: false }) public animateViewChanges = false;

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

  // Without the force layout until the nodes moved back to their positions in
  // it, as the first step of the force layout stops their animation
  @state() private _settlingLayout = false;

  // Not reactive: a new series option starts the layout again, so a drop only
  // reaches the option with the next render
  private _nodePositions: Record<string, { x: number; y: number }> = {};

  // Dragged nodes stay where they are dropped, the force layout moves the others
  private _pinnedNodes: string[] = [];

  // Names of the legend categories that are switched off. Not reactive: the
  // legend lays the graph out itself, only the layout animation threshold
  // needs a render
  private _hiddenCategories: string[] = [];

  private _dragNode?: string;

  private _dragMoved = false;

  private _dragTarget?: Displayable;

  private _followSelectedNode = false;

  private _followedChart?: EChartsType;

  private _selectAnimationFrame?: number;

  private _stopWaitingForLayout?: () => void;

  // How the force layout first showed its nodes, from layout to pixels, which
  // the view goes back to after the fixed layout
  private _initialForceView?: { scale: number; x: number; y: number };

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
      !this.animateViewChanges ||
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
      ev.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? ev.deltaY * chart.getHeight()
        : ev.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? ev.deltaY * 16
          : ev.deltaY;
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

  // A wheel zoom that is still gliding would undo a reset
  private _stopZoomAnimation() {
    if (this._zoomFrame !== undefined) {
      cancelAnimationFrame(this._zoomFrame);
    }
    this._zoomFrame = undefined;
    this._zoomLastFrame = undefined;
    this._pendingZoom = 1;
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (this._physicsEnabled === undefined && this.data?.nodes?.length > 1) {
      this._physicsEnabled =
        this.data.nodes.length <= PHYSICS_DISABLE_THRESHOLD;
    }
    if (
      changedProperties.has("data") &&
      this.animateStyleChanges &&
      !this._reducedMotion
    ) {
      this._previousStyles = this._getStyles();
    }
    // Before the first render, which counts the visible nodes
    if (changedProperties.has("hiddenCategories") && this.hiddenCategories) {
      this._hiddenCategories = this.hiddenCategories;
    }
    if (changedProperties.get("fixedLayout") !== undefined) {
      if (this.fixedLayout) {
        // The force layout comes back from here
        this._saveNodePositions();
      } else if (!this._reducedMotion) {
        this._settlingLayout = true;
      }
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
        !this.fixedLayout &&
          !this._settlingLayout &&
          (this._physicsEnabled ?? false),
        this._reducedMotion,
        this._showLabels,
        isMobile,
        hasHighlightedNodes,
        this.selectedNode,
        this.hoverFocus,
        this.fixedLayout,
        this._nodePositions,
        this._pinnedNodes,
        this._fewVisibleNodes()
      )}
      .options=${this._createOptions(
        this.data?.categories,
        this.hiddenCategories
      )}
      height="100%"
      .extraComponents=${[GraphChart]}
      @chart-setup=${this._handleChartSetup}
      @chart-zoom-reset=${this._stopZoomAnimation}
    >
      <slot name="search" slot="search"></slot>
      <slot name="button" slot="button"></slot>
      ${
        this.fixedLayout
          ? nothing
          : html`<ha-icon-button
              slot="button"
              class=${this._physicsEnabled ? "active" : "inactive"}
              .ariaPressed=${this._physicsEnabled ? "true" : "false"}
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
        .ariaPressed=${this._showLabels ? "true" : "false"}
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
    // Another layout moves every node, so the view moves along. A roam while
    // ECharts moves the nodes draws the edges at their end at once, so
    // following the selected node waits for the nodes.
    if (changedProperties.get("fixedLayout") !== undefined) {
      this._followSelectedNode = false;
      this._stopSelectAnimation();
      this._updateFollowing();
      this._baseChart?.updateComplete.then(() => {
        this._moveViewToLayout();
        this._afterLayoutAnimation(() => {
          this._settlingLayout = false;
          this._followSelectedNode = !!this.selectedNode;
          this._updateFollowing();
        });
      });
    } else if (changedProperties.has("selectedNode")) {
      this._moveToSelectedNode();
    }
  }

  private _moveToSelectedNode() {
    // A gliding wheel zoom counts as a roam of the user, which stops following
    this._stopZoomAnimation();
    this._followSelectedNode = !!this.selectedNode;
    this._stopSelectAnimation();
    if (this.selectedNode && this.animateViewChanges && !this._reducedMotion) {
      this._selectAnimationFrame = requestAnimationFrame(this._animateView);
    }
    this._updateFollowing();
  }

  private _afterLayoutAnimation(callback: () => void) {
    this._stopWaitingForLayout?.();
    const chart = this._baseChart?.chart;
    if (!chart || chart.isDisposed() || this._reducedMotion) {
      callback();
      return;
    }
    const done = () => {
      this._stopWaitingForLayout?.();
      callback();
    };
    const timeout = window.setTimeout(done, LAYOUT_ANIMATION_TIMEOUT);
    chart.on("finished", done);
    this._stopWaitingForLayout = () => {
      clearTimeout(timeout);
      chart.off("finished", done);
      this._stopWaitingForLayout = undefined;
    };
  }

  // A new center and zoom of the series moves the view in the same animation
  // as the nodes, as ECharts animates the transform of the group they are in
  private _moveViewToLayout() {
    const chart = this._baseChart?.chart;
    const series = this._getGraphSeries(chart);
    const view = series?.coordinateSystem;
    const roam =
      chart &&
      !chart.isDisposed() &&
      view &&
      (this.selectedNode
        ? this._selectedNodeRoam(chart)
        : this._layoutRoam(chart));
    if (!roam) {
      return;
    }
    const zoom = roam.zoom ?? 1;
    const viewRect = view.getViewRect();
    const centerX = viewRect.x + viewRect.width / 2;
    const centerY = viewRect.y + viewRect.height / 2;
    // The point that the roam moves to the center
    const center = view.pointToData([
      (centerX - roam.originX) / zoom + roam.originX - roam.dx,
      (centerY - roam.originY) / zoom + roam.originY - roam.dy,
    ]);
    // The view keeps its zoom to itself, ECharts syncs it back to the option
    const currentZoom: number = series.get("zoom") ?? 1;
    chart.setOption({
      series: [{ id: "network", center, zoom: currentZoom * zoom }],
    });
  }

  private _viewTransform(chart: EChartsType) {
    const [x, y] = chart.convertToPixel({ seriesId: "network" }, [0, 0]);
    const [x1] = chart.convertToPixel({ seriesId: "network" }, [1, 0]);
    return { scale: x1 - x, x, y };
  }

  private _captureInitialForceView = () => {
    const chart = this._baseChart?.chart;
    // Not while the view moves after a switch from the fixed layout
    if (
      this._initialForceView ||
      this.fixedLayout ||
      this._settlingLayout ||
      this._stopWaitingForLayout ||
      this._selectAnimationFrame !== undefined ||
      !chart ||
      chart.isDisposed() ||
      !this._getGraphSeries(chart)?.forceLayout
    ) {
      return;
    }
    this._initialForceView = this._viewTransform(chart);
    chart.off("finished", this._captureInitialForceView);
  };

  // The roam to the view of the layout switched to: the whole fixed layout, or
  // the force layout as it first showed, as its nodes keep their positions.
  // Nodes shown since, e.g. of another legend category, may not fit in that.
  private _layoutRoam(chart: EChartsType): FollowRoam | undefined {
    const initial = this._initialForceView;
    const bounds = this._layoutBounds(chart);
    if (
      this.fixedLayout ||
      !initial ||
      !bounds ||
      initial.scale * bounds.left + initial.x < SELECTED_NODE_FIT_MARGIN ||
      initial.scale * bounds.top + initial.y < SELECTED_NODE_FIT_MARGIN ||
      initial.scale * bounds.right + initial.x >
        chart.getWidth() - SELECTED_NODE_FIT_MARGIN ||
      initial.scale * bounds.bottom + initial.y >
        chart.getHeight() - SELECTED_NODE_FIT_MARGIN
    ) {
      return this._fitRoam(chart);
    }
    const current = this._viewTransform(chart);
    const zoom = initial.scale / current.scale;
    const dx = initial.x - current.x;
    const dy = initial.y - current.y;
    const zoomChanged = Math.abs(zoom - 1) >= 1e-3;
    if (!zoomChanged && Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      return undefined;
    }
    return {
      dx,
      dy,
      zoom: zoomChanged ? zoom : undefined,
      originX: initial.x,
      originY: initial.y,
    };
  }

  // The layout bounds of the drawn nodes
  private _layoutBounds(chart: EChartsType) {
    const bounds = {
      left: Infinity,
      top: Infinity,
      right: -Infinity,
      bottom: -Infinity,
    };
    this._getGraphSeries(chart)
      ?.getGraph()
      .eachNode((node: any) => {
        const layout: number[] | undefined = node.getLayout();
        if (layout) {
          bounds.left = Math.min(bounds.left, layout[0]);
          bounds.right = Math.max(bounds.right, layout[0]);
          bounds.top = Math.min(bounds.top, layout[1]);
          bounds.bottom = Math.max(bounds.bottom, layout[1]);
        }
      });
    return bounds.left > bounds.right ? undefined : bounds;
  }

  // The roam that fits the nodes in the view, clear of the controls, or
  // undefined when they fit already. Without a roam ECharts fits a force
  // layout to where its nodes start, not to where they end up.
  private _fitRoam(chart: EChartsType): FollowRoam | undefined {
    const roam: number[] | undefined =
      this._getGraphSeries(chart)?.coordinateSystem?.getRoamTransform();
    const bounds = this._layoutBounds(chart);
    if (!roam || !bounds) {
      return undefined;
    }
    const [left, top] = chart.convertToPixel({ seriesId: "network" }, [
      bounds.left,
      bounds.top,
    ]);
    const [right, bottom] = chart.convertToPixel({ seriesId: "network" }, [
      bounds.right,
      bounds.bottom,
    ]);
    const width = chart.getWidth();
    const height = chart.getHeight();
    // A fixed layout grows to the right, so its labels need room there
    const rightRoom = this.fixedLayout
      ? FIXED_LAYOUT_LABEL_ROOM
      : SELECTED_NODE_FIT_MARGIN;
    const fitWidth = Math.max(
      width - SELECTED_NODE_FIT_MARGIN - rightRoom,
      width / 2
    );
    const fitHeight = Math.max(
      height - 2 * SELECTED_NODE_FIT_MARGIN,
      height / 2
    );
    const zoom = Math.min(
      fitWidth / (right - left),
      fitHeight / (bottom - top),
      SELECTED_NODE_MAX_ZOOM / roam[0]
    );
    const centerX = (SELECTED_NODE_FIT_MARGIN + width - rightRoom) / 2;
    const centerY = height / 2;
    const dx = centerX - (left + right) / 2;
    const dy = centerY - (top + bottom) / 2;
    const zoomChanged = Math.abs(zoom - 1) >= 1e-3;
    if (!zoomChanged && Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      return undefined;
    }
    return {
      dx,
      dy,
      zoom: zoomChanged ? zoom : undefined,
      originX: centerX,
      originY: centerY,
    };
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
      fixedLayout = false,
      nodePositions: Record<string, { x: number; y: number }> = {},
      pinnedNodes: string[] = [],
      fewVisibleNodes = true
    ) => ({
      id: "network",
      type: "graph",
      layout: physicsEnabled ? "force" : "none",
      // Nodes of a fixed layout keep their size, like the labels, so a zoom
      // spreads the rows instead of growing the nodes into each other
      nodeScaleRatio: fixedLayout ? 0 : 0.6,
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
        layoutAnimation: !reducedMotion && fewVisibleNodes,
      },
      edgeSymbol: ["none", "arrow"],
      edgeSymbolSize: 10,
      data: this._getSeriesData(
        data.nodes,
        data.links,
        fixedLayout ? {} : nodePositions,
        pinnedNodes,
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

  // The legend leaves the nodes of hidden categories out of the layout
  private _fewVisibleNodes() {
    const hidden = this._hiddenCategories;
    const visibleNodes = hidden.length
      ? this.data.nodes.filter(
          (node) =>
            node.category === undefined ||
            !hidden.includes(this.data.categories?.[node.category]?.name ?? "")
        ).length
      : this.data.nodes.length;
    return visibleNodes < LAYOUT_ANIMATION_THRESHOLD;
  }

  private _getSeriesData = memoizeOne(
    (
      nodes: NetworkNode[],
      links: NetworkLink[],
      nodePositions: Record<string, { x: number; y: number }>,
      pinnedNodes: string[],
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
          fixed: node.fixed || pinnedNodes.includes(node.id),
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

  // Fired for every drawn frame, so the page can place things next to nodes
  // while the graph moves, and stays idle when it does not
  private _handleRendered = () => {
    fireEvent(this, "network-graph-rendered");
  };

  private _handleChartSetup() {
    const chart = this._baseChart?.chart;
    chart?.getZr().on("click", this._handleEmptyClick);
    chart?.on("click", this._handleEdgeClick);
    chart?.on("mousedown", this._handleNodeMouseDown);
    chart?.getZr().on("dragstart", this._handleDragStart);
    chart?.getZr().on("drag", this._handleDrag);
    chart?.getZr().on("dragend", this._handleDragEnd);
    chart?.on("finished", this._captureInitialForceView);
    chart?.on("rendered", this._handleRendered);
    for (const event of LEGEND_SELECT_EVENTS) {
      chart?.on(event, this._handleLegendChange);
    }
    const legend = (
      chart?.getOption() as
        { legend?: { selected?: Record<string, boolean> }[] } | undefined
    )?.legend?.[0];
    this._setHiddenCategories(legend?.selected ?? {});
    // A recreated chart, e.g. after a theme change, lacks the drops since the
    // last render
    this.requestUpdate();
    this._updateFollowing();
  }

  private _handleLegendChange = (params: unknown) => {
    const { selected } = params as { selected: Record<string, boolean> };
    const fewVisibleNodes = this._fewVisibleNodes();
    this._setHiddenCategories(selected);
    if (this._fewVisibleNodes() !== fewVisibleNodes) {
      // The new series option lays out again from where the nodes are now.
      // The positions of a fixed layout would overwrite those of the force
      // layout.
      if (!this.fixedLayout) {
        this._saveNodePositions();
      }
      this.requestUpdate();
    }
    fireEvent(this, "network-legend-changed", {
      hidden: this._hiddenCategories,
    });
  };

  private _setHiddenCategories(selected: Record<string, boolean>) {
    this._hiddenCategories = Object.keys(selected).filter(
      (name) => !selected[name]
    );
  }

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
    const series = this._getGraphSeries(chart);
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

  private _handleNodeMouseDown = (params: {
    dataType?: string;
    data?: unknown;
  }) => {
    this._dragNode =
      params.dataType === "node" ? (params.data as NetworkNode).id : undefined;
    this._dragMoved = false;
  };

  // The dragged element gets the drag before the ECharts handler of its node
  private _handleDragStart = (ev: { target?: Displayable }) => {
    this._dragTarget?.off("drag", this._handleNodeDrag);
    this._dragTarget = ev.target;
    this._dragTarget?.on("drag", this._handleNodeDrag);
  };

  // Without layout animation, the ECharts handler runs the whole force layout
  // on every move, which puts the node back before it reads its position. So
  // the node moves here, and the other nodes stay where they are.
  private _handleNodeDrag = (ev: { cancelBubble?: boolean }) => {
    const chart = this._baseChart?.chart;
    const series = this._getGraphSeries(chart);
    const node =
      this._dragNode === undefined
        ? undefined
        : series?.getGraph().getNodeById(this._dragNode);
    if (
      !chart ||
      !node ||
      !series.forceLayout ||
      series.get(["force", "layoutAnimation"])
    ) {
      return;
    }
    ev.cancelBubble = true;
    const data = series.getData();
    const el = data.getItemGraphicEl(node.dataIndex);
    data.setItemLayout(node.dataIndex, [el.x, el.y]);
    // A new layout run starts from here, e.g. after a legend change
    if (series.preservedPoints) {
      series.preservedPoints[node.id] = [el.x, el.y];
    }
    series.forceLayout.setFixed(node.dataIndex);
    for (const edge of node.edges) {
      const source: number[] | undefined = edge.node1.getLayout();
      const target: number[] | undefined = edge.node2.getLayout();
      // The nodes of hidden legend categories have no layout
      if (source && target) {
        edge.setLayout([[...source], [...target]]);
      }
    }
    // @ts-ignore private method but no other way to draw the new layout
    chart.getViewOfSeriesModel(series).updateLayout(series);
    // The handlers of the chart miss the drag now
    chart.getZr().handler.trigger("drag", ev);
  };

  private _handleDrag = () => {
    this._dragMoved = true;
  };

  private _handleDragEnd = () => {
    const id = this._dragNode;
    const moved = this._dragMoved;
    this._dragNode = undefined;
    this._dragMoved = false;
    this._dragTarget?.off("drag", this._handleNodeDrag);
    this._dragTarget = undefined;
    // The positions of a fixed layout come from the data, not from the force
    // layout. A click also ends a drag, which releases a pinned node in ECharts
    if (
      this.fixedLayout ||
      !id ||
      (!moved && !this._pinnedNodes.includes(id))
    ) {
      return;
    }
    this._pinNodeInChart(id);
    if (!this._pinnedNodes.includes(id)) {
      this._pinnedNodes = [...this._pinnedNodes, id];
    }
    this._saveNodePositions();
  };

  // A new series option would start the layout again, so the pin goes into
  // the running force layout, and into the item option that ECharts lays out
  // from again, e.g. on a legend change
  private _pinNodeInChart(id: string) {
    const series = this._getGraphSeries();
    const node = series?.getGraph().getNodeById(id);
    if (!node) {
      return;
    }
    series.forceLayout?.setFixed(node.dataIndex);
    const [x, y] = node.getLayout();
    Object.assign(series.getData().getRawDataItem(node.dataIndex), {
      fixed: true,
      x,
      y,
    });
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
  private _animateView = (now: number) => {
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
      this._selectAnimationFrame = requestAnimationFrame(this._animateView);
      return;
    }
    this._stopSelectAnimation();
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
    const position: number[] | undefined = this._getGraphSeries(chart)
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

  private _symbolSize(node: any): number {
    const size = node.getVisual("symbolSize");
    return Array.isArray(size) ? size[1] : (size ?? 0);
  }

  // How far the shown label of a node reaches to the right of its center in
  // pixels, which does not change with a zoom
  private _labelReach(series: any, node: any): number | undefined {
    const symbolPath = series
      .getData()
      .getItemGraphicEl(node.dataIndex)
      ?.getSymbolPath?.();
    const label = symbolPath?.getTextContent?.();
    const center = symbolPath?.getComputedTransform?.();
    if (!label || label.ignore || !center) {
      return undefined;
    }
    const rect = label.getBoundingRect().clone();
    rect.applyTransform(label.getComputedTransform());
    return rect.x + rect.width - center[4];
  }

  // The roam that centers the selected node, zoomed so its neighbors stay in
  // view, or undefined when it is centered already
  private _selectedNodeRoam(chart: EChartsType): FollowRoam | undefined {
    const series = this._getGraphSeries(chart);
    const node = series?.getGraph().getNodeById(this.selectedNode);
    const position: number[] | undefined = node?.getLayout();
    if (!position) {
      return undefined;
    }
    const toPixel = (point: number[]) =>
      chart.convertToPixel({ seriesId: "network" }, point);
    const [x, y] = toPixel(position);
    const zoom = series.coordinateSystem.getRoamTransform()[0];
    const width = chart.getWidth();
    const neighbors: { x: number; y: number; size: number }[] = [];
    for (const edge of node.edges) {
      const neighborNode = edge.node1 === node ? edge.node2 : edge.node1;
      const neighbor: number[] | undefined = neighborNode.getLayout();
      if (neighbor) {
        const [neighborX, neighborY] = toPixel(neighbor);
        neighbors.push({
          x: neighborX,
          y: neighborY,
          size: this._symbolSize(neighborNode),
        });
      }
    }
    const children = neighbors.filter((neighbor) => neighbor.x > x);
    // In a fixed layout the label of the node gets room before its children,
    // as its nodes keep their size
    const labelReach =
      this.fixedLayout && children.length
        ? this._labelReach(series, node)
        : undefined;
    const labelRoom = labelReach
      ? labelReach +
        FIXED_LAYOUT_CHILD_SPACING +
        Math.max(...children.map((child) => child.size)) / 2
      : 0;
    // A fixed layout grows to the right, like a tree from left to right. Its
    // parents need not fit, so the node moves left to make room for its label.
    const anchorX = this.fixedLayout
      ? Math.max(
          FIXED_LAYOUT_MIN_SELECTED_NODE_X,
          Math.min(
            width * FIXED_LAYOUT_SELECTED_NODE_X,
            width - FIXED_LAYOUT_LABEL_ROOM - labelRoom
          )
        )
      : width / 2;
    const centerY = chart.getHeight() / 2;
    // Zoom so the neighbors stay in view
    const fitLeft = Math.max(anchorX - SELECTED_NODE_FIT_MARGIN, anchorX / 2);
    const rightRoom = width - anchorX;
    const fitRight = Math.max(
      rightRoom -
        (this.fixedLayout ? FIXED_LAYOUT_LABEL_ROOM : SELECTED_NODE_FIT_MARGIN),
      rightRoom / 2
    );
    const fitY = Math.max(centerY - SELECTED_NODE_FIT_MARGIN, centerY / 2);
    // The largest zoom that keeps the neighbors in view
    let fitZoom = Infinity;
    for (const neighbor of neighbors) {
      // In a fixed layout only the children to the right have to fit
      if (this.fixedLayout && neighbor.x <= x) {
        continue;
      }
      const fitX = neighbor.x > x ? fitRight : fitLeft;
      fitZoom = Math.min(
        fitZoom,
        (zoom * fitX) / Math.abs(neighbor.x - x),
        (zoom * fitY) / Math.abs(neighbor.y - y)
      );
    }
    let targetZoom = Math.min(SELECTED_NODE_MAX_ZOOM, fitZoom);
    if (labelRoom) {
      const childDistance = Math.min(...children.map((child) => child.x - x));
      targetZoom = Math.max(
        targetZoom,
        Math.min((zoom * labelRoom) / childDistance, fitZoom)
      );
    }
    // Many children rather go out of view than too close to read. Their nodes
    // keep their size, so only the gaps between them grow with the zoom.
    if (this.fixedLayout) {
      children.sort((a, b) => a.y - b.y);
      for (let i = 1; i < children.length; i++) {
        const gap = children[i].y - children[i - 1].y;
        const needed = Math.max(
          FIXED_LAYOUT_MIN_CHILD_GAP,
          (children[i].size + children[i - 1].size) / 2 +
            FIXED_LAYOUT_CHILD_SPACING
        );
        // Hidden nodes fold onto their parent
        if (gap >= 0.5) {
          targetZoom = Math.max(targetZoom, (zoom * needed) / gap);
        }
      }
    }
    const zoomChanged = Math.abs(zoom - targetZoom) >= 1e-3;
    if (
      !zoomChanged &&
      Math.abs(anchorX - x) < 0.5 &&
      Math.abs(centerY - y) < 0.5
    ) {
      return undefined;
    }
    return {
      dx: anchorX - x,
      dy: centerY - y,
      // Any zoom, even 1, rescales every node and edge
      zoom: zoomChanged ? targetZoom / zoom : undefined,
      originX: anchorX,
      originY: centerY,
    };
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopSelectAnimation();
    this._stopWaitingForLayout?.();
    // The layout no longer settles, so physics would stay off on return
    this._settlingLayout = false;
    this._stopZoomAnimation();
    if (this._emphasisGuardHandler) {
      this._baseChart?.chart?.off("mouseover", this._emphasisGuardHandler);
      this._baseChart?.chart?.off("mouseout", this._emphasisGuardHandler);
      this._emphasisGuardHandler = undefined;
    }
  }

  private _togglePhysics() {
    this._saveNodePositions();
    this._pinnedNodes = [];
    this._physicsEnabled = !this._physicsEnabled;
  }

  private _toggleLabels() {
    this._showLabels = !this._showLabels;
  }

  private _saveNodePositions() {
    // Nodes that are not drawn keep their earlier position
    const positions = { ...this._nodePositions };
    this._getGraphSeries()
      ?.getGraph()
      .eachNode((node: any) => {
        const layout = node.getLayout();
        if (layout) {
          positions[node.id] = {
            x: layout[0],
            y: layout[1],
          };
        }
      });
    this._nodePositions = positions;
  }

  private _getGraphSeries(chart = this._baseChart?.chart): any {
    if (!chart || chart.isDisposed()) {
      return undefined;
    }
    // @ts-ignore private method but no other way to get the graph
    return chart.getModel().getSeriesByIndex(0);
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
    ha-icon-button.inactive,
    ::slotted(ha-icon-button.inactive) {
      color: var(--state-inactive-color);
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
    "network-graph-rendered": undefined;
  }
}

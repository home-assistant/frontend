import {
  mdiAbTesting,
  mdiArrowDecision,
  mdiArrowUp,
  mdiAsterisk,
  mdiCallMissed,
  mdiCallReceived,
  mdiCallSplit,
  mdiCheckboxBlankOutline,
  mdiCheckboxMarkedOutline,
  mdiChevronDown,
  mdiChevronUp,
  mdiClose,
  mdiCodeBraces,
  mdiCodeBrackets,
  mdiFormatListNumbered,
  mdiRefresh,
  mdiRoomService,
  mdiShuffleDisabled,
} from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import type { PropertyValues } from "lit";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import type { Condition, Trigger } from "../../data/automation";
import type {
  ChooseAction,
  IfAction,
  ParallelAction,
  RepeatAction,
  SequenceAction,
  ServiceAction,
  WaitAction,
  WaitForTriggerAction,
} from "../../data/script";
import type { TraceExtended } from "../../data/trace";
import { TraceTree } from "../../data/trace-tree";
import type {
  NodeInfo,
  TraceActionNode,
  TraceNode,
} from "../../data/trace-tree";
import "../ha-icon-button";
import "../ha-service-icon";
import "./hat-graph-branch";
import { BRANCH_HEIGHT, NODE_SIZE, SPACING } from "./hat-graph-const";
import "./hat-graph-node";
import "./hat-graph-spacer";
import { ACTION_ICONS } from "../../data/action";

export type { NodeInfo };

declare global {
  interface HASSDomEvents {
    "graph-node-selected": NodeInfo;
  }
}

@customElement("hat-script-graph")
export class HatScriptGraph extends LitElement {
  @property({ attribute: false }) public trace!: TraceExtended;

  @property({ attribute: false }) public selected?: string;

  @query("hat-graph-node[active], hat-graph-branch[active]")
  private _activeNode?: HTMLElement;

  private _buildTree = memoizeOne(
    (trace: TraceExtended) => new TraceTree(trace)
  );

  public get renderedNodes(): Record<string, NodeInfo> {
    return this._buildTree(this.trace).renderedNodes;
  }

  public get trackedNodes(): Record<string, NodeInfo> {
    return this._buildTree(this.trace).trackedNodes;
  }

  private _selectNode(config: unknown, path: string, type?: NodeInfo["type"]) {
    return () => {
      fireEvent(this, "graph-node-selected", { config, path, type });
    };
  }

  private _renderTrigger(node: TraceNode<Trigger>) {
    const { config, path, track, hasTrace } = node;
    return html`
      <hat-graph-node
        graph-start
        ?track=${track}
        ?not-triggered=${node.notTriggered}
        @focus=${this._selectNode(config, path, "trigger")}
        ?active=${this.selected === path}
        .iconPath=${mdiAsterisk}
        .notEnabled=${node.disabled}
        .error=${node.error}
        tabindex=${hasTrace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private _typeRenderers = {
    condition: this._renderConditionNode,
    service: this._renderServiceNode,
    wait_template: this._renderWaitNode,
    wait_for_trigger: this._renderWaitNode,
    repeat: this._renderRepeatNode,
    choose: this._renderChooseNode,
    if: this._renderIfNode,
    sequence: this._renderSequenceNode,
    parallel: this._renderParallelNode,
    other: this._renderOtherNode,
  };

  private _renderActionNode(node: TraceActionNode, graphStart = false) {
    // The modern `action:` key has no dedicated renderer. The old
    // `key in node` lookup fell through to the generic node for it, so keep
    // that here for visual parity. The generic node still picks the service
    // icon through the node's action type.
    const type =
      "action" in node.config ? "other" : (node.actionType ?? "other");
    return (this._typeRenderers[type] ?? this._renderOtherNode).bind(this)(
      node,
      graphStart
    );
  }

  private _renderChooseNode(
    node: TraceActionNode<ChooseAction>,
    graphStart = false
  ) {
    const { config, path, track } = node;
    const defaultBranch = node.branches[node.branches.length - 1];
    return html`
      <hat-graph-branch
        tabindex=${node.hasTrace ? "0" : "-1"}
        @focus=${this._selectNode(config, path, "action")}
        ?track=${track}
        ?active=${this.selected === path}
        .notEnabled=${node.disabled}
      >
        <hat-graph-node
          .graphStart=${graphStart}
          .iconPath=${mdiArrowDecision}
          ?track=${track}
          ?active=${this.selected === path}
          .notEnabled=${node.disabled}
          .error=${node.error}
          slot="head"
          nofocus
        ></hat-graph-node>

        ${node.branches.slice(0, -1).map(
          (branch) => html`
            <div class="graph-container" ?track=${branch.hasTrace}>
              <hat-graph-node
                .iconPath=${
                  !track || branch.hasTrace
                    ? mdiCheckboxMarkedOutline
                    : mdiCheckboxBlankOutline
                }
                @focus=${this._selectNode(
                  branch.option,
                  branch.path,
                  "chooseOption"
                )}
                ?track=${branch.hasTrace}
                ?active=${this.selected === branch.path}
                .notEnabled=${branch.disabled}
              ></hat-graph-node>
              ${branch.children.map((action) => this._renderActionNode(action))}
            </div>
          `
        )}
        <div ?track=${defaultBranch.hasTrace}>
          <hat-graph-spacer ?track=${defaultBranch.hasTrace}></hat-graph-spacer>
          ${defaultBranch.children.map((action) =>
            this._renderActionNode(action)
          )}
        </div>
      </hat-graph-branch>
    `;
  }

  private _renderIfNode(node: TraceActionNode<IfAction>, graphStart = false) {
    const { config, path, track } = node;
    const [thenBranch, elseBranch] = node.branches;
    return html`
      <hat-graph-branch
        tabindex=${node.hasTrace ? "0" : "-1"}
        @focus=${this._selectNode(config, path, "action")}
        ?track=${track}
        ?active=${this.selected === path}
        .notEnabled=${node.disabled}
      >
        <hat-graph-node
          .graphStart=${graphStart}
          .iconPath=${mdiCallSplit}
          ?track=${track}
          ?active=${this.selected === path}
          .notEnabled=${node.disabled}
          slot="head"
          nofocus
        ></hat-graph-node>
        ${
          config.else
            ? html`<div class="graph-container" ?track=${elseBranch.hasTrace}>
                <hat-graph-node
                  .iconPath=${mdiCallMissed}
                  ?track=${elseBranch.hasTrace}
                  ?active=${this.selected === path}
                  .notEnabled=${elseBranch.disabled}
                  nofocus
                ></hat-graph-node
                >${elseBranch.children.map((action) =>
                  this._renderActionNode(action)
                )}
              </div>`
            : html`<hat-graph-spacer
                ?track=${elseBranch.hasTrace}
              ></hat-graph-spacer>`
        }
        <div class="graph-container" ?track=${thenBranch.hasTrace}>
          <hat-graph-node
            .iconPath=${mdiCallReceived}
            ?track=${thenBranch.hasTrace}
            ?active=${this.selected === path}
            .notEnabled=${thenBranch.disabled}
            nofocus
          ></hat-graph-node>
          ${thenBranch.children.map((action) => this._renderActionNode(action))}
        </div>
      </hat-graph-branch>
    `;
  }

  private _renderConditionNode(
    model: TraceNode<Condition>,
    graphStart = false
  ) {
    const { config: node, path, track, hasTrace } = model;
    const passed = model.condition?.passed ?? false;
    const failed = model.condition?.failed ?? false;
    return html`
      <hat-graph-branch
        @focus=${this._selectNode(node, path, "condition")}
        ?track=${track}
        ?active=${this.selected === path}
        .notEnabled=${model.disabled}
        tabindex=${hasTrace ? "0" : "-1"}
        short
      >
        <hat-graph-node
          .graphStart=${graphStart}
          slot="head"
          ?track=${track}
          ?active=${this.selected === path}
          .notEnabled=${model.disabled}
          .iconPath=${mdiAbTesting}
          nofocus
        ></hat-graph-node>
        <div
          style=${`width: ${NODE_SIZE + SPACING}px;`}
          graph-start
          graph-end
        ></div>
        <div ?track=${passed}></div>
        <hat-graph-node
          .iconPath=${mdiClose}
          nofocus
          ?track=${failed}
          ?active=${this.selected === path}
          .notEnabled=${model.disabled}
        ></hat-graph-node>
      </hat-graph-branch>
    `;
  }

  private _renderRepeatNode(
    model: TraceActionNode<RepeatAction>,
    graphStart = false
  ) {
    const { config: node, path, track } = model;
    const [branch] = model.branches;
    return html`
      <hat-graph-branch
        tabindex=${model.hasTrace ? "0" : "-1"}
        @focus=${this._selectNode(node, path, "action")}
        ?track=${track}
        ?active=${this.selected === path}
        .notEnabled=${model.disabled}
      >
        <hat-graph-node
          .graphStart=${graphStart}
          .iconPath=${mdiRefresh}
          ?track=${track}
          ?active=${this.selected === path}
          .notEnabled=${model.disabled}
          slot="head"
          nofocus
        ></hat-graph-node>
        <hat-graph-node
          .iconPath=${mdiArrowUp}
          ?track=${model.badge !== undefined}
          ?active=${this.selected === path}
          .notEnabled=${model.disabled}
          nofocus
          .badge=${model.badge}
        ></hat-graph-node>
        <div ?track=${model.hasTrace}>
          ${branch.children.map((action) => this._renderActionNode(action))}
        </div>
      </hat-graph-branch>
    `;
  }

  private _renderServiceNode(
    model: TraceActionNode<ServiceAction>,
    graphStart = false
  ) {
    const { config: node, path, track } = model;
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${node.action ? undefined : mdiRoomService}
        @focus=${this._selectNode(node, path, "action")}
        ?track=${track}
        ?active=${this.selected === path}
        .notEnabled=${model.disabled}
        .error=${model.error}
        tabindex=${model.hasTrace ? "0" : "-1"}
      >
        ${
          node.action
            ? html`<ha-service-icon
                slot="icon"
                .service=${node.action}
              ></ha-service-icon>`
            : nothing
        }
      </hat-graph-node>
    `;
  }

  private _renderWaitNode(
    model: TraceActionNode<WaitAction | WaitForTriggerAction>,
    graphStart = false
  ) {
    const { config: node, path, track } = model;
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${mdiCodeBraces}
        @focus=${this._selectNode(node, path, "action")}
        ?track=${track}
        ?active=${this.selected === path}
        .notEnabled=${model.disabled}
        .error=${model.error}
        tabindex=${model.hasTrace ? "0" : "-1"}
      ></hat-graph-node>
    `;
  }

  private _renderSequenceNode(
    model: TraceActionNode<SequenceAction>,
    graphStart = false
  ) {
    const { config: node, path, track } = model;
    const [branch] = model.branches;
    return html`
      <hat-graph-branch
        tabindex=${model.hasTrace ? "0" : "-1"}
        @focus=${this._selectNode(node, path, "action")}
        ?track=${track}
        ?active=${this.selected === path}
        .notEnabled=${model.disabled}
      >
        <div class="graph-container" ?track=${branch.hasTrace}>
          <hat-graph-node
            .graphStart=${graphStart}
            .iconPath=${mdiFormatListNumbered}
            ?track=${track}
            ?active=${this.selected === path}
            .notEnabled=${model.disabled}
            slot="head"
            nofocus
          ></hat-graph-node>
          ${branch.children.map((action) => this._renderActionNode(action))}
        </div>
      </hat-graph-branch>
    `;
  }

  private _renderParallelNode(
    model: TraceActionNode<ParallelAction>,
    graphStart = false
  ) {
    const { config: node, path, track } = model;
    return html`
      <hat-graph-branch
        tabindex=${model.hasTrace ? "0" : "-1"}
        @focus=${this._selectNode(node, path, "action")}
        ?track=${track}
        ?active=${this.selected === path}
        .notEnabled=${model.disabled}
      >
        <hat-graph-node
          .graphStart=${graphStart}
          .iconPath=${mdiShuffleDisabled}
          ?track=${track}
          ?active=${this.selected === path}
          .notEnabled=${model.disabled}
          slot="head"
          nofocus
        ></hat-graph-node>
        ${model.branches.map(
          (branch) =>
            html`<div ?track=${branch.hasTrace}>
              ${branch.children.map((sAction) =>
                this._renderActionNode(sAction)
              )}
            </div>`
        )}
      </hat-graph-branch>
    `;
  }

  private _renderOtherNode(model: TraceActionNode, graphStart = false) {
    const { config: node, path, track, actionType } = model;
    return html`
      <hat-graph-node
        .graphStart=${graphStart}
        .iconPath=${ACTION_ICONS[actionType] || mdiCodeBrackets}
        @focus=${this._selectNode(node, path, "action")}
        ?track=${track}
        ?active=${this.selected === path}
        .error=${model.error}
        .notEnabled=${model.disabled}
      ></hat-graph-node>
    `;
  }

  protected render() {
    try {
      const tree = this._buildTree(this.trace);
      const paths = tree.trackedPaths;
      const triggerNodes = tree.triggers?.map((node) =>
        this._renderTrigger(node)
      );
      return html`
        <div class="graph-scroll ha-scrollbar">
          <div class="parent graph-container">
            ${
              triggerNodes
                ? html`<hat-graph-branch
                    start
                    .short=${triggerNodes.length < 2}
                  >
                    ${triggerNodes}
                  </hat-graph-branch>`
                : ""
            }
            ${tree.conditions.map((node) => this._renderConditionNode(node))}
            ${tree.actions.map((node) => this._renderActionNode(node))}
            ${tree.sequence.map((node, i) =>
              this._renderActionNode(node, i === 0)
            )}
          </div>
        </div>
        <div class="actions">
          <ha-icon-button
            .disabled=${paths.length === 0 || paths[0] === this.selected}
            @click=${this._previousTrackedNode}
            .path=${mdiChevronUp}
          ></ha-icon-button>
          <ha-icon-button
            .disabled=${
              paths.length === 0 || paths[paths.length - 1] === this.selected
            }
            @click=${this._nextTrackedNode}
            .path=${mdiChevronDown}
          ></ha-icon-button>
        </div>
      `;
    } catch (err: any) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("Error creating script graph:", err);
      }
      return html`
        <div class="error">
          Error rendering graph. Please download trace and share with the
          developers.
        </div>
      `;
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);

    if (!changedProps.has("trace") && !changedProps.has("selected")) {
      return;
    }

    // Scroll to active node when selection changes
    if (changedProps.has("selected")) {
      this._activeNode?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    if (!changedProps.has("trace")) {
      return;
    }

    // If trace changed and we have no or an invalid selection, select first option.
    const tree = this._buildTree(this.trace);
    if (!this.selected || !tree.trackedNodes[this.selected]) {
      const firstNode = tree.firstTracked;
      if (firstNode) {
        fireEvent(this, "graph-node-selected", firstNode);
      }
    }
  }

  private _previousTrackedNode() {
    const prev = this._buildTree(this.trace).previousTracked(this.selected!);
    if (prev) {
      fireEvent(this, "graph-node-selected", prev);
    }
  }

  private _nextTrackedNode() {
    const next = this._buildTree(this.trace).nextTracked(this.selected!);
    if (next) {
      fireEvent(this, "graph-node-selected", next);
    }
  }

  static get styles() {
    return css`
      :host {
        display: grid;
        overflow: hidden;
        position: relative;
        --stroke-clr: var(--stroke-color, var(--secondary-text-color));
        --active-clr: var(--active-color, var(--primary-color));
        --track-clr: var(--track-color, var(--accent-color));
        --hover-clr: var(--hover-color, var(--primary-color));
        --disabled-clr: var(--disabled-color, var(--disabled-text-color));
        --disabled-active-clr: rgba(var(--rgb-primary-color), 0.5);
        --disabled-hover-clr: rgba(var(--rgb-primary-color), 0.7);
        --default-trigger-color: 3, 169, 244;
        --rgb-trigger-color: var(--trigger-color, var(--default-trigger-color));
        --background-clr: var(--background-color, white);
        --default-icon-clr: var(--icon-color, black);
        --icon-clr: var(--stroke-clr);

        --hat-graph-spacing: ${SPACING}px;
        --hat-graph-node-size: ${NODE_SIZE}px;
        --hat-graph-branch-height: ${BRANCH_HEIGHT}px;
      }
      .graph-scroll {
        grid-area: 1 / 1;
        overflow: auto;
        min-width: 0;
        min-height: 0;
      }
      .graph-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: fit-content;
      }
      .actions {
        display: flex;
        flex-direction: column;
        grid-area: 1 / 1;
        justify-self: end;
        align-self: start;
        margin-top: var(--ha-space-2);
        margin-inline-end: var(--ha-space-5);
        z-index: 1;
        background-color: color-mix(
          in srgb,
          var(--card-background-color) 70%,
          transparent
        );
        backdrop-filter: blur(8px);
        border-radius: var(--ha-border-radius-pill);
      }
      .parent {
        margin-left: 8px;
        margin-top: 16px;
      }
      .error {
        padding: 16px;
        max-width: 300px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-script-graph": HatScriptGraph;
  }
}

import {
  mdiCallSplit,
  mdiAbTesting,
  mdiCheck,
  mdiClose,
  mdiChevronRight,
  mdiExclamation,
  mdiTimerOutline,
  mdiTrafficLight,
  mdiRefresh,
  mdiArrowUp,
  mdiCodeJson,
  mdiCheckBoxOutline,
  mdiCheckboxBlankOutline,
  mdiAsterisk,
} from "@mdi/js";
import memoizeOne from "memoize-one";
import { Condition } from "../../data/automation";
import { Action, ChooseAction, RepeatAction } from "../../data/script";
import {
  ActionTrace,
  AutomationTraceExtended,
  ChooseActionTrace,
  ChooseChoiceActionTrace,
  ConditionTrace,
} from "../../data/trace";

import { NodeInfo, TreeNode } from "./hat-graph";

const ICONS = {
  new: mdiAsterisk,
  service: mdiChevronRight,
  condition: mdiAbTesting,
  TRUE: mdiCheck,
  FALSE: mdiClose,
  delay: mdiTimerOutline,
  wait_template: mdiTrafficLight,
  event: mdiExclamation,
  repeat: mdiRefresh,
  repeatReturn: mdiArrowUp,
  choose: mdiCallSplit,
  chooseChoice: mdiCheckBoxOutline,
  chooseDefault: mdiCheckboxBlankOutline,
  YAML: mdiCodeJson,
};

const OPTIONS = [
  "condition",
  "delay",
  "device_id",
  "event",
  "scene",
  "service",
  "wait_template",
  "repeat",
  "choose",
];

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface NoAction {}

// const cmpLists = (a: Array<unknown>, b: Array<unknown>) =>
//   a.length === b.length && a.every((itm, idx) => b[idx] === itm);

const TRACE_ACTION_PREFIX = "action/";

export class ActionHandler {
  public pathPrefix: string;

  constructor(
    public actions: Array<Action | NoAction>,
    /**
     * Do we allow adding new nodes
     */
    private allowAdd: boolean,
    /**
     * Called when the data has changed
     */
    private updateCallback?: (actions: ActionHandler["actions"]) => void,
    /**
     * Called when a node is clicked.
     */
    private selectCallback?: (params: NodeInfo) => void,

    public selected: string = "",

    public trace?: AutomationTraceExtended,

    pathPrefix?: string
  ) {
    if (pathPrefix !== undefined) {
      this.pathPrefix = pathPrefix;
    } else if (this.trace) {
      this.pathPrefix = TRACE_ACTION_PREFIX;
    } else {
      this.pathPrefix = "";
    }
  }

  createGraph(): TreeNode[] {
    return this._createGraph(this.actions, this.selected, this.trace);
  }

  _createGraph = memoizeOne((_actions, _selected, _trace) =>
    this._renderConditions().concat(
      this.actions.map((action, idx) => this._createTreeNode(idx, action))
    )
  );

  _renderConditions(): TreeNode[] {
    // action/ = default pathPrefix for trace-based actions
    if (
      this.pathPrefix !== TRACE_ACTION_PREFIX ||
      !this.trace?.config.condition
    ) {
      return [];
    }
    return this.trace.config.condition.map((condition, idx) =>
      this._createConditionNode(
        "condition/",
        this.trace?.condition_trace,
        idx,
        condition
      )
    );
  }

  _updateAction(idx: number, action) {
    if (action === null) {
      this.actions.splice(idx, 1);
    } else {
      this.actions[idx] = action;
    }
    if (this.updateCallback) this.updateCallback(this.actions);
  }

  _addAction(idx: number) {
    this.actions.splice(idx, 0, {});
    if (this.updateCallback) {
      this.updateCallback(this.actions);
    }
    this._selectNode({
      path: `${this.pathPrefix}${idx}`,
      config: {},
      update: (a) => this._updateAction(idx, a),
    });
  }

  _selectNode(nodeInfo: NodeInfo) {
    this.selected = nodeInfo.path;
    if (this.selectCallback) {
      this.selectCallback(nodeInfo);
    }
  }

  _createTreeNode(idx: number, action): TreeNode {
    let _type = "yaml";

    if (Object.keys(action).length === 0) {
      _type = "new";
    } else {
      _type = OPTIONS.find((option) => option in action) || "YAML";
    }

    let node: TreeNode;

    if (_type in this.SPECIAL) {
      node = this.SPECIAL[_type](idx, action);
    } else {
      const path = `${this.pathPrefix}${idx}`;
      const nodeInfo: NodeInfo = {
        path,
        config: action,
        update: (a) => this._updateAction(idx, a),
      };
      node = {
        icon: ICONS[_type],
        nodeInfo,
        clickCallback: () => {
          this._selectNode(nodeInfo);
        },
        isActive: path === this.selected,
        isTracked: this.trace && path in this.trace.action_trace,
      };
    }

    if (this.allowAdd) {
      node.addCallback = () => this._addAction(idx + 1);
    }
    if (_type === "new") {
      node.isNew = true;
    }

    return node;
  }

  SPECIAL: Record<string, (idx: number, action: any) => TreeNode> = {
    condition: (idx, action: Condition): TreeNode =>
      this._createConditionNode(
        this.pathPrefix,
        this.trace?.action_trace,
        idx,
        action
      ),

    repeat: (idx, action: RepeatAction): TreeNode => {
      let seq: Array<Action | NoAction> = action.repeat.sequence;
      if (!seq || !seq.length) {
        seq = [{}];
      }

      const path = `${this.pathPrefix}${idx}`;
      const isTracked = this.trace && path in this.trace.action_trace;
      const nodeInfo: NodeInfo = {
        path,
        config: action,
        update: (conf) => this._updateAction(idx, conf),
      };

      return {
        icon: ICONS.repeat,
        nodeInfo,
        clickCallback: () => this._selectNode(nodeInfo),
        isActive: path === this.selected,
        isTracked,
        children: [
          {
            icon: ICONS.repeatReturn,
            isActive: false,
            isTracked,
          },
          new ActionHandler(
            seq,
            this.allowAdd,
            (a) => {
              action.repeat.sequence = a as Action[];
              this._updateAction(idx, action);
            },
            (params) => this._selectNode(params),
            this.selected,
            this.trace,
            `${this.pathPrefix}${idx}/sequence/`
          ).createGraph(),
        ],
      };
    },

    choose: (idx, action: ChooseAction): TreeNode => {
      const choosePath = `${this.pathPrefix}${idx}`;
      let choice: number | "default" | undefined;

      if (this.trace?.action_trace && choosePath in this.trace.action_trace) {
        const chooseResult = this.trace.action_trace[
          choosePath
        ] as ChooseActionTrace[];
        choice = chooseResult[0].result.choice;
      }

      const children = action.choose.map(
        (b, choiceIdx): NonNullable<TreeNode["children"]> => {
          // If we have a trace, highlight the chosen track here.
          const choicePath = `${this.pathPrefix}${idx}/choose/${choiceIdx}`;
          let chosen = false;
          if (this.trace && choicePath in this.trace.action_trace) {
            const choiceResult = this.trace.action_trace[
              choicePath
            ] as ChooseChoiceActionTrace[];
            chosen = choiceResult[0].result.result;
          }
          const choiceNodeInfo: NodeInfo = {
            path: choicePath,
            config: b,
            update: (conf) => {
              action.choose[choiceIdx] = conf;
              this._updateAction(idx, action);
            },
          };

          return [
            {
              icon: ICONS.chooseChoice,
              nodeInfo: choiceNodeInfo,
              clickCallback: () => this._selectNode(choiceNodeInfo),
              isActive: choicePath === this.selected,
              isTracked: chosen,
            },
            new ActionHandler(
              b.sequence || [{}],
              this.allowAdd,
              (actions) => {
                b.sequence = actions as Action[];
                action.choose[choiceIdx] = b;
                this._updateAction(idx, action);
              },
              (params) => {
                this._selectNode(params);
              },
              this.selected,
              this.trace,
              `${this.pathPrefix}${idx}/choose/${choiceIdx}/sequence/`
            ).createGraph(),
          ];
        }
      );

      if (action.default || this.allowAdd) {
        const defaultConfig = action.default || [{}];

        const updateDefault = (actions) => {
          action.default = actions as Action[];
          this._updateAction(idx, action);
        };

        const defaultPath = `${this.pathPrefix}${idx}/default`;

        const defaultNodeInfo: NodeInfo = {
          path: defaultPath,
          config: defaultConfig,
          update: updateDefault,
        };

        children.push([
          {
            icon: ICONS.chooseDefault,
            nodeInfo: defaultNodeInfo,
            clickCallback: () => this._selectNode(defaultNodeInfo),
            isActive: defaultPath === this.selected,
            isTracked: choice === "default",
          },
          new ActionHandler(
            defaultConfig,
            this.allowAdd,
            updateDefault,
            (params) => this._selectNode(params),
            this.selected,
            this.trace,
            `${this.pathPrefix}${idx}/default/`
          ).createGraph(),
        ]);
      }

      const chooseNodeInfo: NodeInfo = {
        path: choosePath,
        config: action,
        update: (conf) => this._updateAction(idx, conf),
      };

      return {
        icon: ICONS.choose,
        nodeInfo: chooseNodeInfo,
        clickCallback: () => this._selectNode(chooseNodeInfo),
        isActive: choosePath === this.selected,
        isTracked: choice !== undefined,
        children,
      };
    },
  };

  private _createConditionNode(
    pathPrefix: string,
    tracePaths: Record<string, ActionTrace[]> | undefined,
    idx: number,
    action: Condition
  ): TreeNode {
    const path = `${pathPrefix}${idx}`;
    let result: boolean | undefined;
    let isTracked = false;

    if (tracePaths && path in tracePaths) {
      const conditionResult = tracePaths[path] as ConditionTrace[];
      result = conditionResult[0].result.result;
      isTracked = true;
    }

    const nodeInfo: NodeInfo = {
      path,
      config: action,
      update: (conf) => this._updateAction(idx, conf),
    };

    const isActive = path === this.selected;

    return {
      icon: ICONS.condition,
      nodeInfo,
      clickCallback: () => this._selectNode(nodeInfo),
      isActive,
      isTracked,
      children: [
        {
          icon: ICONS.TRUE,
          clickCallback: () => this._selectNode(nodeInfo),
          isActive,
          isTracked: result === true,
        },
        {
          icon: ICONS.FALSE,
          clickCallback: () => this._selectNode(nodeInfo),
          isActive,
          isTracked: result === false,
        },
      ],
    };
  }
}

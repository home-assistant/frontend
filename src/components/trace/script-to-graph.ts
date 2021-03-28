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

const cmpLists = (a: Array<unknown>, b: Array<unknown>) =>
  a.length === b.length && a.every((itm, idx) => b[idx] === itm);

type Index = Array<string | number>;

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

    public selected: Index = [],

    public trace?: AutomationTraceExtended,

    pathPrefix?: string,

    private idxPrefix: Index = []
  ) {
    if (pathPrefix !== undefined) {
      this.pathPrefix = pathPrefix;
    } else if (this.trace) {
      this.pathPrefix = "action/";
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
    if (this.pathPrefix !== "action/" || !this.trace?.config.condition) {
      return [];
    }
    return this.trace.config.condition.map((condition, idx) => {
      const fullIdx = ["condition", idx];
      const path = `condition/${idx}`;
      const nodeInfo: NodeInfo = { idx: fullIdx, path, config: condition };
      // For now we render each icon with TRUE
      // But we should look up result in trace.
      return {
        icon: ICONS.TRUE,
        nodeInfo,
        clickCallback: () => this._selectNode(nodeInfo),
        isActive: cmpLists(this.selected, fullIdx),
        isTracked: this.trace && path in this.trace.condition_trace,
      };
    });
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
      idx: [...this.idxPrefix, idx],
      path: `${this.pathPrefix}${idx}`,
      config: {},
      update: (a) => this._updateAction(idx, a),
    });
  }

  _selectNode(nodeInfo: NodeInfo) {
    this.selected = nodeInfo.idx;
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

    const selected = this.selected.length >= 1 && this.selected[0] === idx;
    let node: TreeNode;

    if (_type in this.SPECIAL) {
      node = this.SPECIAL[_type](idx, action);
    } else {
      const path = `${this.pathPrefix}${idx}`;
      const nodeInfo: NodeInfo = {
        idx: [...this.idxPrefix, idx],
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
        isActive: selected,
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
    condition: (idx, action: Condition): TreeNode => {
      /*
        1: condition root
        2: positive case
        3: negative case
      */
      const isSelected = this.selected[0] === idx;

      const path = `${this.pathPrefix}${idx}`;
      let result: boolean | undefined;

      if (this.trace?.action_trace && path in this.trace.action_trace) {
        const conditionResult = this.trace.action_trace[
          path
        ] as ConditionTrace[];
        result = conditionResult[0].result.result;
      }

      const conditionNodeInfo: NodeInfo = {
        idx: [...this.idxPrefix, idx, 1],
        path,
        config: action,
        update: (conf) => this._updateAction(idx, conf),
      };
      const conditionNodeTrueInfo = {
        idx: [...this.idxPrefix, idx, 2],
        path,
        config: action,
        update: (conf) => this._updateAction(idx, conf),
      };
      const conditionNodeFalseInfo = {
        idx: [...this.idxPrefix, idx, 3],
        path,
        config: action,
        update: (conf) => this._updateAction(idx, conf),
      };

      return {
        icon: ICONS.condition,
        nodeInfo: conditionNodeInfo,
        clickCallback: () => this._selectNode(conditionNodeInfo),
        isActive: isSelected,
        isTracked: this.trace && path in this.trace.action_trace,
        children: [
          {
            icon: ICONS.TRUE,
            nodeInfo: conditionNodeTrueInfo,
            clickCallback: () => this._selectNode(conditionNodeTrueInfo),
            isActive: isSelected && this.selected[1] === 2,
            isTracked: result === true,
          },
          {
            icon: ICONS.FALSE,
            nodeInfo: conditionNodeFalseInfo,
            clickCallback: () => this._selectNode(conditionNodeFalseInfo),
            isActive: isSelected && this.selected[1] === 3,
            isTracked: result === false,
          },
        ],
      };
    },

    repeat: (idx, action: RepeatAction): TreeNode => {
      let seq: Array<Action | NoAction> = action.repeat.sequence;
      if (!seq || !seq.length) {
        seq = [{}];
      }

      const isSelected = this.selected[0] === idx;
      const path = `${this.pathPrefix}${idx}`;
      const isTracked = this.trace && path in this.trace.action_trace;
      const nodeInfo: NodeInfo = {
        idx: [...this.idxPrefix, idx, -1],
        path,
        config: action,
        update: (conf) => this._updateAction(idx, conf),
      };

      return {
        icon: ICONS.repeat,
        nodeInfo,
        clickCallback: () => this._selectNode(nodeInfo),
        isActive: isSelected,
        isTracked,
        children: [
          {
            icon: ICONS.repeatReturn,
            nodeInfo,
            clickCallback: () => this._selectNode(nodeInfo),
            isActive: isSelected && this.selected[1] === -1,
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
            isSelected &&
            this.selected[1] !== undefined &&
            this.selected[1] !== -1
              ? this.selected.slice(1)
              : [],
            this.trace,
            `${this.pathPrefix}${idx}/sequence/`,
            [...this.idxPrefix, idx]
          ).createGraph(),
        ],
      };
    },

    choose: (idx, action: ChooseAction): TreeNode => {
      /*
      Special paths:
      -1 root of the 'choose'
      -2 default choice
      */
      const isSelected = this.selected[0] === idx;
      const path = `${this.pathPrefix}${idx}`;
      let choice: number | "default" | undefined;

      if (this.trace?.action_trace && path in this.trace.action_trace) {
        const chooseResult = this.trace.action_trace[
          path
        ] as ChooseActionTrace[];
        choice = chooseResult[0].result.choice;
      }

      const children = action.choose.map(
        (b, choiceIdx): NonNullable<TreeNode["children"]> => {
          // If we have a trace, highlight the chosen track here.
          const isChoiceSelected = isSelected && this.selected[1] === choiceIdx;
          const choicePath = `${this.pathPrefix}${idx}/choose/${choiceIdx}`;
          let chosen = false;
          if (this.trace && choicePath in this.trace.action_trace) {
            const choiceResult = this.trace.action_trace[
              choicePath
            ] as ChooseChoiceActionTrace[];
            chosen = choiceResult[0].result.result;
          }
          const choiceNodeInfo: NodeInfo = {
            idx: [...this.idxPrefix, idx, choiceIdx],
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
              isActive: isChoiceSelected,
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
              isChoiceSelected ? this.selected.slice(2) : [],
              this.trace,
              `${this.pathPrefix}${idx}/choose/${choiceIdx}/sequence/`,
              [...this.idxPrefix, idx, choiceIdx]
            ).createGraph(),
          ];
        }
      );

      if (action.default || this.allowAdd) {
        const def = action.default || [{}];

        const updateDefault = (actions) => {
          action.default = actions as Action[];
          this._updateAction(idx, action);
        };

        const isDefaultSelected = isSelected && this.selected[1] === -2;
        const defaultNodeInfo: NodeInfo = {
          idx: [...this.idxPrefix, idx, -2],
          path: `${this.pathPrefix}${idx}/default`,
          config: def,
          update: updateDefault,
        };

        children.push([
          {
            icon: ICONS.chooseDefault,
            nodeInfo: defaultNodeInfo,
            clickCallback: () => this._selectNode(defaultNodeInfo),
            isActive: isDefaultSelected,
            isTracked: choice === "default",
          },
          new ActionHandler(
            def,
            this.allowAdd,
            updateDefault,
            (params) => this._selectNode(params),
            isDefaultSelected ? this.selected.slice(2) : [],
            this.trace,
            `${this.pathPrefix}${idx}/default/`,
            [...this.idxPrefix, idx, -2]
          ).createGraph(),
        ]);
      }

      const chooseNodeInfo: NodeInfo = {
        idx: [...this.idxPrefix, idx, -1],
        path,
        config: action,
        update: (conf) => this._updateAction(idx, conf),
      };

      return {
        icon: ICONS.choose,
        nodeInfo: chooseNodeInfo,
        clickCallback: () => this._selectNode(chooseNodeInfo),
        isActive: isSelected,
        isTracked: choice !== undefined,
        children,
      };
    },
  };
}

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
import { Condition } from "../../data/automation";
import { Action, ChooseAction, RepeatAction } from "../../data/script";

import { TreeNode } from "./hat-graph";

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

type SomeConfig = any;

export class ActionHandler {
  constructor(
    public actions: Array<Action | NoAction>,
    /**
     * Do we allow adding new nodes
     */
    public allowAdd: boolean,
    /**
     * Called when the data has changed
     */
    private updateCallback?: (actions: ActionHandler["actions"]) => void,
    /**
     * Called when a node is clicked.
     */
    private selectCallback?: (
      path: number[],
      action: SomeConfig,
      update: (action: SomeConfig) => void
    ) => void,

    public selected: number[] = []
  ) {}

  get graph() {
    return this.actions.map((action, idx) =>
      this._make_graph_node(idx, action)
    );
  }

  _update_action(idx: number, action) {
    if (action === null) {
      this.actions.splice(idx, 1);
    } else {
      this.actions[idx] = action;
    }
    if (this.updateCallback) this.updateCallback(this.actions);
  }

  _add_action(idx: number) {
    this.actions.splice(idx, 0, {});
    if (this.updateCallback) {
      this.updateCallback(this.actions);
    }
    this._select_node([idx], {}, (a) => this._update_action(idx, a));
  }

  _select_node(path: number[], action, update?) {
    this.selected = path;
    if (this.selectCallback) {
      this.selectCallback(path, action, update);
    }
  }

  _make_graph_node(idx: number, action): TreeNode {
    let _type = "yaml";

    if (Object.keys(action).length === 0) {
      _type = "new";
    } else {
      _type = OPTIONS.find((option) => option in action) || "YAML";
    }

    const selected = this.selected.length >= 1 && this.selected[0] === idx;
    let node: TreeNode;

    if (_type in this.SPECIAL) {
      node = this.SPECIAL[_type](
        action,
        selected ? this.selected.slice(1) : [],
        (childIdx, childAction, updateChildAction) =>
          this._select_node(
            [idx].concat(childIdx),
            childAction,
            updateChildAction
          ),
        (childAction) => this._update_action(idx, childAction)
      );
    } else {
      node = {
        icon: ICONS[_type],
        clickCallback: () => {
          this._select_node([idx], action, (a) => this._update_action(idx, a));
        },
      };
    }

    return {
      ...node,
      addCallback: this.allowAdd ? () => this._add_action(idx + 1) : undefined,
      styles: selected
        ? "stroke: orange"
        : _type === "new"
        ? "stroke: lightgreen;"
        : undefined,
    };
  }

  SPECIAL: Record<
    string,
    (
      action: any,
      selected: number[],
      onSelectNode: (
        childIdx: number[],
        childAction: SomeConfig,
        updateChildAction: (action: SomeConfig) => void
      ) => void,
      update
    ) => TreeNode
  > = {
    condition: (action: Condition, selected, select, update) => {
      /*
        1: condition root
        2: positive case
        3: negative case
      */
      return {
        icon: ICONS.condition,
        clickCallback: () => select([1], action, update),
        children: [
          {
            icon: ICONS.TRUE,
            clickCallback: () => select([2], action, update),
            styles: selected[0] ? "stroke: orange;" : undefined,
          },
          {
            icon: ICONS.FALSE,
            end: false,
            clickCallback: () => select([3], action, update),
            styles: selected[0] ? "stroke: orange;" : undefined,
          },
        ],
      };
    },

    repeat: (action: RepeatAction, selected, select, update) => {
      let seq: Array<Action | NoAction> = action.repeat.sequence;
      if (!seq || !seq.length) {
        seq = [{}];
      }
      const seqHandler = new ActionHandler(
        seq,
        this.allowAdd,
        (a) => {
          action.repeat.sequence = a as Action[];
          update(action);
        },
        select,

        selected[0] !== undefined && selected[0] !== -1 ? selected : []
      );

      return {
        icon: ICONS.repeat,
        clickCallback: () => select([-1], action, update),
        children: [
          {
            icon: ICONS.repeatReturn,
            clickCallback: () => select([-1], action, update),
            styles: selected[0] === -1 ? "stroke: orange;" : undefined,
          },
          seqHandler.graph,
        ],
      };
    },

    choose: (action: ChooseAction, selected, select, update) => {
      /*
      Special paths:
      -1 root of the 'choose'
      -2 default choice
      */
      const children: NonNullable<TreeNode["children"]> = action.choose.map(
        (b, idx) => [
          {
            icon: ICONS.chooseChoice,
            clickCallback: () =>
              select([idx], b, (a) => {
                action.choose[idx] = a;
                update(action);
              }),
            styles: selected[0] === idx ? "stroke: orange;" : undefined,
          },
          new ActionHandler(
            b.sequence || [{}],
            this.allowAdd,
            (actions) => {
              b.sequence = actions as Action[];
              action.choose[idx] = b;
              update(action);
            },
            (i, a, u) => {
              select([idx].concat(i), a, u);
            },
            selected[0] === idx ? selected.slice(1) : []
          ).graph,
        ]
      );

      if (action.default || this.allowAdd) {
        const def = action.default || [{}];

        children.push([
          {
            icon: ICONS.chooseDefault,
            clickCallback: () =>
              select([-2], def, (a) => {
                action.default = a;
                update(action);
              }),
            styles: selected[0] === -2 ? "stroke: orange;" : undefined,
          },
          new ActionHandler(
            def,
            this.allowAdd,
            (actions) => {
              action.default = actions as Action[];
              update(action);
            },
            (i, a, u) => {
              select([-2].concat(i), a, u);
            },
            selected[0] === -2 ? selected.slice(1) : []
          ).graph,
        ]);
      }

      return {
        icon: ICONS.choose,
        clickCallback: () => select([-1], action, update),
        children,
      };
    },
  };
}

import {
  LitElement,
  html,
  svg,
  property,
  customElement,
  SVGTemplateResult,
  css,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

const SIZE = 35;
const DIST = 20;

type ValueOrArray<T> = T | ValueOrArray<T>[];

// Return value is undefined if it's an empty array
const extractFirstValue = <T>(val: ValueOrArray<T>): T | undefined =>
  Array.isArray(val) ? extractFirstValue(val[0]) : val;
const extractLastValue = <T>(val: ValueOrArray<T>): T | undefined =>
  Array.isArray(val) ? extractLastValue(val[val.length - 1]) : val;

export interface NodeInfo {
  idx: Array<string | number>;
  path: string;
  config: any;
  update?: (conf: any) => void;
}

export interface TreeNode {
  icon: string;
  end?: boolean;
  nodeInfo: NodeInfo;
  children?: Array<ValueOrArray<TreeNode>>;
  clickCallback?: () => void;
  addCallback?: () => void;
  isActive: boolean;
  isTracked: boolean | undefined;
  isNew?: boolean;
}

export function* bfsIterateTreeNodes(
  nodeOrNodes: ValueOrArray<TreeNode>
): IterableIterator<TreeNode> {
  if (Array.isArray(nodeOrNodes)) {
    for (const node of nodeOrNodes) {
      yield* bfsIterateTreeNodes(node);
    }
    return;
  }
  yield nodeOrNodes;

  if (nodeOrNodes.children) {
    yield* bfsIterateTreeNodes(nodeOrNodes.children);
  }
}

interface RenderedTree {
  svg: SVGTemplateResult[];
  width: number;
  height: number;
  // These are the parts rendered before/after this tree
  previousPartTracked: boolean | undefined;
  nextPartTracked: boolean | undefined;
  // These are the parts inside the tree
  firstNodeTracked: boolean | undefined;
  lastNodeTracked: boolean | undefined;
}

@customElement("hat-graph")
class HatGraph extends LitElement {
  @property() tree!: TreeNode[];

  @property() finishedActive = false;

  @property() nodeSize = SIZE;

  @property() nodeSeparation = DIST;

  private _draw_node(x: number, y: number, node: TreeNode) {
    return svg`
      <circle
        cx="${x}"
        cy="${y + this.nodeSize / 2}"
        r="${this.nodeSize / 2}"
        class="node ${classMap({
          active: node.isActive || false,
          track: node.isTracked || false,
          new: node.isNew || false,
        })}"
        @click=${node.clickCallback}
      />
      <g style="pointer-events: none" transform="translate(${x - 12} ${
      y + this.nodeSize / 2 - 12
    })">
        <path d="${node.icon}"/>
      </g>
    `;
  }

  private _draw_new_node(x, y, node) {
    return svg`
      <circle
        cx="${x}"
        cy="${y + this.nodeSize / 4}"
        r="${this.nodeSize / 4}"
        class="newnode"
        @click=${node.addCallback}
      />
    `;
  }

  private _draw_connector(x1, y1, x2, y2, track) {
    return svg`
      <line
        class=${classMap({ track })}
        x1=${x1}
        y1=${y1}
        x2=${x2}
        y2=${y2}
      />
    `;
  }

  private _draw_tree(
    tree: ValueOrArray<TreeNode>,
    previousPartTracked: boolean | undefined,
    nextPartTracked: boolean | undefined
  ): RenderedTree {
    if (!tree) {
      return {
        svg: [],
        width: 0,
        height: 0,
        previousPartTracked,
        nextPartTracked,
        firstNodeTracked: false,
        lastNodeTracked: false,
      };
    }

    if (!Array.isArray(tree)) {
      return this._draw_tree_single(tree, previousPartTracked, nextPartTracked);
    }

    if (tree.length === 0) {
      return {
        svg: [],
        width: 0,
        height: 0,
        previousPartTracked,
        nextPartTracked,
        firstNodeTracked: false,
        lastNodeTracked: false,
      };
    }

    return this._draw_tree_array(tree, previousPartTracked, nextPartTracked);
  }

  private _draw_tree_single(
    tree: TreeNode,
    previousPartTracked: boolean | undefined,
    nextPartTracked: boolean | undefined
  ): RenderedTree {
    let height = this.nodeSize;
    let width = this.nodeSize;
    const pieces: SVGTemplateResult[] = [];

    let lastNodeTracked = tree.isTracked;

    // These children are drawn in parallel to one another.
    if (tree.children && tree.children.length > 0) {
      lastNodeTracked = extractFirstValue(
        tree.children[tree.children.length - 1]
      )?.isTracked;

      const childTrees: RenderedTree[] = [];
      tree.children.forEach((child) => {
        childTrees.push(
          this._draw_tree(child, previousPartTracked, nextPartTracked)
        );
      });
      height += childTrees.reduce((a, i) => Math.max(a, i.height), 0);
      width =
        childTrees.reduce((a, i) => a + i.width, 0) +
        this.nodeSeparation * (tree.children.length - 1);
      const offsets = childTrees.map(
        ((sum) => (value) => sum + value.width + this.nodeSeparation)(0)
      );

      let bottomConnectors = false;

      for (const [idx, child] of childTrees.entries()) {
        const x = -width / 2 + (idx ? offsets[idx - 1] : 0) + child.width / 2;
        // Draw top connectors
        pieces.push(
          this._draw_connector(
            0,
            this.nodeSize / 2,
            x,
            this.nodeSize + this.nodeSeparation,
            child.previousPartTracked && child.firstNodeTracked
          )
        );

        const endNode = extractLastValue(tree.children[idx])!;

        if (endNode.end !== false) {
          // Draw bottom fill
          pieces.push(
            this._draw_connector(
              x,
              this.nodeSeparation + child.height,
              x,
              this.nodeSeparation + height,
              child.lastNodeTracked && child.nextPartTracked
            )
          );

          // Draw bottom connectors
          pieces.push(
            this._draw_connector(
              x,
              this.nodeSeparation + height,
              0,
              this.nodeSeparation +
                height +
                this.nodeSize / 2 +
                this.nodeSeparation,
              child.lastNodeTracked && child.nextPartTracked
            )
          );
          bottomConnectors = true;
        }

        // Draw child tree
        pieces.push(svg`
          <g class="a" transform="translate(${x} ${
          this.nodeSize + this.nodeSeparation
        })">
          ${child.svg}
          </g>
        `);
      }
      if (bottomConnectors) {
        height += this.nodeSize + this.nodeSeparation;
      }
    }
    if (tree.addCallback) {
      pieces.push(
        this._draw_connector(
          0,
          height,
          0,
          height + this.nodeSeparation,
          nextPartTracked
        )
      );
      pieces.push(this._draw_new_node(0, height + this.nodeSeparation, tree));
      height += this.nodeSeparation + this.nodeSize / 2;
    }
    if (tree.end !== false) {
      // Draw bottom connector
      pieces.push(
        this._draw_connector(
          0,
          height,
          0,
          height + this.nodeSeparation,
          nextPartTracked
        )
      );
      height += this.nodeSeparation;
    }

    // Draw the node itself
    pieces.push(this._draw_node(0, 0, tree));

    return {
      svg: pieces,
      width,
      height,
      previousPartTracked,
      nextPartTracked,
      firstNodeTracked: tree.isTracked,
      lastNodeTracked,
    };
  }

  private _draw_tree_array(
    tree: ValueOrArray<TreeNode>[],
    previousPartTracked: boolean | undefined,
    nextPartTracked: boolean | undefined
  ): RenderedTree {
    const pieces: SVGTemplateResult[] = [];
    let height = 0;

    // Render each entry while keeping track of the "track" variable.
    const childTrees: RenderedTree[] = [];
    let lastChildTracked: boolean | undefined = previousPartTracked;
    tree.forEach((child, idx) => {
      const lastNodeTracked = extractLastValue(child)?.isTracked;
      const nextChildTracked =
        idx < tree.length - 1
          ? extractFirstValue(tree[idx + 1])?.isTracked
          : lastNodeTracked && nextPartTracked;
      childTrees.push(
        this._draw_tree(child, lastChildTracked, nextChildTracked)
      );
      lastChildTracked = lastNodeTracked;
    });

    const width = childTrees.reduce((a, i) => Math.max(a, i.width), 0);
    for (const [_, node] of childTrees.entries()) {
      pieces.push(svg`
        <g class="b" transform="translate(0, ${height})">
          ${node.svg}
        </g>
      `);
      height += node.height;
    }

    return {
      svg: pieces,
      width,
      height,
      previousPartTracked,
      nextPartTracked,
      firstNodeTracked: extractFirstValue(tree[0])?.isTracked,
      lastNodeTracked: extractFirstValue(tree[tree.length - 1])?.isTracked,
    };
  }

  render() {
    const tree = this._draw_tree(
      this.tree,
      this.tree.length > 0 && this.tree[0].isTracked,
      this.finishedActive
    );
    return html`
      <svg width=${tree.width + 32} height=${tree.height + 32}>
        <g transform="translate(${tree.width / 2 + 16} 16)">
          ${tree.svg}
        </g>
      </svg>
    `;
  }

  static get styles() {
    return css`
      :host {
        --stroke-clr: var(--stroke-color, var(--secondary-text-color));
        --active-clr: var(--active-color, var(--primary-color));
        --hover-clr: var(--hover-color, var(--primary-color));
        --track-clr: var(--track-color, var(--accent-color));
      }
      circle,
      line {
        stroke: var(--stroke-clr);
        stroke-width: 3px;
        fill: white;
      }
      circle:hover {
        stroke: var(--hover-clr);
      }
      circle {
        cursor: pointer;
      }
      .track {
        stroke: var(--track-clr);
      }
      .active {
        stroke: var(--active-clr);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-graph": HatGraph;
  }
}

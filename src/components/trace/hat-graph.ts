import {
  LitElement,
  html,
  svg,
  property,
  customElement,
  SVGTemplateResult,
  css,
} from "lit-element";

const SIZE = 35;
const DIST = 20;

type ValueOrArray<T> = T | ValueOrArray<T>[];

export interface TreeNode {
  icon: string;
  styles?: string;
  end?: boolean;
  children?: Array<ValueOrArray<TreeNode>>;
  clickCallback?: (ev: MouseEvent) => void;
  addCallback?: () => void;
}

@customElement("hat-graph")
class HatGraph extends LitElement {
  @property() tree?: TreeNode[];

  @property() nodeSize = SIZE;

  @property() nodeSeparation = DIST;

  private _draw_node(x: number, y: number, node: TreeNode) {
    return svg`
      <circle
        cx="${x}"
        cy="${y + this.nodeSize / 2}"
        r="${this.nodeSize / 2}"
        class="node"
        @click=${node.clickCallback}
        style=${node.styles}
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

  private _draw_connector(x1, y1, x2, y2) {
    return svg`
      <line
        x1=${x1}
        y1=${y1}
        x2=${x2}
        y2=${y2}
      />
    `;
  }

  private _draw_tree(tree?: ValueOrArray<TreeNode>) {
    if (!tree) return { svg: `Hello`, width: 0, height: 0 };
    if (!Array.isArray(tree)) {
      let height = this.nodeSize;
      let width = this.nodeSize;
      const pieces: SVGTemplateResult[] = [];

      if (tree.children) {
        const childTrees = tree.children.map((c) => this._draw_tree(c));
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
              this.nodeSize + this.nodeSeparation
            )
          );

          let endNode = tree.children[idx];
          while (Array.isArray(endNode)) {
            endNode = endNode[endNode.length - 1];
          }
          if (endNode.end !== false) {
            // Draw bottom fill
            pieces.push(
              this._draw_connector(
                x,
                this.nodeSeparation + child.height,
                x,
                this.nodeSeparation + height
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
                  this.nodeSeparation
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
        if (bottomConnectors) height += this.nodeSize + this.nodeSeparation;
      }
      if (tree.addCallback) {
        pieces.push(
          this._draw_connector(0, height, 0, height + this.nodeSeparation)
        );
        pieces.push(this._draw_new_node(0, height + this.nodeSeparation, tree));
        height += this.nodeSeparation + this.nodeSize / 2;
      }
      if (tree.end !== false) {
        // Draw bottom connector
        pieces.push(
          this._draw_connector(0, height, 0, height + this.nodeSeparation)
        );
        height += this.nodeSeparation;
      }

      // Draw the node itself
      pieces.push(this._draw_node(0, 0, tree));

      return { svg: pieces, width, height };
    }

    // Array of trees
    const pieces: SVGTemplateResult[] = [];
    let height = 0;
    const children = tree.map((n) => this._draw_tree(n));
    const width = children.reduce((a, i) => Math.max(a, i.width), 0);
    for (const [_, node] of children.entries()) {
      pieces.push(svg`
        <g class="b" transform="translate(0, ${height})">
          ${node.svg}
        </g>
      `);
      height += node.height;
    }

    return { svg: pieces, width, height };
  }

  render() {
    const tree = this._draw_tree(this.tree);
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
      circle:hover,
      .newnode:hover {
        stroke: var(--hover-clr);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-graph": HatGraph;
  }
}

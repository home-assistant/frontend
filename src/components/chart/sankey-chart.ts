import { customElement, property, state } from "lit/decorators";
import { LitElement, html, css, svg, nothing } from "lit";
import type { HomeAssistant } from "../../types";

export type Node = {
  id: string;
  value: number;
  index: number; // like z-index but for x/y
  label?: string;
  tooltip?: string;
  color?: string;
  passThrough?: boolean;
};
export type Link = { source: string; target: string; value?: number };

export type SankeyChartData = {
  nodes: Node[];
  links: Link[];
};

type ProcessedNode = Node & {
  x: number;
  y: number;
  size: number;
};

type ProcessedLink = Link & {
  value: number;
  offset: {
    source: number;
    target: number;
  };
  passThroughNodeIds: string[];
};

type Section = {
  nodes: ProcessedNode[];
  offset: number;
  index: number;
  totalValue: number;
  statePerPixel: number;
};

const MIN_SIZE = 3;
const DEFAULT_COLOR = "var(--primary-color)";
const NODE_WIDTH = 15;
const FONT_SIZE = 12;
const MIN_DISTANCE = FONT_SIZE / 2;

@customElement("sankey-chart")
export class SankeyChart extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data: SankeyChartData = {
    nodes: [],
    links: [],
  };

  @property({ type: Boolean }) public vertical = false;

  @state() private width = 0;

  @state() private height = 0;

  private _statePerPixel = 0;

  private _resizeObserver?: ResizeObserver;

  private _textMeasureCanvas?: HTMLCanvasElement;

  connectedCallback() {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => {
      const newWidth = this.clientWidth;
      const newHeight = this.clientHeight;
      if (newWidth !== this.width || newHeight !== this.height) {
        this.width = newWidth;
        this.height = newHeight;
        this.requestUpdate();
      }
    });
    this._resizeObserver?.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.unobserve(this);
    this._resizeObserver?.disconnect();
    this._textMeasureCanvas = undefined;
  }

  willUpdate() {
    this._statePerPixel = 0;
  }

  render() {
    if (!this.width || !this.height) {
      return html`${this.hass.localize(
        "ui.panel.lovelace.cards.energy.loading"
      )}`;
    }

    const filteredNodes = this.data.nodes.filter((n) => n.value > 0);
    const indexes = [...new Set(filteredNodes.map((n) => n.index))].sort();
    const { links, passThroughNodes } = this._processLinks(indexes);
    const nodes = this._processNodes([...filteredNodes, ...passThroughNodes]);
    const paths = this._processPaths(nodes, links);

    return html`
      <svg
        width=${this.width}
        height=${this.height}
        viewBox="0 0 ${this.width} ${this.height}"
        preserveAspectRatio="none"
      >
        <defs>
          ${paths.map(
            (path, i) => svg`
            <linearGradient id="gradient${path.sourceNode.id}.${path.targetNode.id}.${i}" gradientTransform="${
              this.vertical ? "rotate(90)" : ""
            }">
              <stop offset="0%" stop-color="${path.sourceNode.color}"></stop>
              <stop offset="100%" stop-color="${path.targetNode.color}"></stop>
            </linearGradient>
          `
          )}
        </defs>
        ${paths.map(
          (path, i) =>
            svg`
            <path d="${path.path.map(([cmd, x, y]) => `${cmd}${x},${y}`).join(" ")} Z"
                fill="url(#gradient${path.sourceNode.id}.${path.targetNode.id}.${i})" fill-opacity="0.4" />
          `
        )}
        ${nodes.map((node) =>
          node.passThrough
            ? nothing
            : svg`
              <g transform="translate(${node.x},${node.y})">
                <rect
                  class="node"
                  width=${this.vertical ? node.size : NODE_WIDTH}
                  height=${this.vertical ? NODE_WIDTH : node.size}
                  style="fill: ${node.color}"
                >
                  <title>${node.tooltip}</title>
                </rect>
                ${
                  this.vertical
                    ? svg`
                      <text 
                        class="node-label" 
                        x=${node.size / 2}
                        y=${NODE_WIDTH + FONT_SIZE}
                        text-anchor="middle" 
                        dominant-baseline="middle"
                      >${node.label}</text>
                    `
                    : svg`
                      <text 
                        class="node-label" 
                        x=${NODE_WIDTH + 5}
                        y=${node.size / 2}
                        text-anchor="start" 
                        dominant-baseline="middle"
                      >${node.label}</text>
                    `
                }
              </g>
            `
        )}
      </svg>
    `;
  }

  private _processLinks(indexes: number[]) {
    const accountedIn = new Map<string, number>();
    const accountedOut = new Map<string, number>();
    const links: ProcessedLink[] = [];
    const passThroughNodes: Node[] = [];
    this.data.links.forEach((link) => {
      const sourceNode = this.data.nodes.find((n) => n.id === link.source);
      const targetNode = this.data.nodes.find((n) => n.id === link.target);
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

      // handle links across sections
      const sourceIndex = indexes.findIndex((i) => i === sourceNode.index);
      const targetIndex = indexes.findIndex((i) => i === targetNode.index);
      const passThroughSections = indexes.slice(sourceIndex + 1, targetIndex);
      // create pass-through nodes to reserve space
      const passThroughNodeIds = passThroughSections.map((index) => {
        const node = {
          passThrough: true,
          id: `${sourceNode.id}-${targetNode.id}-${index}`,
          value,
          index,
        };
        passThroughNodes.push(node);
        return node.id;
      });

      if (value > 0) {
        links.push({
          ...link,
          value,
          offset: {
            source: sourceAccounted / (sourceNode.value || 1),
            target: targetAccounted / (targetNode.value || 1),
          },
          passThroughNodeIds,
        });
      }
    });
    return { links, passThroughNodes };
  }

  private _processNodes(filteredNodes: Node[]) {
    // add MIN_DISTANCE as padding
    const sectionSize = this.vertical
      ? this.width - MIN_DISTANCE * 2
      : this.height - MIN_DISTANCE * 2;

    const nodesPerSection: Record<number, Node[]> = {};
    filteredNodes.forEach((node) => {
      if (!nodesPerSection[node.index]) {
        nodesPerSection[node.index] = [node];
      } else {
        nodesPerSection[node.index].push(node);
      }
    });

    const indexes = Object.keys(nodesPerSection).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );

    const sectionFlexSize = this._getSectionFlexSize(
      Object.values(nodesPerSection)
    );

    const sections: Section[] = indexes.map((index, i) => {
      const nodes: ProcessedNode[] = nodesPerSection[index].map(
        (node: Node) => ({
          ...node,
          color: node.color || DEFAULT_COLOR,
          x: 0,
          y: 0,
          size: 0,
        })
      );
      const availableSpace =
        sectionSize - (nodes.length * MIN_DISTANCE - MIN_DISTANCE);
      const totalValue = nodes.reduce(
        (acc: number, node: Node) => acc + node.value,
        0
      );
      const { nodes: sizedNodes, statePerPixel } = this._setNodeSizes(
        nodes,
        availableSpace,
        totalValue
      );
      return {
        nodes: sizedNodes,
        offset: sectionFlexSize * i,
        index: parseInt(index),
        totalValue,
        statePerPixel,
      };
    });

    sections.forEach((section) => {
      // calc sizes again with the best statePerPixel
      let totalSize = 0;
      if (section.statePerPixel !== this._statePerPixel) {
        section.nodes.forEach((node) => {
          const size = Math.max(
            MIN_SIZE,
            Math.floor(node.value / this._statePerPixel)
          );
          totalSize += size;
          node.size = size;
        });
      } else {
        totalSize = section.nodes.reduce((sum, b) => sum + b.size, 0);
      }
      // calc margin betwee boxes
      const emptySpace = sectionSize - totalSize;
      const spacerSize = emptySpace / (section.nodes.length - 1);

      // account for MIN_DISTANCE padding and center single node sections
      let offset =
        section.nodes.length > 1 ? MIN_DISTANCE : emptySpace / 2 + MIN_DISTANCE;
      // calc positions - swap x/y for vertical layout
      section.nodes.forEach((node) => {
        if (this.vertical) {
          node.x = offset;
          node.y = section.offset;
        } else {
          node.x = section.offset;
          node.y = offset;
        }
        offset += node.size + spacerSize;
      });
    });

    return sections.flatMap((section) => section.nodes);
  }

  private _processPaths(nodes: ProcessedNode[], links: ProcessedLink[]) {
    const flowDirection = this.vertical ? "y" : "x";
    const orthDirection = this.vertical ? "x" : "y"; // orthogonal to the flow
    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    return links.map((link) => {
      const { source, target, value, offset, passThroughNodeIds } = link;
      const pathNodes = [source, ...passThroughNodeIds, target].map(
        (id) => nodesById.get(id)!
      );
      const offsets = [
        offset.source,
        ...link.passThroughNodeIds.map(() => 0),
        offset.target,
      ];

      const sourceNode = pathNodes[0];
      const targetNode = pathNodes[pathNodes.length - 1];

      let path: [string, number, number][] = [
        [
          "M",
          sourceNode[flowDirection] + NODE_WIDTH,
          sourceNode[orthDirection] + offset.source * sourceNode.size,
        ],
      ]; // starting point

      // traverse the path forwards. stop before the last node
      for (let i = 0; i < pathNodes.length - 1; i++) {
        const node = pathNodes[i];
        const nextNode = pathNodes[i + 1];
        const flowMiddle =
          (nextNode[flowDirection] - node[flowDirection]) / 2 +
          node[flowDirection];
        const orthStart = node[orthDirection] + offsets[i] * node.size;
        const orthEnd =
          nextNode[orthDirection] + offsets[i + 1] * nextNode.size;
        path.push(
          ["L", node[flowDirection] + NODE_WIDTH, orthStart],
          ["C", flowMiddle, orthStart],
          ["", flowMiddle, orthEnd],
          ["", nextNode[flowDirection], orthEnd]
        );
      }
      // traverse the path backwards. stop before the first node
      for (let i = pathNodes.length - 1; i > 0; i--) {
        const node = pathNodes[i];
        const prevNode = pathNodes[i - 1];
        const flowMiddle =
          (node[flowDirection] - prevNode[flowDirection]) / 2 +
          prevNode[flowDirection];
        const orthStart =
          node[orthDirection] +
          offsets[i] * node.size +
          Math.max((value / (node.value || 1)) * node.size, 0);
        const orthEnd =
          prevNode[orthDirection] +
          offsets[i - 1] * prevNode.size +
          Math.max((value / (prevNode.value || 1)) * prevNode.size, 0);
        path.push(
          ["L", node[flowDirection], orthStart],
          ["C", flowMiddle, orthStart],
          ["", flowMiddle, orthEnd],
          ["", prevNode[flowDirection] + NODE_WIDTH, orthEnd]
        );
      }

      if (this.vertical) {
        // Just swap x and y coordinates for vertical layout
        path = path.map((c) => [c[0], c[2], c[1]]);
      }
      return {
        sourceNode,
        targetNode,
        value,
        path,
      };
    });
  }

  private _setNodeSizes(
    nodes: ProcessedNode[],
    availableSpace: number,
    totalValue: number
  ): { nodes: ProcessedNode[]; statePerPixel: number } {
    const statePerPixel = totalValue / availableSpace;
    if (statePerPixel > this._statePerPixel) {
      this._statePerPixel = statePerPixel;
    }
    let deficitHeight = 0;
    const result = nodes.map((node) => {
      if (node.size === MIN_SIZE) {
        return node;
      }
      let size = Math.floor(node.value / this._statePerPixel);
      if (size < MIN_SIZE) {
        deficitHeight += MIN_SIZE - size;
        size = MIN_SIZE;
      }
      return {
        ...node,
        size,
      };
    });
    if (deficitHeight > 0) {
      return this._setNodeSizes(
        result,
        availableSpace - deficitHeight,
        totalValue
      );
    }
    return { nodes: result, statePerPixel: this._statePerPixel };
  }

  private _getSectionFlexSize(nodesPerSection: Node[][]): number {
    const fullSize = this.vertical ? this.height : this.width;
    if (nodesPerSection.length < 2) {
      return fullSize;
    }
    let lastSectionFlexSize: number;
    if (this.vertical) {
      lastSectionFlexSize = FONT_SIZE * 2 + NODE_WIDTH; // estimated based on the font size + some margin
    } else {
      // Estimate the width needed for the last section based on label length
      const lastIndex = nodesPerSection.length - 1;
      const lastSectionNodes = nodesPerSection[lastIndex];
      const TEXT_PADDING = 5; // Padding between node and text
      lastSectionFlexSize =
        lastSectionNodes.length > 0
          ? Math.max(
              ...lastSectionNodes.map(
                (node) =>
                  NODE_WIDTH +
                  TEXT_PADDING +
                  (node.label ? this._getTextWidth(node.label) : 0)
              )
            )
          : 0;
    }
    // Calculate the flex size for other sections
    const remainingSize = fullSize - lastSectionFlexSize;
    const flexSize = remainingSize / (nodesPerSection.length - 1);
    // if the last section is bigger than the others, we make them all the same size
    // this is to prevent the last section from squishing the others
    return lastSectionFlexSize < flexSize
      ? flexSize
      : fullSize / nodesPerSection.length;
  }

  private _getTextWidth(text: string): number {
    if (!this._textMeasureCanvas) {
      this._textMeasureCanvas = document.createElement("canvas");
    }
    const context = this._textMeasureCanvas.getContext("2d");
    if (!context) return 0;

    // Match the font style from CSS
    context.font = `${FONT_SIZE}px sans-serif`;
    return context.measureText(text).width;
  }

  static styles = css`
    :host {
      display: block;
      flex: 1;
      background: var(--ha-card-background, var(--card-background-color, #000));
      overflow: hidden;
      position: relative;
    }
    svg {
      overflow: visible;
      position: absolute;
    }
    .node-label {
      font-size: ${FONT_SIZE}px;
      fill: var(--primary-text-color, white);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "sankey-chart": SankeyChart;
  }
}

import { customElement, property, state } from "lit/decorators";
import { LitElement, html, css, svg } from "lit";

export type Node = {
  id: string;
  label: string;
  color?: string;
  value: number;
  index: number;
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

type Section = {
  nodes: ProcessedNode[];
  x: number;
  index: number;
  totalValue: number;
  statePerPixel: number;
  spacerSize: number;
};

const MIN_SIZE = 3;
const MIN_DISTANCE = 5;
const DEFAULT_COLOR = "var(--primary-color)";
const NODE_WIDTH = 15;
const PADDING = 8;
const FONT_SIZE = 12;

@customElement("sankey-chart")
export class SankeyChart extends LitElement {
  @property({ attribute: false }) public data: SankeyChartData = {
    nodes: [],
    links: [],
  };

  @property({ type: Boolean }) public vertical = false;

  @state() private statePerPixel = 0;

  @state() private width = 0;

  @state() private height = 0;

  private resizeObserver?: ResizeObserver;

  private _textMeasureCanvas?: HTMLCanvasElement;

  connectedCallback() {
    super.connectedCallback();
    this.resizeObserver = new ResizeObserver(() => {
      this.width = this.clientWidth - PADDING * 2;
      this.height = this.clientHeight - PADDING * 2;
      this.requestUpdate();
    });
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.unobserve(this);
    this.resizeObserver?.disconnect();
    this._textMeasureCanvas = undefined;
  }

  render() {
    if (!this.width || !this.height) {
      return html`<div>Loading...</div>`;
    }

    const nodes = this._processNodes();
    const links = this._processLinks(nodes);

    return html`
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 ${this.width} ${this.height}"
      >
        <defs>
          ${links.map(
            (link, i) => svg`
            <linearGradient id="gradient${link.sourceNode.id}.${link.targetNode.id}.${i}" gradientTransform="${
              this.vertical ? "rotate(90)" : ""
            }">
              <stop offset="0%" stop-color="${link.sourceNode.color}"></stop>
              <stop offset="100%" stop-color="${link.targetNode.color}"></stop>
            </linearGradient>
          `
          )}
        </defs>
        ${links.map(
          (link, i) =>
            svg`
            <path d="${link.path.map(([cmd, x, y]) => `${cmd}${x},${y}`).join(" ")} Z"
                fill="url(#gradient${link.sourceNode.id}.${link.targetNode.id}.${i})" fill-opacity="0.4" />
          `
        )}
        ${nodes.map(
          (node) => svg`
            <g transform="translate(${node.x},${node.y})">
              <rect
                class="node"
                width=${NODE_WIDTH} 
                height=${node.size} 
                style="fill: ${node.color}"
              ></rect>
              <text 
                class="node-label" 
                x=${NODE_WIDTH + 5}
                y=${node.size / 2}
                text-anchor="start" 
                dominant-baseline="middle"
              >${node.label}</text>
            </g>
          `
        )}
      </svg>
    `;
  }

  private _processNodes() {
    const width = this.width;
    const height = this.height;
    const sectionSize = this.vertical ? width : height;

    const nodesPerSection: Record<number, Node[]> = {};
    this.data.nodes.forEach((node) => {
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
          x: sectionFlexSize * i,
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
        x: sectionFlexSize * i,
        index: parseInt(index),
        totalValue,
        statePerPixel,
        spacerSize: 0,
      };
    });

    sections.forEach((section) => {
      // calc sizes again with the best statePerPixel
      let totalSize = 0;
      if (section.statePerPixel !== this.statePerPixel) {
        section.nodes.forEach((node) => {
          const size = Math.max(
            MIN_SIZE,
            Math.floor(node.value / this.statePerPixel)
          );
          totalSize += size;
          node.size = size;
        });
      } else {
        totalSize = section.nodes.reduce((sum, b) => sum + b.size, 0);
      }
      // calc margin betwee boxes
      const emptySpace = sectionSize - totalSize;
      // center single node sections
      const spacerSize =
        section.nodes.length > 1
          ? emptySpace / (section.nodes.length - 1)
          : emptySpace / 2;
      let offset = section.nodes.length > 1 ? 0 : emptySpace / 2;
      // calc y positions
      section.nodes.forEach((node) => {
        node.y = offset;
        offset += node.size + spacerSize;
      });
      section.spacerSize = spacerSize;
    });

    return sections.flatMap((section) => section.nodes);
  }

  private _processLinks(nodes: ProcessedNode[]) {
    const accountedIn = new Map<string, number>();
    const accountedOut = new Map<string, number>();
    return this.data.links.map((link) => {
      const sourceNode = nodes.find((n) => n.id === link.source)!;
      const targetNode = nodes.find((n) => n.id === link.target)!;
      const sourceAccounted = accountedOut.get(sourceNode.id) || 0;
      const targetAccounted = accountedIn.get(targetNode.id) || 0;
      let value = link.value;
      if (!value) {
        // if no value is provided, we infer it from the remaining capacity of the source and target nodes
        const sourceRemaining = sourceNode.value - sourceAccounted;
        const targetRemaining = targetNode.value - targetAccounted;
        value = Math.min(sourceRemaining, targetRemaining);
      }

      const sourceY =
        sourceNode.y +
        (sourceAccounted / (sourceNode.value || 1)) * sourceNode.size;
      const targetY =
        targetNode.y +
        (targetAccounted / (targetNode.value || 1)) * targetNode.size;
      const sourceSize = Math.max(
        (value / (sourceNode.value || 1)) * sourceNode.size,
        0
      );
      const targetSize = Math.max(
        (value / (targetNode.value || 1)) * targetNode.size,
        0
      );
      const sourceX = sourceNode.x + NODE_WIDTH;
      const targetX = targetNode.x;
      const middleX = (targetX - sourceX) / 2 + sourceX;
      let path = [
        ["M", sourceX, sourceY],
        ["C", middleX, sourceY],
        ["", middleX, targetY],
        ["", targetX, targetY],
        ["L", targetX, targetY + targetSize],
        ["C", middleX, targetY + targetSize],
        ["", middleX, sourceY + sourceSize],
        ["", sourceX, sourceY + sourceSize],
      ];
      if (this.vertical) {
        path = path.map((c) => [c[0], this.height - (c[2] as number), c[1]]);
      }
      accountedIn.set(targetNode.id, targetAccounted + value);
      accountedOut.set(sourceNode.id, sourceAccounted + value);
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
    if (statePerPixel > this.statePerPixel) {
      this.statePerPixel = statePerPixel;
    }
    let deficitHeight = 0;
    const result = nodes.map((node) => {
      if (node.size === MIN_SIZE) {
        return node;
      }
      let size = Math.floor(node.value / this.statePerPixel);
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
    return { nodes: result, statePerPixel: this.statePerPixel };
  }

  private _getSectionFlexSize(nodesPerSection: Node[][]): number {
    if (nodesPerSection.length < 2) {
      return this.width;
    }
    if (this.vertical) {
      const LAST_SECTION_HEIGHT = FONT_SIZE * 2; // estimated based on the font size + some margin
      const remainingSize = this.height - LAST_SECTION_HEIGHT;
      return remainingSize / (nodesPerSection.length - 1);
    }
    // Estimate the width needed for the last section based on label length
    const lastIndex = nodesPerSection.length - 1;
    const lastSectionNodes = nodesPerSection[lastIndex];
    const TEXT_PADDING = 5; // Padding between node and text
    const lastSectionFlexSize =
      lastSectionNodes.length > 0
        ? Math.max(
            ...lastSectionNodes.map(
              (node) =>
                NODE_WIDTH + TEXT_PADDING + this._getTextWidth(node.label)
            )
          )
        : 0;
    // Calculate the flex size for other sections
    const remainingSize = this.width - lastSectionFlexSize;
    return remainingSize / (nodesPerSection.length - 1);
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
      height: 200px;
      background: var(--ha-card-background, var(--card-background-color, #000));
      padding: ${PADDING}px;
      overflow: hidden;
    }
    svg {
      overflow: visible;
    }
    .node {
      /* cursor: pointer; */
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

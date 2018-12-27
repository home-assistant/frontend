import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

class ZhaNodeInformation extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .content {
          margin-top: 24px;
        }

        .node-info {
          margin-left: 16px;
        }

        paper-card {
          display: block;
          margin: 0 auto;
          max-width: 600px;
        }

        paper-button[toggles][active] {
          background: lightgray;
        }
      </style>

      <div class="content">
        <paper-card heading="Node Information">
          <div class="card-actions">
            <paper-button
              toggles=""
              raised=""
              noink=""
              active="{{nodeInfoActive}}"
              >Show</paper-button
            >
          </div>
          <template is="dom-if" if="{{nodeInfoActive}}">
            <template is="dom-repeat" items="[[selectedNodeAttrs]]" as="state">
              <div class="node-info"><span>[[state]]</span></div>
            </template>
          </template>
        </paper-card>
      </div>
    `;
  }

  static get properties() {
    return {
      nodes: {
        type: Array,
        observer: "nodeChanged",
      },

      selectedNode: {
        type: Number,
        value: -1,
        observer: "nodeChanged",
      },

      selectedNodeAttrs: {
        type: Array,
      },

      nodeInfoActive: {
        type: Boolean,
      },
    };
  }

  nodeChanged(selectedNode) {
    if (!this.nodes || selectedNode === -1) return;
    var nodeAttrs = this.nodes[this.selectedNode].attributes;
    var att = [];
    Object.keys(nodeAttrs).forEach(function(key) {
      att.push(key + ": " + nodeAttrs[key]);
    });
    this.selectedNodeAttrs = att.sort();
  }
}

customElements.define("zha-node-information", ZhaNodeInformation);

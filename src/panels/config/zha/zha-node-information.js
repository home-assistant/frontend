import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

class ZhaNodeInformation extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .node-info-header {
          @apply (--paper-font-headline);
          padding-left: 24px;
        }

        .node-info {
          margin-left: 30px;
          margin-top: 3px;
          float: left;
          font-weight: normal;
        }
        .node-info-button {
          float: right;
        }

        paper-card {
          display: block;
          margin: 0 auto;
          max-width: 600px;
        }

        paper-button[toggles][active] {
          background: lightgray;
        }
        paper-button[toggles] {
          margin-top: 3px;
          height: 27px;
          margin-right: 24px;
        }

        table {
          border-collapse: collapse;
        }
      </style>

      <div>
        <div class="card-actions">
          <span class="node-info-header">Node Information</span>
          <div class="node-info-button">
            <paper-button
              toggles=""
              raised=""
              noink=""
              active="{{nodeInfoActive}}"
              >{{buttonLabel}}</paper-button
            >
          </div>
        </div>
        <template is="dom-if" if="{{nodeInfoActive}}">
          <table>
            <template is="dom-repeat" items="[[selectedNodeAttrs]]" as="state">
              <tr>
                <th>
                  <div class="node-info"><span>[[state]]</span></div>
                </th>
              </tr>
            </template>
          </table>
        </template>
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
        observer: "toggleStateChanged",
      },

      buttonLabel: String,
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

  toggleStateChanged(toggleState) {
    if (toggleState) {
      this.buttonLabel = "Hide";
    } else {
      this.buttonLabel = "Show";
    }
  }
}

customElements.define("zha-node-information", ZhaNodeInformation);

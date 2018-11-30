import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/resources/ha-style";

class HassioAddonLogs extends PolymerElement {
  static get template() {
    return html`
      <style include="ha-style">
        :host,
        paper-card {
          display: block;
        }
        pre {
          overflow-x: auto;
          white-space: pre-wrap;
          overflow-wrap: break-word;
        }
        .bold {
          font-weight: bold;
        }
        .italic {
          font-style: italic;
        }
        .underline {
          text-decoration: underline;
        }
        .strikethrough {
          text-decoration: line-through;
        }
        .underline.strikethrough {
          text-decoration: underline line-through;
        }
        .fg-red {
          color: rgb(222, 56, 43);
        }
        .fg-green {
          color: rgb(57, 181, 74);
        }
        .fg-yellow {
          color: rgb(255, 199, 6);
        }
        .fg-blue {
          color: rgb(0, 111, 184);
        }
        .fg-magenta {
          color: rgb(118, 38, 113);
        }
        .fg-cyan {
          color: rgb(44, 181, 233);
        }
        .fg-white {
          color: rgb(204, 204, 204);
        }
        .bg-black {
          background-color: rgb(0, 0, 0);
        }
        .bg-red {
          background-color: rgb(222, 56, 43);
        }
        .bg-green {
          background-color: rgb(57, 181, 74);
        }
        .bg-yellow {
          background-color: rgb(255, 199, 6);
        }
        .bg-blue {
          background-color: rgb(0, 111, 184);
        }
        .bg-magenta {
          background-color: rgb(118, 38, 113);
        }
        .bg-cyan {
          background-color: rgb(44, 181, 233);
        }
        .bg-white {
          background-color: rgb(204, 204, 204);
        }
      </style>
      <paper-card heading="Log">
        <div class="card-content" id="content"></div>
        <div class="card-actions">
          <paper-button on-click="refresh">Refresh</paper-button>
        </div>
      </paper-card>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      addonSlug: {
        type: String,
        observer: "addonSlugChanged",
      },
    };
  }

  addonSlugChanged(slug) {
    if (!this.hass) {
      setTimeout(() => {
        this.addonChanged(slug);
      }, 0);
      return;
    }

    this.refresh();
  }

  static parseLogsToPre(text) {
    const pre = document.createElement("pre");
    const re = /\033(?:\[(.*?)[@-~]|\].*?(?:\007|\033\\))/g;
    let i = 0;

    const state = {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      foregroundColor: null,
      backgroundColor: null,
    };

    const addSpan = (content) => {
      const span = document.createElement("span");
      if (state.bold) {
        span.classList.add("bold");
      }
      if (state.italic) {
        span.classList.add("italic");
      }
      if (state.underline) {
        span.classList.add("underline");
      }
      if (state.strikethrough) {
        span.classList.add("strikethrough");
      }
      if (state.foregroundColor !== null) {
        span.classList.add(state.foregroundColor);
      }
      if (state.backgroundColor !== null) {
        span.classList.add(state.backgroundColor);
      }
      span.appendChild(document.createTextNode(content));
      pre.appendChild(span);
    };

    /* eslint-disable no-constant-condition */
    while (true) {
      const match = re.exec(text);
      if (match === null) {
        break;
      }

      const j = match.index;
      addSpan(text.substring(i, j));
      i = j + match[0].length;

      if (match[1] === undefined) continue;

      for (const colorCode of match[1].split(";")) {
        switch (parseInt(colorCode)) {
          case 0:
            // reset
            state.bold = false;
            state.italic = false;
            state.underline = false;
            state.strikethrough = false;
            state.foregroundColor = null;
            state.backgroundColor = null;
            break;
          case 1:
            state.bold = true;
            break;
          case 3:
            state.italic = true;
            break;
          case 4:
            state.underline = true;
            break;
          case 9:
            state.strikethrough = true;
            break;
          case 22:
            state.bold = false;
            break;
          case 23:
            state.italic = false;
            break;
          case 24:
            state.underline = false;
            break;
          case 29:
            state.strikethrough = false;
            break;
          case 31:
            state.foregroundColor = "fg-red";
            break;
          case 32:
            state.foregroundColor = "fg-green";
            break;
          case 33:
            state.foregroundColor = "fg-yellow";
            break;
          case 34:
            state.foregroundColor = "fg-blue";
            break;
          case 35:
            state.foregroundColor = "fg-magenta";
            break;
          case 36:
            state.foregroundColor = "fg-cyan";
            break;
          case 37:
            state.foregroundColor = "fg-white";
            break;
          case 30:
          case 39:
            state.foregroundColor = null;
            break;
          case 40:
            state.backgroundColor = "bg-black";
            break;
          case 41:
            state.backgroundColor = "bg-red";
            break;
          case 42:
            state.backgroundColor = "bg-green";
            break;
          case 43:
            state.backgroundColor = "bg-yellow";
            break;
          case 44:
            state.backgroundColor = "bg-blue";
            break;
          case 45:
            state.backgroundColor = "bg-magenta";
            break;
          case 46:
            state.backgroundColor = "bg-cyan";
            break;
          case 47:
            state.backgroundColor = "bg-white";
            break;
          case 49:
            state.backgroundColor = null;
            break;
        }
      }
    }
    addSpan(text.substring(i));

    return pre;
  }

  refresh() {
    this.hass
      .callApi("get", `hassio/addons/${this.addonSlug}/logs`)
      .then((text) => {
        while (this.$.content.lastChild) {
          this.$.content.removeChild(this.$.content.lastChild);
        }
        this.$.content.appendChild(HassioAddonLogs.parseLogsToPre(text));
      });
  }
}

customElements.define("hassio-addon-logs", HassioAddonLogs);

import { LitElement, html, CSSResult, css } from "lit-element";
import "../../src/components/ha-card";
import { LovelaceCard } from "../../src/panels/lovelace/types";
import { LovelaceCardConfig } from "../../src/data/lovelace";

class HADemoCard extends LitElement implements LovelaceCard {
  public getCardSize() {
    return 2;
  }

  public setConfig(
    // @ts-ignore
    config: LovelaceCardConfig
    // tslint:disable-next-line:no-empty
  ) {}

  protected render() {
    return html`
      <ha-card header="Welcome Home!">
        <div class="content">
          Welcome to the Home Assistant Demo. In this demo you can get a feel
          for the user interface and explore the various options. Feel free to
          edit the UI and change things around or explore the configuration
          options.
        </div>
        <ul>
          <li>
            <a href="https://www.home-assistant.io/" target="_blank">
              About Home Assistant
            </a>
          </li>
          <li>
            <a
              href="https://www.home-assistant.io/getting-started/"
              target="_blank"
            >
              Installation instructions
            </a>
          </li>
        </ul>
      </ha-card>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .content {
          padding: 0 16px;
        }

        ul {
          margin-top: 0;
          padding: 16px 16px 16px 38px;
        }

        li {
          padding: 8px 0;
        }

        li:first-child {
          margin-top: -8px;
        }

        li:last-child {
          margin-bottom: -8px;
        }

        a {
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-demo-card": HADemoCard;
  }
}

customElements.define("ha-demo-card", HADemoCard);

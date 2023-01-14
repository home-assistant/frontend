import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, state } from "lit/decorators";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-card";
import { HomeAssistant } from "../../../types";
import { computeCardSize } from "../common/compute-card-size";
import { findEntities } from "../common/find-entities";
import { processConfigEntities } from "../common/process-config-entities";
import "../components/hui-entities-toggle";
import { createHeaderFooterElement } from "../create-element/create-header-footer-element";
import { createRowElement } from "../create-element/create-row-element";
import { UNAVAILABLE } from "../../../data/entity";
import {
  EntityConfig,
  LovelaceRow,
  LovelaceRowConfig,
} from "../entity-rows/types";
import {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceHeaderFooter,
} from "../types";
import { AlphaSortConfig, EntitiesCardConfig, SortConfig } from "./types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import {
  stringCompare,
  caseInsensitiveStringCompare,
} from "../../../common/string/compare";

@customElement("hui-entities-card")
class HuiEntitiesCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-entities-card-editor");
    return document.createElement("hui-entities-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): EntitiesCardConfig {
    const maxEntities = 3;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      ["light", "switch", "sensor"]
    );

    return { type: "entities", entities: foundEntities };
  }

  @state() private _config?: EntitiesCardConfig;

  @state() private _hass?: HomeAssistant;

  private _configEntities?: LovelaceRowConfig[];

  private _lastUsedSortedEntities?: LovelaceRowConfig[];

  private _showHeaderToggle?: boolean;

  private _enableSorting?: boolean;

  private _sortConfigs?: SortConfig[];

  private _headerElement?: LovelaceHeaderFooter;

  private _footerElement?: LovelaceHeaderFooter;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.shadowRoot
      ?.querySelectorAll("#states > div > *")
      .forEach((element: unknown) => {
        (element as LovelaceRow).hass = hass;
      });
    if (this._headerElement) {
      this._headerElement.hass = hass;
    }
    if (this._footerElement) {
      this._footerElement.hass = hass;
    }
    const entitiesToggle = this.shadowRoot?.querySelector(
      "hui-entities-toggle"
    );
    if (entitiesToggle) {
      (entitiesToggle as any).hass = hass;
    }
  }

  public async getCardSize(): Promise<number> {
    if (!this._config) {
      return 0;
    }
    // +1 for the header
    let size =
      (this._config.title || this._showHeaderToggle ? 2 : 0) +
      (this._config.entities.length || 1);
    if (this._headerElement) {
      const headerSize = computeCardSize(this._headerElement);
      size += headerSize instanceof Promise ? await headerSize : headerSize;
    }
    if (this._footerElement) {
      const footerSize = computeCardSize(this._footerElement);
      size += footerSize instanceof Promise ? await footerSize : footerSize;
    }

    return size;
  }

  public setConfig(config: EntitiesCardConfig): void {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("Entities must be specified");
    }

    const entities = processConfigEntities(config.entities);

    this._config = config;
    this._configEntities = entities;
    if (config.title !== undefined && config.show_header_toggle === undefined) {
      // Default value is show toggle if we can at least toggle 2 entities.
      let toggleable = 0;
      for (const rowConf of entities) {
        if (!("entity" in rowConf)) {
          continue;
        }
        toggleable += Number(DOMAINS_TOGGLE.has(computeDomain(rowConf.entity)));
        if (toggleable === 2) {
          break;
        }
      }
      this._showHeaderToggle = toggleable === 2;
    } else {
      this._showHeaderToggle = config.show_header_toggle;
    }

    if (this._config.header) {
      this._headerElement = createHeaderFooterElement(
        this._config.header
      ) as LovelaceHeaderFooter;
      this._headerElement.type = "header";
      if (this._hass) {
        this._headerElement.hass = this._hass;
      }
    } else {
      this._headerElement = undefined;
    }

    if (this._config.footer) {
      this._footerElement = createHeaderFooterElement(
        this._config.footer
      ) as LovelaceHeaderFooter;
      this._footerElement.type = "footer";
      if (this._hass) {
        this._footerElement.hass = this._hass;
      }
    } else {
      this._footerElement = undefined;
    }
    this._enableSorting = config.enable_sorting ?? false;
    this._sortConfigs = config.sort_configs ?? [];
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this._hass) {
      return;
    }
    const oldHass = changedProps.get("_hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | EntitiesCardConfig
      | undefined;

    if (
      (changedProps.has("_hass") &&
        (!oldHass || oldHass.themes !== this._hass.themes)) ||
      (changedProps.has("_config") &&
        (!oldConfig || oldConfig.theme !== this._config.theme))
    ) {
      applyThemesOnElement(this, this._hass.themes, this._config.theme);
    }
  }

  protected shouldUpdate(changedProps: PropertyValues) {
    return (
      hasConfigOrEntityChanged(this, changedProps) ||
      this._checkIfSortOrderChanged()
    );
  }

  private _checkIfSortOrderChanged(): boolean {
    return (
      this._lastUsedSortedEntities === undefined ||
      this._lastUsedSortedEntities.length !==
        this._sortedConfigEntities.length ||
      this._lastUsedSortedEntities.some(
        (oldEntity, index) => oldEntity !== this._sortedConfigEntities[index]
      )
    );
  }

  get _sortedConfigEntities(): LovelaceRowConfig[] {
    return this._configEntities!.sort((confA, confB) => {
      const doNotSort = 0;
      const confAIsInvalid =
        !("entity" in confA) ||
        !this._hass!.states[confA.entity] ||
        this._hass!.states[confA.entity].state === UNAVAILABLE;
      const confBIsInvalid =
        !("entity" in confB) ||
        !this._hass!.states[confB.entity] ||
        this._hass!.states[confB.entity].state === UNAVAILABLE;

      if (confAIsInvalid && confBIsInvalid) {
        return doNotSort;
      }

      const entityA = !confAIsInvalid
        ? this._hass!.states[confA.entity]
        : undefined;

      const entityB = !confBIsInvalid
        ? this._hass!.states[confB.entity]
        : undefined;

      const stateA = entityA?.state;

      const stateB = entityB?.state;

      for (const sortConf of this._sortConfigs!) {
        const reverseSortOrder =
          sortConf.reverse !== undefined ? (sortConf.reverse ? 1 : -1) : -1;
        const aBeforeB = -1 * reverseSortOrder;
        const bBeforeA = -aBeforeB;

        /* eslint no-else-return: ["error", {allowElseIf: true}] */
        if (confAIsInvalid) {
          return bBeforeA;
        } else if (confBIsInvalid) {
          return aBeforeB;
        }

        switch (sortConf.type!) {
          case "numeric": {
            const valA = Number(stateA);
            const valB = Number(stateB);

            /* eslint no-else-return: ["error", {allowElseIf: true}] */
            if (isNaN(valA) && isNaN(valB)) {
              // both states are non-numeric, try another sort config
              continue;
            } else if (isNaN(valA)) {
              return bBeforeA;
            } else if (isNaN(valB)) {
              return aBeforeB;
            }
            return (valA - valB) * reverseSortOrder;
          }
          case "last_changed": {
            /* eslint no-else-return: ["error", {allowElseIf: true}] */
            if (
              entityA?.last_changed === undefined &&
              entityB?.last_changed === undefined
            ) {
              continue;
            } else if (entityA === undefined) {
              return bBeforeA;
            } else if (entityB === undefined) {
              return aBeforeB;
            }

            return (
              (new Date(entityA.last_changed).getTime() -
                new Date(entityB.last_changed).getTime()) *
              reverseSortOrder
            );
          }
          case "last_updated": {
            /* eslint no-else-return: ["error", {allowElseIf: true}] */
            if (
              entityA?.last_updated === undefined &&
              entityB?.last_updated === undefined
            ) {
              continue;
            } else if (entityA === undefined) {
              return bBeforeA;
            } else if (entityB === undefined) {
              return aBeforeB;
            }

            return (
              (new Date(entityA.last_updated).getTime() -
                new Date(entityB.last_updated).getTime()) *
              reverseSortOrder
            );
          }
          case "last_triggered": {
            /* eslint no-else-return: ["error", {allowElseIf: true}] */
            if (
              entityA?.attributes?.last_triggered === undefined &&
              entityB?.attributes?.last_triggered === undefined
            ) {
              continue;
            } else if (entityA === undefined) {
              return bBeforeA;
            } else if (entityB === undefined) {
              return aBeforeB;
            }

            return (
              (new Date(entityA.attributes?.last_triggered).getTime() -
                new Date(entityB.attributes?.last_triggered).getTime()) *
              reverseSortOrder
            );
          }
          case "random": {
            return Math.floor(Math.random() * 3) - 1;
          }
          case "ip": {
            const dotSplittedA = String(stateA!).split(".");
            const dotSplittedB = String(stateB!).split(".");
            const isInvalidIpv4A =
              dotSplittedA.length !== 4 ||
              dotSplittedA.some((ipBlock: string) => isNaN(Number(ipBlock)));
            const isInvalidIpv4B =
              dotSplittedB.length !== 4 ||
              dotSplittedB.some((ipBlock: string) => isNaN(Number(ipBlock)));

            if (isInvalidIpv4A && isInvalidIpv4B) {
              continue;
            } else if (isInvalidIpv4A) {
              return bBeforeA;
            } else if (isInvalidIpv4B) {
              return aBeforeB;
            }

            return (
              (Number(dotSplittedA[0]) - Number(dotSplittedB[0]) ||
                Number(dotSplittedA[1]) - Number(dotSplittedB[1]) ||
                Number(dotSplittedA[2]) - Number(dotSplittedB[2]) ||
                Number(dotSplittedA[3]) - Number(dotSplittedB[3])) *
              reverseSortOrder
            );
          }
          case "alpha": {
            return (sortConf as AlphaSortConfig).ignore_case ?? false
              ? caseInsensitiveStringCompare(String(stateA!), String(stateB!))
              : stringCompare(String(stateA!), String(stateB!));
          }
        }
      }

      // same value
      return doNotSort;
    });
  }

  protected render(): TemplateResult {
    if (!this._config || !this._hass) {
      return html``;
    }

    let entities = this._configEntities;
    if (this._enableSorting && this._sortConfigs !== undefined) {
      entities = this._sortedConfigEntities;
      this._lastUsedSortedEntities = entities.concat();
    }

    return html`
      <ha-card>
        ${this._headerElement
          ? html`<div class="header-footer header">${this._headerElement}</div>`
          : ""}
        ${!this._config.title && !this._showHeaderToggle && !this._config.icon
          ? ""
          : html`
              <h1 class="card-header">
                <div class="name">
                  ${this._config.icon
                    ? html`
                        <ha-icon
                          class="icon"
                          .icon=${this._config.icon}
                        ></ha-icon>
                      `
                    : ""}
                  ${this._config.title}
                </div>
                ${!this._showHeaderToggle
                  ? html``
                  : html`
                      <hui-entities-toggle
                        .hass=${this._hass}
                        .entities=${(
                          this._configEntities!.filter(
                            (conf) => "entity" in conf
                          ) as EntityConfig[]
                        ).map((conf) => conf.entity)}
                      ></hui-entities-toggle>
                    `}
              </h1>
            `}
        <div id="states" class="card-content">
          ${entities!.map((entityConf) => this.renderEntity(entityConf))}
        </div>

        ${this._footerElement
          ? html`<div class="header-footer footer">${this._footerElement}</div>`
          : ""}
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .card-header {
        display: flex;
        justify-content: space-between;
      }

      .card-header .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #states {
        flex: 1;
      }

      #states > * {
        margin: 8px 0;
      }

      #states > *:first-child {
        margin-top: 0;
      }

      #states > *:last-child {
        margin-bottom: 0;
      }

      #states > div > * {
        overflow: clip visible;
      }

      #states > div {
        position: relative;
      }

      .icon {
        padding: 0px 18px 0px 8px;
      }

      .header {
        border-top-left-radius: var(--ha-card-border-radius, 12px);
        border-top-right-radius: var(--ha-card-border-radius, 12px);
        margin-bottom: 16px;
        overflow: hidden;
      }

      .footer {
        border-bottom-left-radius: var(--ha-card-border-radius, 12px);
        border-bottom-right-radius: var(--ha-card-border-radius, 12px);
        margin-top: -16px;
        overflow: hidden;
      }
    `;
  }

  private renderEntity(entityConf: LovelaceRowConfig): TemplateResult {
    const element = createRowElement(
      (!("type" in entityConf) || entityConf.type === "conditional") &&
        this._config!.state_color
        ? ({
            state_color: true,
            ...(entityConf as EntityConfig),
          } as EntityConfig)
        : entityConf
    );
    if (this._hass) {
      element.hass = this._hass;
    }

    return html`<div>${element}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-card": HuiEntitiesCard;
  }
}

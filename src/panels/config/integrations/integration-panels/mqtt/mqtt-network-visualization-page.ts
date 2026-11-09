import { mdiCodeBraces, mdiListStatus, mdiOpenInNew } from "@mdi/js";
import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { storage } from "../../../../../common/decorators/storage";
import type {
  HASSDomEvent,
  HASSDomTargetEvent,
} from "../../../../../common/dom/fire_event";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { formatDateTimeWithSeconds } from "../../../../../common/datetime/format_date_time";
import { navigate } from "../../../../../common/navigate";
import type { LocalizeKeys } from "../../../../../common/translations/localize";
import "../../../../../components/chart/ha-network-graph";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-dropdown";
import "../../../../../components/ha-dropdown-item";
import type { HaDropdownItem } from "../../../../../components/ha-dropdown-item";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-spinner";
import "../../../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../../../components/input/ha-input-search";
import {
  getConfigEntries,
  getSubEntries,
} from "../../../../../data/config_entries";
import { showSubConfigFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-sub-config-flow";
import type {
  MQTTExplorerConfig,
  MQTTExplorerDetails,
  MQTTExplorerEntityTopic,
  MQTTExplorerItem,
  MQTTExplorerStructure,
  MQTTLoggedMessage,
  MQTTMessage,
} from "../../../../../data/mqtt";
import {
  fetchMQTTExplorerDetails,
  fetchMQTTExplorerStructure,
  subscribeMQTTTopic,
} from "../../../../../data/mqtt";
import "../../../../../layouts/hass-subpage";
import { MobileAwareMixin } from "../../../../../mixins/mobile-aware-mixin";
import type { HomeAssistant, Route } from "../../../../../types";
import {
  ARTIFACT_PREFIX,
  BROKER_NODE_ID,
  createMQTTNetworkChartData,
  DEVICE_PREFIX,
  ENTITY_PREFIX,
  NO_DEVICE_PREFIX,
  parseTopicNodeId,
  SOURCE_PREFIX,
  sourceName,
  TOPIC_PREFIX,
} from "./mqtt-network-data";
import "./mqtt-config-view";
import "./mqtt-topic-messages";
import type { MQTTTopicMessage } from "./mqtt-topic-messages";

const REFRESH_INTERVAL = 30000;

// Live messages kept for the topic that is shown
const MAX_LIVE_MESSAGES = 100;

// Messages Home Assistant publishes come back from the broker with this QoS
const PUBLISH_TOPIC_QOS = 2;

const SUBENTRY_SOURCE_PREFIX = "subentry:";

// Distance in pixels between the center of the focused node and its actions
const NODE_ACTIONS_OFFSET = 18;

// A click this close to the center of a node clicks it, as entities and
// triggers are small
const NODE_CLICK_RADIUS = 16;

// Characters of a payload shown in a tooltip
const TOOLTIP_PAYLOAD_LENGTH = 80;

// A payload on one line, shortened to fit in a tooltip
const shortPayload = (payload: string): string => {
  const line = payload.replace(/\s+/g, " ").trim();
  return line.length > TOOLTIP_PAYLOAD_LENGTH
    ? `${line.substring(0, TOOLTIP_PAYLOAD_LENGTH)}…`
    : line;
};

interface SelectedTopic {
  // The entity or artifact node the topic belongs to
  ownerNodeId: string;
  topic: MQTTExplorerEntityTopic;
  // The QoS of the live subscription
  qos: number;
}

const isFocusable = (id: string): boolean =>
  id === BROKER_NODE_ID ||
  [
    SOURCE_PREFIX,
    DEVICE_PREFIX,
    NO_DEVICE_PREFIX,
    ENTITY_PREFIX,
    ARTIFACT_PREFIX,
  ].some((prefix) => id.startsWith(prefix));

// The item of a node that has a configuration
const configItem = (id?: string): MQTTExplorerItem | undefined => {
  if (id?.startsWith(ENTITY_PREFIX)) {
    return { entity_id: id.substring(ENTITY_PREFIX.length) };
  }
  if (id?.startsWith(DEVICE_PREFIX)) {
    return { device_id: id.substring(DEVICE_PREFIX.length) };
  }
  if (id?.startsWith(ARTIFACT_PREFIX)) {
    return { artifact_id: id.substring(ARTIFACT_PREFIX.length) };
  }
  return undefined;
};

@customElement("mqtt-network-visualization-page")
export class MQTTNetworkVisualizationPage extends MobileAwareMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _structure?: MQTTExplorerStructure;

  @state() private _error?: string;

  @state() private _searchFilter = "";

  private _refreshing = false;

  @state()
  @storage({
    key: "mqtt-visualization-hidden-sources",
    state: true,
    subscribe: false,
  })
  private _hiddenSources: string[] = [];

  // The device or entity node that is centered, while the rest is faded
  @state() private _focusedNode?: string;

  // The legend categories that are switched off, whose nodes are faded
  @state() private _hiddenCategories: string[] = [];

  @state() private _selectedTopic?: SelectedTopic;

  // The configuration of the focused node is shown in the side panel
  @state() private _showConfig = false;

  // The node the configuration was loaded for
  @state() private _configNode?: string;

  // Undefined while loading
  @state() private _configs?: MQTTExplorerConfig[];

  @state() private _configFailed = false;

  // The last stored message per topic of the focused entity, for the tooltips
  // of its topic nodes, keyed by `<direction>:<topic>`
  @state() private _lastMessages: Record<string, MQTTLoggedMessage> = {};

  private _lastMessagesNode?: string;

  // Stored by Home Assistant, newest first
  @state() private _storedMessages: MQTTTopicMessage[] = [];

  // Received while the topic is shown, newest first
  @state() private _liveMessages: MQTTTopicMessage[] = [];

  @state() private _topicLive = false;

  private _unsubTopic?: Promise<UnsubscribeFunc>;

  private _messageId = 0;

  private _refreshTimer?: number;

  private _nodeActionsFrame?: number;

  // The actions stay put under the pointer, so they can be clicked
  private _nodeActionsHovered = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._fetchData();
    }
    this._refreshTimer = window.setInterval(
      () => this._fetchData(),
      REFRESH_INTERVAL
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this._refreshTimer);
    this._refreshTimer = undefined;
    this._stopLiveMessages();
    this._stopTrackingNodeActions();
  }

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);
    this._fetchData();
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    // A request that resolves after leaving the page still updates it
    if (this.isConnected && this.shadowRoot!.querySelector(".node-actions")) {
      this._nodeActionsFrame ??= requestAnimationFrame(this._trackNodeActions);
    } else {
      // Removed actions get no pointerleave
      this._nodeActionsHovered = false;
      this._stopTrackingNodeActions();
    }
  }

  // Keeps the actions next to their node while the graph moves or zooms
  private _trackNodeActions = (): void => {
    const actions =
      this.shadowRoot!.querySelector<HTMLElement>(".node-actions");
    const graph = this.shadowRoot!.querySelector("ha-network-graph");
    if (!actions || !graph || !this._focusedNode) {
      this._nodeActionsFrame = undefined;
      return;
    }
    if (!this._nodeActionsHovered) {
      const position = graph.getNodePosition(this._focusedNode);
      if (position) {
        // Below the node, clear of its label on the right
        const x = Math.min(
          Math.max(0, position.x - actions.offsetWidth / 2),
          graph.clientWidth - actions.offsetWidth
        );
        const y = Math.min(
          position.y + NODE_ACTIONS_OFFSET,
          graph.clientHeight - actions.offsetHeight
        );
        actions.style.transform = `translate(${x}px, ${Math.max(0, y)}px)`;
        actions.style.visibility = "visible";
      } else {
        actions.style.visibility = "hidden";
      }
    }
    this._nodeActionsFrame = requestAnimationFrame(this._trackNodeActions);
  };

  private _nodeActionsEnter(): void {
    this._nodeActionsHovered = true;
  }

  private _nodeActionsLeave(): void {
    this._nodeActionsHovered = false;
  }

  private _stopTrackingNodeActions(): void {
    if (this._nodeActionsFrame !== undefined) {
      cancelAnimationFrame(this._nodeActionsFrame);
      this._nodeActionsFrame = undefined;
    }
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    // The shown configuration follows the focus
    if (
      this._showConfig &&
      configItem(this._focusedNode) &&
      this._configNode !== this._focusedNode
    ) {
      this._fetchConfig(this._focusedNode!);
    }
    // Loaded again with every refresh of the structure
    if (
      this._focusedNode?.startsWith(ENTITY_PREFIX) &&
      (this._lastMessagesNode !== this._focusedNode ||
        (changedProperties as PropertyValues).has("_structure"))
    ) {
      this._fetchLastMessages(this._focusedNode);
    } else if (
      !this._focusedNode?.startsWith(ENTITY_PREFIX) &&
      this._lastMessagesNode
    ) {
      // Only entities have stored messages
      this._lastMessagesNode = undefined;
      this._lastMessages = {};
    }
  }

  private async _fetchLastMessages(nodeId: string): Promise<void> {
    if (this._lastMessagesNode !== nodeId) {
      this._lastMessages = {};
    }
    this._lastMessagesNode = nodeId;
    let details: MQTTExplorerDetails;
    try {
      details = await fetchMQTTExplorerDetails(this.hass, {
        entity_id: nodeId.substring(ENTITY_PREFIX.length),
      });
    } catch (_err) {
      // The tooltips then show no last message
      return;
    }
    if (this._lastMessagesNode !== nodeId) {
      return;
    }
    this._lastMessages = Object.fromEntries(
      details.topics
        .filter((topic) => topic.messages.length)
        .map((topic) => [
          `${topic.direction}:${topic.topic}`,
          topic.messages[topic.messages.length - 1],
        ])
    );
  }

  private async _fetchConfig(nodeId: string): Promise<void> {
    this._configNode = nodeId;
    this._configs = undefined;
    this._configFailed = false;
    try {
      const details = await fetchMQTTExplorerDetails(
        this.hass,
        configItem(nodeId)!
      );
      if (this._configNode === nodeId) {
        this._configs = details.configs;
      }
    } catch (_err) {
      if (this._configNode === nodeId) {
        this._configFailed = true;
      }
    }
  }

  private _toggleConfig(): void {
    this._showConfig = !this._showConfig;
    if (this._showConfig) {
      this._closeTopic();
      // Loaded again, as it can have changed since it was last shown
      this._configNode = undefined;
    }
  }

  private _closeConfig(): void {
    this._showConfig = false;
  }

  private async _reconfigureSubentry(
    ev: HASSDomEvent<HASSDomEvents["mqtt-config-view-reconfigure"]>
  ): Promise<void> {
    const subentryId = ev.detail.source.substring(
      SUBENTRY_SOURCE_PREFIX.length
    );
    // There can be more than one MQTT entry, of which one is loaded
    const entries = await getConfigEntries(this.hass, { domain: "mqtt" });
    for (const entry of entries) {
      // eslint-disable-next-line no-await-in-loop
      const subentries = await getSubEntries(this.hass.callWS, entry.entry_id);
      const subentry = subentries.find((sub) => sub.subentry_id === subentryId);
      if (subentry) {
        showSubConfigFlowDialog(this, entry, subentry.subentry_type, {
          startFlowHandler: entry.entry_id,
          subEntryId: subentryId,
        });
        return;
      }
    }
  }

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config/mqtt/dashboard"
        .header=${this.hass.localize(
          "ui.panel.config.mqtt.visualization.header"
        )}
      >
        ${
          this.narrow && this._structure
            ? html`<div slot="header">${this._renderInputSearch()}</div>`
            : nothing
        }
        ${this._renderContent()}
      </hass-subpage>
    `;
  }

  private _renderContent() {
    if (this._error) {
      return html`<div class="center">
        <ha-alert alert-type="error">${this._error}</ha-alert>
      </div>`;
    }
    if (!this._structure) {
      return html`<div class="center"><ha-spinner></ha-spinner></div>`;
    }
    return html`<div class="layout">
      <div class="graph">
        ${this._renderGraph(this._structure)} ${this._renderNodeActions()}
      </div>
      ${
        this._selectedTopic
          ? html`<aside>
              <mqtt-topic-messages
                .topic=${this._selectedTopic.topic}
                .messages=${this._topicMessages(
                  this._liveMessages,
                  this._storedMessages
                )}
                .live=${this._topicLive}
                .qos=${this._selectedTopic.qos}
                @mqtt-topic-messages-closed=${this._closeTopic}
              ></mqtt-topic-messages>
            </aside>`
          : this._showConfig && configItem(this._focusedNode)
            ? html`<aside>
                <mqtt-config-view
                  .name=${this._nodeName(this._focusedNode!)}
                  .kind=${this._nodeKind(this._focusedNode!)}
                  .configs=${this._configs}
                  .failed=${this._configFailed}
                  .sources=${this._structure.sources}
                  .platform=${
                    this._focusedNode!.startsWith(ENTITY_PREFIX)
                      ? this._focusedNode!.substring(
                          ENTITY_PREFIX.length
                        ).split(".")[0]
                      : undefined
                  }
                  .device=${this._focusedNode!.startsWith(DEVICE_PREFIX)}
                  .yamlEntity=${this._structure.entities.some(
                    (entity) =>
                      `${ENTITY_PREFIX}${entity.entity_id}` ===
                        this._focusedNode && entity.source === "yaml"
                  )}
                  .openable=${
                    this._focusedNode!.startsWith(ENTITY_PREFIX) ||
                    this._focusedNode!.startsWith(DEVICE_PREFIX)
                  }
                  @mqtt-config-view-closed=${this._closeConfig}
                  @mqtt-config-view-open=${this._openFocusedDetails}
                  @mqtt-config-view-reconfigure=${this._reconfigureSubentry}
                ></mqtt-config-view>
              </aside>`
            : nothing
      }
    </div>`;
  }

  private _nodeName(id: string): string {
    const node = this._chartData(this._structure!).nodes.find(
      (n) => n.id === id
    );
    return node?.name ?? id;
  }

  private _nodeKind(id: string): string {
    const localize = (key: string) =>
      this.hass.localize(
        `ui.panel.config.mqtt.visualization.${key}` as LocalizeKeys
      );
    if (id.startsWith(ENTITY_PREFIX)) {
      return localize("entity");
    }
    if (id.startsWith(ARTIFACT_PREFIX)) {
      const artifact = this._structure?.artifacts.find(
        (a) => `${ARTIFACT_PREFIX}${a.artifact_id}` === id
      );
      return localize(`artifact_${artifact?.type ?? "device_trigger"}`);
    }
    const device = this._structure?.devices.find(
      (d) => `${DEVICE_PREFIX}${d.device_id}` === id
    );
    return localize(device?.child_device ? "child_device" : "device");
  }

  private _renderGraph(structure: MQTTExplorerStructure) {
    return html`
      <ha-network-graph
        .data=${this._chartData(structure)}
        .selectedNode=${this._focusedNode}
        .hoverFocus=${false}
        .physicsToggle=${false}
        .nodeClickRadius=${NODE_CLICK_RADIUS}
        .tooltipFormatter=${this._tooltipFormatter}
        @chart-click=${this._handleChartClick}
        @chart-zoom-reset=${this._clearFocus}
        @network-legend-changed=${this._handleLegendChange}
      >
        ${!this.narrow ? this._renderInputSearch("search") : nothing}
        <ha-dropdown slot="button" placement="bottom-end">
          <ha-icon-button
            slot="trigger"
            class=${this._hiddenSources.length ? "active" : ""}
            .path=${mdiListStatus}
            .label=${this.hass.localize(
              "ui.panel.config.mqtt.visualization.filter_sources"
            )}
          ></ha-icon-button>
          ${structure.sources.map(
            (source) => html`
              <ha-dropdown-item
                type="checkbox"
                .value=${source.id}
                .checked=${!this._hiddenSources.includes(source.id)}
                @click=${this._toggleSource}
              >
                ${sourceName(source, this.hass.localize)}
              </ha-dropdown-item>
            `
          )}
        </ha-dropdown>
      </ha-network-graph>
    `;
  }

  // Shown next to the focused node
  private _renderNodeActions() {
    if (!configItem(this._focusedNode)) {
      return nothing;
    }
    const canOpen =
      this._focusedNode!.startsWith(ENTITY_PREFIX) ||
      this._focusedNode!.startsWith(DEVICE_PREFIX);
    return html`<div
      class="node-actions"
      @pointerenter=${this._nodeActionsEnter}
      @pointerleave=${this._nodeActionsLeave}
    >
      <ha-icon-button
        class=${this._showConfig ? "active" : ""}
        .path=${mdiCodeBraces}
        @click=${this._toggleConfig}
        .label=${this.hass.localize(
          "ui.panel.config.mqtt.visualization.show_config"
        )}
      ></ha-icon-button>
      ${
        canOpen
          ? html`<ha-icon-button
              .path=${mdiOpenInNew}
              @click=${this._openFocusedDetails}
              .label=${this.hass.localize(
                "ui.panel.config.mqtt.visualization.open_details"
              )}
            ></ha-icon-button>`
          : nothing
      }
    </div>`;
  }

  private _renderInputSearch(slot = "") {
    return html`<ha-input-search
      appearance="outlined"
      slot=${slot}
      .value=${this._searchFilter}
      @input=${this._handleSearchChange}
    ></ha-input-search>`;
  }

  private _chartData(structure: MQTTExplorerStructure) {
    return this._networkData(
      structure,
      this._isMobileSize,
      this._hiddenSources,
      this._focusedNode,
      this._searchFilter,
      this._hiddenCategories,
      this.hass.themes,
      this.hass.localize
    );
  }

  private _networkData = memoizeOne(
    (
      structure: MQTTExplorerStructure,
      isMobileSize: boolean,
      hiddenSources: string[],
      focusedNode: string | undefined,
      searchFilter: string,
      hiddenCategories: string[],
      // The colors and names follow the theme and the language
      _themes: HomeAssistant["themes"],
      _localize: HomeAssistant["localize"]
    ) =>
      // The search fades the graph here, so the links between matches stay
      createMQTTNetworkChartData(
        structure,
        this.hass,
        this,
        isMobileSize,
        hiddenSources,
        focusedNode,
        searchFilter,
        hiddenCategories
      )
  );

  private _handleLegendChange(
    ev: HASSDomEvent<HASSDomEvents["network-legend-changed"]>
  ): void {
    this._hiddenCategories = ev.detail.hidden;
  }

  private _fetchData = async (): Promise<void> => {
    if (this._refreshing) {
      return;
    }
    this._refreshing = true;
    try {
      this._structure = await fetchMQTTExplorerStructure(this.hass);
      this._error = undefined;
    } catch (err: any) {
      this._error =
        err?.code === "not_loaded"
          ? this.hass.localize("ui.panel.config.mqtt.visualization.not_loaded")
          : err?.code === "unknown_command"
            ? this.hass.localize(
                "ui.panel.config.mqtt.visualization.not_supported"
              )
            : err?.message || String(err);
    } finally {
      this._refreshing = false;
    }
  };

  private _toggleSource(ev: Event): void {
    ev.stopPropagation();
    const item = ev.currentTarget as HaDropdownItem;
    const sourceId = item.value as string;
    // The item is not toggled yet when the click is handled
    this._hiddenSources = item.checked
      ? [...this._hiddenSources, sourceId]
      : this._hiddenSources.filter((id) => id !== sourceId);
  }

  private _topicMessages = memoizeOne(
    (live: MQTTTopicMessage[], stored: MQTTTopicMessage[]) => [
      ...live,
      ...stored,
    ]
  );

  // The topics of an entity or artifact node
  private _ownerTopics(nodeId: string): MQTTExplorerEntityTopic[] | undefined {
    if (nodeId.startsWith(ENTITY_PREFIX)) {
      return this._structure?.entities.find(
        (e) => `${ENTITY_PREFIX}${e.entity_id}` === nodeId
      )?.topics;
    }
    return this._structure?.artifacts.find(
      (a) => `${ARTIFACT_PREFIX}${a.artifact_id}` === nodeId
    )?.topics;
  }

  private async _selectTopic(nodeId: string): Promise<void> {
    const { ownerNodeId, direction, topic } = parseTopicNodeId(nodeId);
    const item = configItem(ownerNodeId);
    const ownerTopic = this._ownerTopics(ownerNodeId)?.find(
      (t) => t.topic === topic && t.direction === direction
    );
    if (!item || !ownerTopic) {
      return;
    }
    this._stopLiveMessages();
    // The messages take the place of the configuration
    this._showConfig = false;
    const selection: SelectedTopic = {
      ownerNodeId,
      topic: ownerTopic,
      qos: direction === "publish" ? PUBLISH_TOPIC_QOS : ownerTopic.qos,
    };
    this._selectedTopic = selection;
    this._storedMessages = [];
    this._liveMessages = [];

    const unsub = subscribeMQTTTopic(
      this.hass,
      topic,
      (message: MQTTMessage) => {
        // A message can still arrive while the subscription stops
        if (this._selectedTopic !== selection) {
          return;
        }
        this._liveMessages = [
          this._toTopicMessage(message, new Date(), true),
          ...this._liveMessages,
        ].slice(0, MAX_LIVE_MESSAGES);
      },
      selection.qos
    );
    this._unsubTopic = unsub;
    // An earlier subscription can settle after this one
    unsub.then(
      () => {
        if (this._unsubTopic === unsub) {
          this._topicLive = true;
        }
      },
      () => {
        if (this._unsubTopic === unsub) {
          this._topicLive = false;
        }
      }
    );

    try {
      const details = await fetchMQTTExplorerDetails(this.hass, item);
      if (this._selectedTopic !== selection) {
        return;
      }
      const topicDetails = details.topics.find(
        (t) => t.topic === topic && t.direction === direction
      );
      this._storedMessages = (topicDetails?.messages ?? [])
        .map((message) =>
          this._toTopicMessage(message, new Date(message.time), false)
        )
        .reverse();
    } catch (_err) {
      // Without stored messages the live messages still show
    }
  }

  private _toTopicMessage(
    message: MQTTMessage,
    time: Date,
    live: boolean
  ): MQTTTopicMessage {
    return {
      id: ++this._messageId,
      topic: message.topic,
      payload: message.payload,
      qos: message.qos,
      retain: message.retain,
      time,
      live,
    };
  }

  private _stopLiveMessages(): void {
    this._unsubTopic?.then(
      (unsub) => unsub(),
      () => undefined
    );
    this._unsubTopic = undefined;
    this._topicLive = false;
  }

  private _closeTopic(): void {
    this._stopLiveMessages();
    this._selectedTopic = undefined;
    this._storedMessages = [];
    this._liveMessages = [];
  }

  private _toggleFocus(nodeId: string): void {
    this._focusedNode = this._focusedNode === nodeId ? undefined : nodeId;
  }

  private _clearFocus(): void {
    this._focusedNode = undefined;
  }

  private _openFocusedDetails(): void {
    const id = this._focusedNode;
    if (id?.startsWith(ENTITY_PREFIX)) {
      fireEvent(this, "hass-more-info", {
        entityId: id.substring(ENTITY_PREFIX.length),
      });
    } else if (id?.startsWith(DEVICE_PREFIX)) {
      navigate(`/config/devices/device/${id.substring(DEVICE_PREFIX.length)}`);
    }
  }

  private _handleSearchChange(ev: HASSDomTargetEvent<HaInputSearch>): void {
    this._searchFilter = ev.target.value ?? "";
  }

  private _tooltipFormatter = (params: TopLevelFormatterParams) => {
    const { dataType, data } = params as CallbackDataParams;
    if (dataType === "edge") {
      return nothing;
    }
    const id: string = (data as any).id;
    const info = this._nodeInfo(id);
    if (!info || !id.startsWith(TOPIC_PREFIX)) {
      return info ?? nothing;
    }
    return html`${info}<br /><i
        >${this.hass.localize(
          "ui.panel.config.mqtt.visualization.click_topic"
        )}</i
      >`;
  };

  private _renderNodeId(nodeIds: string[]) {
    if (!nodeIds.length) {
      return nothing;
    }
    return html`<br /><b
        >${this.hass.localize(
          "ui.panel.config.mqtt.visualization.node_id"
        )}: </b
      >${nodeIds.join(", ")}`;
  }

  // The information about a node, for its tooltip
  private _nodeInfo(id: string): TemplateResult | undefined {
    if (!this._structure) {
      return undefined;
    }
    const localize = this.hass.localize;
    if (id.startsWith(SOURCE_PREFIX)) {
      const source = this._structure.sources.find(
        (s) => `${SOURCE_PREFIX}${s.id}` === id
      );
      if (!source) {
        return undefined;
      }
      const devices = this._structure.devices.filter((d) =>
        d.sources.includes(source.id)
      ).length;
      const entities = this._structure.entities.filter(
        (e) => e.source === source.id
      ).length;
      return html`<b>${sourceName(source, localize)}</b>${
          source.sw_version
            ? html`<br /><b
                  >${localize("ui.panel.config.mqtt.visualization.version")}: </b
                >${source.sw_version}`
            : nothing
        }<br />${localize("ui.panel.config.mqtt.device_count", {
          count: devices,
        })}<br />${localize("ui.panel.config.mqtt.entity_count", {
          count: entities,
        })}`;
    }
    if (id.startsWith(DEVICE_PREFIX)) {
      const device = this._structure.devices.find(
        (d) => `${DEVICE_PREFIX}${d.device_id}` === id
      );
      if (!device) {
        return undefined;
      }
      const deviceEntities = this._structure.entities.filter(
        (e) => e.device_id === device.device_id
      );
      // Discovered items of a device usually share their node ID
      const nodeIds = [
        ...new Set(
          [
            ...deviceEntities,
            ...this._structure.artifacts.filter(
              (a) => a.device_id === device.device_id
            ),
          ].flatMap((item) => (item.node_id ? [item.node_id] : []))
        ),
      ];
      return html`<b>${device.name ?? device.device_id}</b>${
          device.child_device
            ? html`<br />${localize(
                  "ui.panel.config.mqtt.visualization.child_device"
                )}`
            : nothing
        }${this._renderNodeId(nodeIds)}<br />${localize(
          "ui.panel.config.mqtt.entity_count",
          { count: deviceEntities.length }
        )}`;
    }
    if (id.startsWith(ENTITY_PREFIX)) {
      const entity = this._structure.entities.find(
        (e) => `${ENTITY_PREFIX}${e.entity_id}` === id
      );
      if (!entity) {
        return undefined;
      }
      const stateObj = this.hass.states[entity.entity_id];
      return html`<b>${entity.name ?? entity.entity_id}</b><br />${
          entity.entity_id
        }${this._renderNodeId(entity.node_id ? [entity.node_id] : [])}${
          entity.available
            ? nothing
            : html`<br />${localize(
                  "ui.panel.config.mqtt.visualization.unavailable"
                )}`
        }${
          stateObj && entity.available
            ? html`<br /><b
                  >${localize("ui.panel.config.mqtt.visualization.state")}: </b
                >${
                  // A state without a value can come through as "None"
                  !stateObj.state || stateObj.state.toLowerCase() === "none"
                    ? localize("state.default.unknown")
                    : this.hass.formatEntityState(stateObj)
                }<br />${formatDateTimeWithSeconds(
                  new Date(stateObj.last_changed),
                  this.hass.locale,
                  this.hass.config
                )}`
            : nothing
        }<br />${localize("ui.panel.config.mqtt.visualization.topic_count", {
          count: entity.topics.length,
        })}`;
    }
    if (id.startsWith(TOPIC_PREFIX)) {
      const { direction, topic } = parseTopicNodeId(id);
      const isPublish = direction === "publish";
      const message = this._lastMessages[`${direction}:${topic}`];
      return html`<b>${topic}</b><br />${localize(
          isPublish
            ? "ui.panel.config.mqtt.visualization.publish_topic"
            : "ui.panel.config.mqtt.visualization.subscribe_topic"
        )}${
          message
            ? html`<br /><b
                  >${localize(
                    isPublish
                      ? "ui.panel.config.mqtt.visualization.last_sent"
                      : "ui.panel.config.mqtt.visualization.last_received"
                  )}: </b
                >${formatDateTimeWithSeconds(
                  new Date(message.time),
                  this.hass.locale,
                  this.hass.config
                )}<br /><code>${shortPayload(message.payload)}</code>`
            : nothing
        }`;
    }
    if (id.startsWith(ARTIFACT_PREFIX)) {
      const artifact = this._structure.artifacts.find(
        (a) => `${ARTIFACT_PREFIX}${a.artifact_id}` === id
      );
      if (!artifact) {
        return undefined;
      }
      return html`<b>${artifact.artifact_id.split(":").slice(1).join(":")}</b
        ><br />${localize(
          `ui.panel.config.mqtt.visualization.artifact_${artifact.type}`
        )}`;
    }
    if (id === BROKER_NODE_ID) {
      const { broker } = this._structure;
      return html`<b>${localize("ui.panel.config.mqtt.visualization.broker")}</b
        ><br />${broker.host}:${broker.port}<br /><span
          style="color: ${
            broker.connected ? "var(--success-color)" : "var(--error-color)"
          }"
          >${localize(
            broker.connected
              ? "ui.panel.config.mqtt.visualization.connected"
              : "ui.panel.config.mqtt.visualization.disconnected"
          )}</span
        >`;
    }
    if (id.startsWith(NO_DEVICE_PREFIX)) {
      return html`<b
        >${localize("ui.panel.config.mqtt.visualization.no_linked_device")}</b
      >`;
    }
    return undefined;
  }

  private _handleChartClick(e: CustomEvent): void {
    if (e.detail.dataType !== "node") {
      return;
    }
    const id: string = e.detail.data.id;
    if (id.startsWith(TOPIC_PREFIX)) {
      this._selectTopic(id);
      // The messages panel narrows the graph, which leaves the tooltip behind.
      // The tooltip handles the same click after this, so it is hidden once
      // the panel is shown.
      this.updateComplete.then(() =>
        requestAnimationFrame(() =>
          this.shadowRoot!.querySelector("ha-network-graph")?.hideTooltip()
        )
      );
    } else if (isFocusable(id)) {
      this._toggleFocus(id);
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .layout {
          display: flex;
          height: 100%;
        }
        .graph {
          position: relative;
          flex: 1;
          min-width: 0;
          height: 100%;
          /* The chart is resized after the messages panel opens */
          overflow: hidden;
        }
        .node-actions {
          position: absolute;
          top: 0;
          left: 0;
          display: flex;
          background-color: var(--card-background-color);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-pill);
          box-shadow: var(--ha-card-box-shadow, none);
          --ha-icon-button-size: 32px;
          --mdc-icon-size: 18px;
          /* Shown once it is placed next to its node */
          visibility: hidden;
        }
        .node-actions .active {
          color: var(--primary-color);
        }
        ha-network-graph {
          height: 100%;
        }
        aside {
          width: 400px;
          flex-shrink: 0;
          box-sizing: border-box;
          padding: var(--ha-space-4);
          overflow-y: auto;
          border-inline-start: 1px solid var(--divider-color);
          background: var(--card-background-color);
        }
        :host([narrow]) .layout {
          flex-direction: column;
        }
        :host([narrow]) aside {
          width: auto;
          max-height: 50%;
          border-inline-start: none;
          border-top: 1px solid var(--divider-color);
        }
        [slot="header"] {
          display: flex;
          align-items: center;
        }
        ha-input-search {
          flex: 1;
        }
        /* The chart only styles its direct buttons, so match the filter button */
        ha-dropdown ha-icon-button {
          margin-inline-end: var(--ha-space-3);
          background: var(--card-background-color);
          border-radius: var(--ha-border-radius-sm);
          --ha-icon-button-size: 32px;
          color: var(--primary-color);
          border: 1px solid var(--divider-color);
        }
        ha-dropdown ha-icon-button.active {
          border-color: var(--primary-color);
          background: var(--ha-color-fill-primary-quiet-resting);
        }
        .center {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          padding: var(--ha-space-4);
          box-sizing: border-box;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-network-visualization-page": MQTTNetworkVisualizationPage;
  }
}

import {
  mdiCodeBraces,
  mdiFileTree,
  mdiHubOutline,
  mdiInformationOutline,
  mdiListStatus,
} from "@mdi/js";
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
import { deepEqual } from "../../../../../common/util/deep-equal";
import "../../../../../components/chart/ha-network-graph";
import "../../../../../components/ha-adaptive-dialog";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-dropdown";
import "../../../../../components/ha-dropdown-item";
import type { HaDropdownSelectEvent } from "../../../../../components/ha-dropdown";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-spinner";
import "../../../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../../../components/input/ha-input-search";
import {
  getConfigEntries,
  getSubEntries,
} from "../../../../../data/config_entries";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { showSubConfigFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-sub-config-flow";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
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
  SUBENTRIES_NODE_ID,
  TOPIC_PREFIX,
} from "./mqtt-network-data";
import "./mqtt-config-view";
import "./mqtt-topic-messages";
import type { MQTTTopicMessage } from "./mqtt-topic-messages";

const REFRESH_INTERVAL = 30000;

// Live messages kept for the topic that is shown
const MAX_LIVE_MESSAGES = 100;

// The broker lowers the QoS of a message to that of the subscription, so only
// QoS 2 shows the QoS Home Assistant published with
const PUBLISH_TOPIC_QOS = 2;

const SUBENTRY_SOURCE_PREFIX = "subentry:";

// A focused device shows its items, so these start switched off in the legend
const DEFAULT_HIDDEN_CATEGORIES = [
  "entity",
  "artifact_device_trigger",
  "artifact_tag",
];

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
  id === SUBENTRIES_NODE_ID ||
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

  @state()
  @storage({
    key: "mqtt-visualization-tree-layout",
    state: true,
    subscribe: false,
  })
  private _treeLayout = false;

  // The device or entity node that is centered, while the rest is faded
  @state() private _focusedNode?: string;

  // The details dialog of a narrow screen is sliding away
  @state() private _closingDetails = false;

  // The legend categories that are switched off, whose nodes are faded.
  // Until the legend is used, the entities, triggers and tags are off.
  @state() private _hiddenCategories?: string[];

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
    // The subscription stops, so the topic would no longer be live on return
    this._closeTopic();
  }

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);
    this._fetchData();
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if (this.shadowRoot!.querySelector(".node-actions")) {
      this._placeNodeActions();
    } else {
      // Removed actions get no pointerleave
      this._nodeActionsHovered = false;
    }
  }

  // Keeps the actions next to their node, on every frame the graph draws
  private _placeNodeActions = (): void => {
    const actions =
      this.shadowRoot!.querySelector<HTMLElement>(".node-actions");
    const graph = this.shadowRoot!.querySelector("ha-network-graph");
    if (!actions || !graph || !this._focusedNode || this._nodeActionsHovered) {
      return;
    }
    const position = graph.getNodePosition(this._focusedNode);
    if (!position) {
      actions.style.visibility = "hidden";
      return;
    }
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
  };

  private _nodeActionsEnter(): void {
    this._nodeActionsHovered = true;
  }

  private _nodeActionsLeave(): void {
    this._nodeActionsHovered = false;
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
    const hasTopics =
      this._focusedNode?.startsWith(ENTITY_PREFIX) ||
      this._focusedNode?.startsWith(ARTIFACT_PREFIX);
    if (
      hasTopics &&
      (this._lastMessagesNode !== this._focusedNode ||
        (changedProperties as PropertyValues).has("_structure"))
    ) {
      this._fetchLastMessages(this._focusedNode!);
    } else if (!hasTopics && this._lastMessagesNode) {
      // Only entities, triggers and tags have stored messages
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
      details = await fetchMQTTExplorerDetails(this.hass, configItem(nodeId)!);
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
    let found: [ConfigEntry, string] | undefined;
    try {
      const entries = await getConfigEntries(this.hass, { domain: "mqtt" });
      for (const entry of entries) {
        // eslint-disable-next-line no-await-in-loop
        const subentries = await getSubEntries(
          this.hass.callWS,
          entry.entry_id
        );
        const subentry = subentries.find(
          (sub) => sub.subentry_id === subentryId
        );
        if (subentry) {
          found = [entry, subentry.subentry_type];
          break;
        }
      }
    } catch (err: any) {
      showAlertDialog(this, { text: err?.message || String(err) });
      return;
    }
    if (found) {
      showSubConfigFlowDialog(this, found[0], found[1], {
        startFlowHandler: found[0].entry_id,
        subEntryId: subentryId,
      });
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
    const details = this._renderDetails(this._structure);
    return html`<div class="layout">
      <div class="graph">
        ${this._renderGraph(this._structure)} ${this._renderNodeActions()}
      </div>
      ${
        details === nothing
          ? nothing
          : this.narrow
            ? html`<ha-adaptive-dialog
                .open=${!this._closingDetails}
                .accessibleLabel=${
                  this._selectedTopic?.topic.topic ??
                  this._nodeName(this._focusedNode!)
                }
                without-header
                @closed=${this._handleDetailsDialogClosed}
                >${details}</ha-adaptive-dialog
              >`
            : html`<aside>${details}</aside>`
      }
    </div>`;
  }

  private _renderDetails(structure: MQTTExplorerStructure) {
    if (this._selectedTopic) {
      return html`<mqtt-topic-messages
        .topic=${this._selectedTopic.topic}
        .messages=${this._topicMessages(
          this._liveMessages,
          this._storedMessages
        )}
        .live=${this._topicLive}
        .qos=${this._selectedTopic.qos}
        @mqtt-topic-messages-closed=${this._closeDetails}
      ></mqtt-topic-messages>`;
    }
    if (!this._showConfig || !configItem(this._focusedNode)) {
      return nothing;
    }
    const focusedNode = this._focusedNode!;
    return html`<mqtt-config-view
      .name=${this._nodeName(focusedNode)}
      .kind=${this._nodeKind(focusedNode)}
      .configs=${this._configs}
      .failed=${this._configFailed}
      .sources=${structure.sources}
      .platform=${
        focusedNode.startsWith(ENTITY_PREFIX)
          ? focusedNode.substring(ENTITY_PREFIX.length).split(".")[0]
          : undefined
      }
      .device=${focusedNode.startsWith(DEVICE_PREFIX)}
      .yamlEntity=${structure.entities.some(
        (entity) =>
          `${ENTITY_PREFIX}${entity.entity_id}` === focusedNode &&
          entity.source === "yaml"
      )}
      .openable=${
        focusedNode.startsWith(ENTITY_PREFIX) ||
        focusedNode.startsWith(DEVICE_PREFIX)
      }
      @mqtt-config-view-closed=${this._closeDetails}
      @mqtt-config-view-open=${this._openFocusedDetails}
      @mqtt-config-view-reconfigure=${this._reconfigureSubentry}
    ></mqtt-config-view>`;
  }

  // The dialog of a narrow screen slides away before its content goes
  private _closeDetails(): void {
    if (this.narrow) {
      this._closingDetails = true;
      return;
    }
    this._closeTopic();
    this._closeConfig();
  }

  private _handleDetailsDialogClosed(ev: Event): void {
    // Not a closed event of something in the dialog
    if (ev.target !== ev.currentTarget) {
      return;
    }
    this._closingDetails = false;
    this._closeTopic();
    this._closeConfig();
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
        .nodeClickRadius=${NODE_CLICK_RADIUS}
        .fixedLayout=${this._treeLayout}
        .animateStyleChanges=${true}
        .animateViewChanges=${true}
        .hiddenCategories=${this._legendHiddenCategories()}
        .tooltipFormatter=${this._tooltipFormatter}
        @chart-click=${this._handleChartClick}
        @chart-zoom-reset=${this._clearFocus}
        @network-legend-changed=${this._handleLegendChange}
        @network-graph-rendered=${this._placeNodeActions}
      >
        ${!this.narrow ? this._renderInputSearch("search") : nothing}
        <ha-icon-button
          slot="button"
          class="layout-toggle ${this._treeLayout ? "active" : ""}"
          .ariaPressed=${this._treeLayout ? "true" : "false"}
          .path=${this._treeLayout ? mdiHubOutline : mdiFileTree}
          .label=${this.hass.localize(
            "ui.panel.config.mqtt.visualization.toggle_tree_layout"
          )}
          @click=${this._toggleTreeLayout}
        ></ha-icon-button>
        <ha-dropdown
          slot="button"
          placement="bottom-end"
          @wa-select=${this._toggleSource}
        >
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
    const isEntity = this._focusedNode!.startsWith(ENTITY_PREFIX);
    const canOpen = isEntity || this._focusedNode!.startsWith(DEVICE_PREFIX);
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
              .path=${mdiInformationOutline}
              @click=${this._openFocusedDetails}
              .label=${this.hass.localize(
                isEntity
                  ? "ui.panel.config.mqtt.visualization.show_more_info"
                  : "ui.panel.config.mqtt.visualization.go_to_device"
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
      this._legendHiddenCategories(),
      this._treeLayout,
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
      treeLayout: boolean,
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
        hiddenCategories,
        treeLayout
      )
  );

  private _legendHiddenCategories(): string[] {
    return (
      this._hiddenCategories ??
      this._defaultHiddenCategories(this.hass.localize)
    );
  }

  private _defaultHiddenCategories = memoizeOne(
    (localize: HomeAssistant["localize"]) =>
      DEFAULT_HIDDEN_CATEGORIES.map((key) =>
        localize(`ui.panel.config.mqtt.visualization.${key}` as LocalizeKeys)
      )
  );

  private _toggleTreeLayout(): void {
    this._treeLayout = !this._treeLayout;
  }

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
      const structure = await fetchMQTTExplorerStructure(this.hass);
      // A new structure lays out the graph again and fetches the last messages
      if (!deepEqual(structure, this._structure)) {
        this._structure = structure;
      } else if (this._lastMessagesNode) {
        // The structure has no messages, so the tooltips would show old ones
        this._fetchLastMessages(this._lastMessagesNode);
      }
      this._error = undefined;
    } catch (err: any) {
      // A failed refresh, e.g. during a reconnect, keeps the map shown
      if (this._structure) {
        return;
      }
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

  private _toggleSource(ev: HaDropdownSelectEvent): void {
    // Keeps the menu open for the next source
    ev.preventDefault();
    const { value, checked } = ev.detail.item;
    // The dropdown toggled the item already
    this._hiddenSources = checked
      ? this._hiddenSources.filter((id) => id !== value)
      : [...this._hiddenSources, value];
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

  // A deselected node passes the focus to its parent, as the nodes it
  // revealed fold away and would leave the view on an empty spot
  private _toggleFocus(nodeId: string): void {
    this._focusedNode =
      this._focusedNode === nodeId ? this._parentNode(nodeId) : nodeId;
  }

  // The first parent, as in the tree layout
  private _parentNode(nodeId: string): string | undefined {
    return this._structure
      ? this._chartData(this._structure).links.find(
          (link) => link.target === nodeId
        )?.source
      : undefined;
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
          "ui.panel.config.mqtt.visualization.select_topic"
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
    if (id === SUBENTRIES_NODE_ID) {
      const subentrySourceIds = new Set(
        this._structure.sources
          .filter((s) => s.type === "subentry")
          .map((s) => s.id)
      );
      const devices = this._structure.devices.filter((d) =>
        d.sources.some((source) => subentrySourceIds.has(source))
      ).length;
      const entities = this._structure.entities.filter(
        (e) => e.source && subentrySourceIds.has(e.source)
      ).length;
      return html`<b
          >${localize("ui.panel.config.mqtt.visualization.source_subentries")}</b
        ><br />${localize("ui.panel.config.mqtt.device_count", {
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
                >${this.hass.formatEntityState(stateObj)}<br />${formatDateTimeWithSeconds(
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
        /* Buttons a finger can hit, like in the configuration panel */
        @media (pointer: coarse) {
          .node-actions {
            --ha-icon-button-size: 40px;
            --mdc-icon-size: 20px;
          }
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
        /* Clear of the handle of the sheet, as the details have their own header */
        ha-adaptive-dialog {
          --dialog-content-padding: var(--ha-space-5) var(--ha-space-6)
            var(--ha-space-6);
        }
        [slot="header"] {
          display: flex;
          align-items: center;
        }
        ha-input-search {
          flex: 1;
        }
        /* Above the zoom reset button of the chart, which comes and goes */
        .layout-toggle {
          order: -1;
        }
        ha-dropdown ha-icon-button {
          margin-inline-end: var(--ha-space-3);
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

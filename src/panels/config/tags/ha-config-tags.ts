import {
  mdiCog,
  mdiContentDuplicate,
  mdiHelpCircle,
  mdiPlus,
  mdiRobot,
} from "@mdi/js";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-relative-time";
import { showAutomationEditor, TagTrigger } from "../../../data/automation";
import {
  createTag,
  deleteTag,
  EVENT_TAG_SCANNED,
  fetchTags,
  Tag,
  TagScannedEvent,
  updateTag,
  UpdateTagParams,
} from "../../../data/tag";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { configSections } from "../ha-panel-config";
import { showTagDetailDialog } from "./show-dialog-tag-detail";
import "./tag-image";

export interface TagRowData extends Tag {
  display_name: string;
  last_scanned_datetime: Date | null;
}

@customElement("ha-config-tags")
export class HaConfigTags extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @state() private _tags: Tag[] = [];

  private get _canWriteTags() {
    return this.hass.auth.external?.config.canWriteTag;
  }

  private _columns = memoizeOne((narrow: boolean, _language) => {
    const columns: DataTableColumnContainer<TagRowData> = {
      icon: {
        title: "",
        label: this.hass.localize("ui.panel.config.tag.headers.icon"),
        type: "icon",
        template: (tag) => html`<tag-image .tag=${tag}></tag-image>`,
      },
      display_name: {
        title: this.hass.localize("ui.panel.config.tag.headers.name"),
        main: true,
        sortable: true,
        filterable: true,
        grows: true,
        template: (tag) =>
          html`${tag.name}
          ${narrow
            ? html`<div class="secondary">
                ${tag.last_scanned_datetime
                  ? html`<ha-relative-time
                      .hass=${this.hass}
                      .datetime=${tag.last_scanned_datetime}
                      capitalize
                    ></ha-relative-time>`
                  : this.hass.localize("ui.panel.config.tag.never_scanned")}
              </div>`
            : ""}`,
      },
    };
    if (!narrow) {
      columns.last_scanned_datetime = {
        title: this.hass.localize("ui.panel.config.tag.headers.last_scanned"),
        sortable: true,
        direction: "desc",
        width: "20%",
        template: (tag) => html`
          ${tag.last_scanned_datetime
            ? html`<ha-relative-time
                .hass=${this.hass}
                .datetime=${tag.last_scanned_datetime}
                capitalize
              ></ha-relative-time>`
            : this.hass.localize("ui.panel.config.tag.never_scanned")}
        `,
      };
    }
    if (this._canWriteTags) {
      columns.write = {
        title: "",
        label: this.hass.localize("ui.panel.config.tag.headers.write"),
        type: "icon-button",
        template: (tag) =>
          html` <ha-icon-button
            .tag=${tag}
            @click=${this._handleWriteClick}
            .label=${this.hass.localize("ui.panel.config.tag.write")}
            .path=${mdiContentDuplicate}
          ></ha-icon-button>`,
      };
    }
    columns.automation = {
      title: "",
      type: "icon-button",
      template: (tag) =>
        html` <ha-icon-button
          .tag=${tag}
          @click=${this._handleAutomationClick}
          .label=${this.hass.localize("ui.panel.config.tag.create_automation")}
          .path=${mdiRobot}
        ></ha-icon-button>`,
    };
    columns.edit = {
      title: "",
      type: "icon-button",
      template: (tag) =>
        html` <ha-icon-button
          .tag=${tag}
          @click=${this._handleEditClick}
          .label=${this.hass.localize("ui.panel.config.tag.edit")}
          .path=${mdiCog}
        ></ha-icon-button>`,
    };
    return columns;
  });

  private _data = memoizeOne((tags: Tag[]): TagRowData[] =>
    tags.map((tag) => ({
      ...tag,
      display_name: tag.name || tag.id,
      last_scanned_datetime: tag.last_scanned
        ? new Date(tag.last_scanned)
        : null,
    }))
  );

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._fetchTags();
  }

  protected hassSubscribe() {
    return [
      this.hass.connection.subscribeEvents<TagScannedEvent>((ev) => {
        const foundTag = this._tags.find((tag) => tag.id === ev.data.tag_id);
        if (!foundTag) {
          this._fetchTags();
          return;
        }
        foundTag.last_scanned = ev.time_fired;
        this._tags = [...this._tags];
      }, EVENT_TAG_SCANNED),
    ];
  }

  protected render() {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.tags}
        .columns=${this._columns(this.narrow, this.hass.language)}
        .data=${this._data(this._tags)}
        .noDataText=${this.hass.localize("ui.panel.config.tag.no_tags")}
        hasFab
      >
        <ha-icon-button
          slot="toolbar-icon"
          @click=${this._showHelp}
          .label=${this.hass.localize("ui.common.help")}
          .path=${mdiHelpCircle}
        ></ha-icon-button>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize("ui.panel.config.tag.add_tag")}
          extended
          @click=${this._addTag}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _handleWriteClick = (ev: Event) =>
    this._openWrite((ev.currentTarget as any).tag);

  private _handleAutomationClick = (ev: Event) => {
    const tag = (ev.currentTarget as any).tag;
    const data = {
      alias: this.hass.localize(
        "ui.panel.config.tag.automation_title",
        "name",
        tag.name || tag.id
      ),
      trigger: [{ platform: "tag", tag_id: tag.id } as TagTrigger],
    };
    showAutomationEditor(data);
  };

  private _handleEditClick = (ev: Event) =>
    this._openDialog((ev.currentTarget as any).tag);

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.tag.caption"),
      text: html`
        <p>
          ${this.hass.localize(
            "ui.panel.config.tag.detail.usage",
            "companion_link",
            html`<a
              href="https://companion.home-assistant.io/"
              target="_blank"
              rel="noreferrer"
              >${this.hass!.localize(
                "ui.panel.config.tag.detail.companion_apps"
              )}</a
            >`
          )}
        </p>
        <p>
          <a
            href=${documentationUrl(this.hass, "/integrations/tag/")}
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize("ui.panel.config.tag.learn_more")}
          </a>
        </p>
      `,
    });
  }

  private async _fetchTags() {
    this._tags = await fetchTags(this.hass);
  }

  private _openWrite(tag: Tag) {
    this.hass.auth.external!.fireMessage({
      type: "tag/write",
      payload: { name: tag.name || null, tag: tag.id },
    });
  }

  private _addTag() {
    this._openDialog();
  }

  private _openDialog(entry?: Tag) {
    showTagDetailDialog(this, {
      entry,
      openWrite: this._canWriteTags ? (tag) => this._openWrite(tag) : undefined,
      createEntry: (values, tagId) => this._createTag(values, tagId),
      updateEntry: entry
        ? (values) => this._updateTag(entry, values)
        : undefined,
      removeEntry: entry ? () => this._removeTag(entry) : undefined,
    });
  }

  private async _createTag(
    values: Partial<UpdateTagParams>,
    tagId?: string
  ): Promise<Tag> {
    const newTag = await createTag(this.hass, values, tagId);
    this._tags = [...this._tags, newTag];
    return newTag;
  }

  private async _updateTag(
    selectedTag: Tag,
    values: Partial<UpdateTagParams>
  ): Promise<Tag> {
    const updated = await updateTag(this.hass, selectedTag.id, values);
    this._tags = this._tags.map((tag) =>
      tag.id === selectedTag.id ? updated : tag
    );
    return updated;
  }

  private async _removeTag(selectedTag: Tag) {
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass!.localize("ui.panel.config.tag.confirm_remove_title"),
        text: this.hass.localize(
          "ui.panel.config.tag.confirm_remove",
          "tag",
          selectedTag.name || selectedTag.id
        ),
        dismissText: this.hass!.localize("ui.common.cancel"),
        confirmText: this.hass!.localize("ui.common.remove"),
      }))
    ) {
      return false;
    }
    try {
      await deleteTag(this.hass, selectedTag.id);
      this._tags = this._tags.filter((tag) => tag.id !== selectedTag.id);
      return true;
    } catch (err: any) {
      return false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-tags": HaConfigTags;
  }
}

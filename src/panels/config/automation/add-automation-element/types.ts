import type { TemplateResult } from "lit";
import type { PickerComboBoxItem } from "../../../../components/ha-picker-combo-box";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../../common/translations/localize";
import type { ConditionDescriptions } from "../../../../data/condition";
import type { DomainManifestLookup } from "../../../../data/integration";
import type { SingleHassServiceTarget } from "../../../../data/target";
import type { TriggerDescriptions } from "../../../../data/trigger";
import type { HomeAssistant } from "../../../../types";
import type { AddAutomationElementDialogParams } from "../show-add-automation-element-dialog";

export type AddElementType = AddAutomationElementDialogParams["type"];

export type AddElementTab = "targets" | "groups" | "blocks";

export interface AddAutomationElementListItem {
  key: string;
  name: string;
  description: string;
  iconPath?: string;
  icon?: TemplateResult;
}

export interface ItemsSection {
  title: string;
  items: AddAutomationElementListItem[];
}

export interface CollectionGroup {
  collectionIndex: number;
  titleKey?: LocalizeKeys;
  generic?: boolean;
  groups: AddAutomationElementListItem[];
}

export interface AutomationItemComboBoxItem extends PickerComboBoxItem {
  renderedIcon?: TemplateResult;
  type: "trigger" | "condition" | "action" | "block";
}

export interface RecentElement {
  item: AddAutomationElementListItem;
  groupName?: string;
}

export type CollectionGroupType = "helper" | "dynamic" | "integration";

/** System domains whose elements apply to entities of other domains. */
export interface SystemDomains {
  active: Set<string>;
  // entity domain → system domains that cover it
  byEntityDomain: Map<string, Set<string>>;
}

// Created once per change of its inputs, so it can be used as a memo key
export interface ElementSources {
  type: AddElementType;
  localize: LocalizeFunc;
  language: string;
  services: HomeAssistant["services"];
  triggerDescriptions: TriggerDescriptions;
  conditionDescriptions: ConditionDescriptions;
  manifests?: DomainManifestLookup;
}

export interface AddElementHistoryData {
  // dialog instance that pushed the entry, entries can outlive a page reload
  dialogId: string;
  // number of history entries the dialog pushed up to this one
  depth: number;
  target?: SingleHassServiceTarget;
  group?: string;
  collectionIndex?: number;
  // tab the group was picked in, time & location groups live in the target tree
  tab?: AddElementTab;
}

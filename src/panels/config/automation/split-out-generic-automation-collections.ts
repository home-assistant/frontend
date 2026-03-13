import type { LocalizeKeys } from "../../../common/translations/localize";

interface CollectionGroupItem {
  key: string;
}

export interface AutomationDialogCollection<T extends CollectionGroupItem> {
  collectionIndex: number;
  titleKey?: LocalizeKeys;
  groups: T[];
}

const GENERIC_GROUPS = new Set(["device", "entity"]);

export const splitOutGenericAutomationCollections = <
  T extends CollectionGroupItem,
>(
  type: "trigger" | "condition" | "action",
  collection: AutomationDialogCollection<T>,
  newTriggersAndConditions: boolean
): AutomationDialogCollection<T>[] => {
  if (
    !newTriggersAndConditions ||
    !["trigger", "condition"].includes(type) ||
    !collection.groups.some((group) => GENERIC_GROUPS.has(group.key))
  ) {
    return [collection];
  }

  const genericGroups = collection.groups.filter((group) =>
    GENERIC_GROUPS.has(group.key)
  );

  const mainGroups = collection.groups.filter(
    (group) => !GENERIC_GROUPS.has(group.key)
  );

  return [
    ...(mainGroups.length
      ? [
          {
            ...collection,
            groups: mainGroups,
          },
        ]
      : []),
    {
      collectionIndex: collection.collectionIndex,
      titleKey: "ui.panel.config.automation.editor.generic" as LocalizeKeys,
      groups: genericGroups,
    },
  ];
};

import { fireEvent } from "../../../common/dom/fire_event";
import type {
  CompatibilityResult,
  MigrationResult,
  ScanResult,
} from "../../../data/entity_migration";

export interface EntityMigrationPreviewDialogParams {
  sourceEntityId: string;
  targetEntityId: string;
  scanResult: ScanResult;
  compatibilityResult: CompatibilityResult;
  onMigrationComplete?: (result: MigrationResult) => void;
}

export const loadEntityMigrationPreviewDialog = () =>
  import("./dialog-entity-migration-preview");

export const showEntityMigrationPreviewDialog = (
  element: HTMLElement,
  params: EntityMigrationPreviewDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-entity-migration-preview",
    dialogImport: loadEntityMigrationPreviewDialog,
    dialogParams: params,
  });
};

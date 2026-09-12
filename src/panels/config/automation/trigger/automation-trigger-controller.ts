import { ContextConsumer, ContextProvider } from "@lit/context";
import type { LitElement, ReactiveController } from "lit";
import memoizeOne from "memoize-one";
import type {
  AutomationConfig,
  TriggerCondition,
} from "../../../../data/automation";
import { internationalizationContext } from "../../../../data/context";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import {
  assignGeneratedTriggerIds,
  automationTriggerContext,
  cleanupRemovedGeneratedTriggerReferences,
  cleanupUnusedGeneratedTriggerIds,
  getTriggerIdOptions,
  getExplicitTriggerIds,
  isGeneratedTriggerId,
  makeDuplicateTriggerIdsUnique,
  updateTriggerCondition,
} from "./automation-trigger-id";
import { preserveAutomationRowKeys } from "../ha-automation-sortable-list-mixin";

interface AutomationTriggerControllerOptions {
  /** Read the editor's current configuration, including after an awaited dialog. */
  getConfig: () => AutomationConfig | undefined;
  canEdit: () => boolean;
  /** Apply one complete change through the editor's undo and dirty-state handling. */
  commit: (config: AutomationConfig) => void;
}

/**
 * Coordinates trigger-ID editing.
 *
 * Descendants consume shared options and callbacks through automationTriggerContext.
 * A selection assigns any missing trigger IDs and updates the referencing condition
 * in one commit. Duplicate-ID migration uses the same commit path. Ordinary trigger
 * edits instead pass through cleanupRemovedIds before the editor commits them.
 *
 * The transformation helpers only change configuration. This controller preserves
 * the corresponding row keys so an open sidebar continues to track the edited row.
 */
export class AutomationTriggerController implements ReactiveController {
  private _i18n: ContextConsumer<
    typeof internationalizationContext,
    LitElement
  >;

  private _provider: ContextProvider<typeof automationTriggerContext>;

  // Unassigned options contain candidate IDs. Reuse them until the trigger list
  // changes, so rendering and selection use the same IDs across host updates.
  private _getTriggerIdOptions = memoizeOne(getTriggerIdOptions);

  constructor(
    private _host: LitElement,
    private _options: AutomationTriggerControllerOptions
  ) {
    this._i18n = new ContextConsumer(_host, {
      context: internationalizationContext,
      subscribe: true,
    });
    this._provider = new ContextProvider(_host, {
      context: automationTriggerContext,
      initialValue: {
        options: [],
        select: this._selectTriggerIds,
        fixDuplicateIds: this._fixDuplicateTriggerIds,
      },
    });
    _host.addController(this);
  }

  /** Publish options before descendants render, including after undo or redo. */
  public hostUpdate() {
    const config = this._options.getConfig();
    if (!config) {
      return;
    }
    const options = this._getTriggerIdOptions(config.triggers);
    if (options !== this._provider.value.options) {
      this._provider.setValue({ ...this._provider.value, options });
    }
  }

  /**
   * Prepare an ordinary editor update without committing it. Reconcile keys against
   * the incoming configuration, not the previous one: the user may have reordered
   * or deleted triggers, while cleanup itself only changes condition references.
   */
  public cleanupRemovedIds(config: AutomationConfig): AutomationConfig {
    const current = this._options.getConfig();
    const previousIds = new Set(
      current ? getExplicitTriggerIds(current.triggers) : []
    );
    const nextIds = new Set(getExplicitTriggerIds(config.triggers));
    const removedIds = new Set(
      [...previousIds].filter(
        (id) => isGeneratedTriggerId(id) && !nextIds.has(id)
      )
    );
    let cleaned = cleanupUnusedGeneratedTriggerIds(config);
    cleaned = cleanupRemovedGeneratedTriggerReferences(cleaned, removedIds);
    preserveAutomationRowKeys(config, cleaned);
    return cleaned;
  }

  private _selectTriggerIds = (condition: TriggerCondition, ids: string[]) => {
    const config = this._options.getConfig();
    if (!config || !this._options.canEdit()) {
      return;
    }
    const triggers = assignGeneratedTriggerIds(
      config.triggers,
      this._getTriggerIdOptions(config.triggers),
      ids
    );
    const updated = updateTriggerCondition(
      config,
      condition,
      { ...condition, id: ids.length ? ids : "" },
      triggers
    );
    // Generated IDs that no condition or action references are no longer in use.
    // Strip them so the YAML does not accumulate stale identifiers.
    this._commit(cleanupUnusedGeneratedTriggerIds(updated));
  };

  private _fixDuplicateTriggerIds = async () => {
    const localize = this._i18n.value?.localize;
    if (!this._options.getConfig() || !this._options.canEdit() || !localize) {
      return;
    }
    const confirmed = await showConfirmationDialog(this._host, {
      title: localize(
        "ui.panel.config.automation.editor.conditions.type.trigger.assign_unique_ids_title"
      ),
      text: localize(
        "ui.panel.config.automation.editor.conditions.type.trigger.assign_unique_ids_description"
      ),
      confirmText: localize(
        "ui.panel.config.automation.editor.conditions.type.trigger.duplicate_ids_fix"
      ),
      dismissText: localize("ui.common.cancel"),
    });
    const config = this._options.getConfig();
    if (confirmed && config && this._options.canEdit()) {
      this._commit(makeDuplicateTriggerIdsUnique(config));
    }
  };

  private _commit(config: AutomationConfig) {
    const current = this._options.getConfig();
    if (config === current) {
      return;
    }
    preserveAutomationRowKeys(current, config);
    this._options.commit(config);
  }
}

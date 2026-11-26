import { createContext } from "@lit/context";
import {
  consumeContext,
  ContextController,
} from "../../../common/decorators/consume";
import {
  pathEquals,
  pathStartsWith,
  type ConfigPath,
} from "../../../common/util/config-path";
import type { ConfigValidationError } from "../../../data/config";
import { internationalizationContext } from "../../../data/context";
import type { HomeAssistantInternationalization } from "../../../types";
import {
  automationErrorsContext,
  errorField,
  errorMessage,
  errorsEqual,
  fieldErrors,
  NO_ERRORS,
  ownedErrors,
} from "./automation-errors";
import {
  automationPathContext,
  automationRowRegistryContext,
  type AutomationRowRegistry,
} from "./automation-path";

const fieldsEqual = (a: Record<string, string>, b: Record<string, string>) => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => a[key] === b[key])
  );
};

/**
 * @summary The fields whose errors an editor shows next to the field, so
 * the sidebar doesn't list them again.
 */
export class InlineErrorFields {
  private _fields = new Map<object, ConfigPath[]>();

  constructor(private readonly _onChange: () => void) {}

  /** `fields` are paths relative to the row. */
  public set(owner: object, fields: ConfigPath[]) {
    this._fields.set(owner, fields);
    this._onChange();
  }

  public delete(owner: object) {
    if (this._fields.delete(owner)) {
      this._onChange();
    }
  }

  /** Whether an error at `path`, relative to the row, is shown inline. */
  public has(path: ConfigPath): boolean {
    return [...this._fields.values()].some((fields) =>
      fields.some((field) => pathStartsWith(path, field))
    );
  }
}

export const automationInlineErrorFieldsContext =
  createContext<InlineErrorFields>("automation-inline-error-fields");

interface AutomationFieldErrorsOptions {
  /** Fields the host shows the error of, see `InlineErrorFields`. */
  inlineFields?: string[];
  /** The key below the path whose fields the host edits, like `repeat`. */
  key?: string;
}

/**
 * @summary Validation errors of the config at the host's path.
 *
 * Consumes the errors and the path of the closest ancestor and updates the
 * host when the errors it exposes change.
 */
export class AutomationFieldErrorsController extends ContextController {
  public fields: Record<string, string> = {};

  /** Errors that belong to the row at exactly the path, see `errorOwner`. */
  public rowErrors: ConfigValidationError[] = NO_ERRORS;

  public path: ConfigPath = [];

  @consumeContext({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  @consumeContext({ context: automationErrorsContext, subscribe: true })
  private _errors: ConfigValidationError[] = NO_ERRORS;

  @consumeContext({ context: automationPathContext, subscribe: true })
  private _path: ConfigPath = [];

  @consumeContext({ context: automationRowRegistryContext })
  private _registry?: AutomationRowRegistry;

  @consumeContext({ context: automationInlineErrorFieldsContext })
  private _inlineErrorFields?: InlineErrorFields;

  private _inlineFields?: string[];

  private readonly _key: ConfigPath;

  private _claimedIn?: InlineErrorFields;

  constructor(
    host: ConstructorParameters<typeof ContextController>[0],
    options: AutomationFieldErrorsOptions = {}
  ) {
    super(host);
    this._inlineFields = options.inlineFields;
    this._key = options.key ? [options.key] : [];
  }

  /** Changes the fields the host shows the error of, like when it hides some. */
  public set inlineFields(fields: string[]) {
    if (
      this._inlineFields?.length === fields.length &&
      this._inlineFields.every((field, index) => field === fields[index])
    ) {
      return;
    }
    this._inlineFields = fields;
    this._claimedIn?.set(this, this._claims(fields));
  }

  private _claims(fields: string[]): ConfigPath[] {
    return fields.map((field) => [...this._key, field]);
  }

  private _nestedFieldErrors = new Map<string, Record<string, string>>();

  /** First error message of each key inside a field, keyed by the key. */
  public nestedFieldErrors(field: string): Record<string, string> {
    const errors = this._fieldErrors([...this._path, field]);
    const previous = this._nestedFieldErrors.get(field);
    // The same object while nothing changed, so the host's child doesn't update
    if (previous && fieldsEqual(previous, errors)) {
      return previous;
    }
    this._nestedFieldErrors.set(field, errors);
    return errors;
  }

  /** The error of a field as a whole, not of something inside it. */
  public ownFieldError(field: string): ConfigValidationError | undefined {
    return this._errors.find((error) =>
      pathEquals(error.path, [...this._path, field])
    );
  }

  /** The first error of a field the host edits. */
  public fieldError(field: string): ConfigValidationError | undefined {
    const path = [...this._path, ...this._key];
    return this._errors.find((error) => errorField(error, path) === field);
  }

  /** The errors at or inside `path`, relative to the host's path. */
  public errorsAt(path: ConfigPath): ConfigValidationError[] {
    const absolute = [...this._path, ...path];
    return this._errors.filter((error) => pathStartsWith(error.path, absolute));
  }

  private _fieldErrors(path: ConfigPath): Record<string, string> {
    return this._errors.length && this._i18n
      ? fieldErrors(this._i18n.localize, this._errors, path)
      : {};
  }

  private _formErrorLabel?: unknown;

  private _formError?: (message: string, schema: { name: string }) => string;

  /**
   * An ha-form `computeError` that names the field in its error, like
   * "Entity is required.", as the error is shown above the field.
   */
  public formError<S extends { name: string }>(
    computeLabel: (schema: S) => string,
    /** The error of a form field, for forms that don't use the config keys */
    errorOf: (field: string) => ConfigValidationError | undefined = (field) =>
      this.fieldError(field)
  ): (message: string, schema: S) => string {
    if (!this._formError || this._formErrorLabel !== computeLabel) {
      this._formErrorLabel = computeLabel;
      this._formError = (message, schema) => {
        const error = schema.name ? errorOf(schema.name) : undefined;
        const label = error && computeLabel(schema as S);
        return error && label && this._i18n
          ? errorMessage(this._i18n.localize, error, label)
          : message;
      };
    }
    return this._formError;
  }

  private _unsubscribeRegistry?: () => void;

  public hostConnected() {
    this._unsubscribeRegistry ??= this._registry?.subscribe(() => this._sync());
    this._claimInlineFields();
    this._sync();
  }

  public hostDisconnected() {
    this._unsubscribeRegistry?.();
    this._unsubscribeRegistry = undefined;
    this._claimedIn?.delete(this);
    this._claimedIn = undefined;
  }

  protected contextUpdated() {
    this._claimInlineFields();
    this._sync();
  }

  private _claimInlineFields() {
    if (
      !this._inlineFields ||
      !this._inlineErrorFields ||
      this._claimedIn === this._inlineErrorFields
    ) {
      return;
    }
    this._claimedIn?.delete(this);
    this._inlineErrorFields.set(this, this._claims(this._inlineFields));
    this._claimedIn = this._inlineErrorFields;
  }

  private _sync() {
    const fields = this._fieldErrors([...this._path, ...this._key]);
    const row =
      this._errors.length && this._path.length
        ? this._registry?.rowAt(this._path)
        : undefined;
    const rowErrors =
      row && this._registry
        ? ownedErrors(this._registry, this._errors, row)
        : NO_ERRORS;
    if (
      this.path === this._path &&
      fieldsEqual(fields, this.fields) &&
      errorsEqual(rowErrors, this.rowErrors)
    ) {
      return;
    }
    this.path = this._path;
    this.fields = fields;
    this.rowErrors = rowErrors;
    this.host.requestUpdate();
  }
}

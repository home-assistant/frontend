import { createContext } from "@lit/context";
import {
  consumeContext,
  ContextController,
} from "../../../common/decorators/consume";
import { pathEquals, type ConfigPath } from "../../../common/util/config-path";
import type { ConfigValidationError } from "../../../data/config";
import {
  automationErrorsContext,
  errorField,
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
  private _fields = new Map<object, string[]>();

  constructor(private readonly _onChange: () => void) {}

  public set(owner: object, fields: string[]) {
    this._fields.set(owner, fields);
    this._onChange();
  }

  public delete(owner: object) {
    if (this._fields.delete(owner)) {
      this._onChange();
    }
  }

  public has(field: string): boolean {
    return [...this._fields.values()].some((fields) => fields.includes(field));
  }
}

export const automationInlineErrorFieldsContext =
  createContext<InlineErrorFields>("automation-inline-error-fields");

interface AutomationFieldErrorsOptions {
  /** Fields the host shows the error of, see `InlineErrorFields`. */
  inlineFields?: string[];
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

  @consumeContext({ context: automationErrorsContext, subscribe: true })
  private _errors: ConfigValidationError[] = NO_ERRORS;

  @consumeContext({ context: automationPathContext, subscribe: true })
  private _path: ConfigPath = [];

  @consumeContext({ context: automationRowRegistryContext })
  private _registry?: AutomationRowRegistry;

  @consumeContext({ context: automationInlineErrorFieldsContext })
  private _inlineErrorFields?: InlineErrorFields;

  private readonly _inlineFields?: string[];

  private _claimedIn?: InlineErrorFields;

  constructor(
    host: ConstructorParameters<typeof ContextController>[0],
    options: AutomationFieldErrorsOptions = {}
  ) {
    super(host);
    this._inlineFields = options.inlineFields;
  }

  private _nestedFieldErrors = new Map<string, Record<string, string>>();

  /** First error message of each key inside a field, keyed by the key. */
  public nestedFieldErrors(field: string): Record<string, string> {
    const errors = fieldErrors(this._errors, [...this._path, field]);
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

  /** The first error of a field of the config at the path. */
  public fieldError(field: string): ConfigValidationError | undefined {
    return this._errors.find(
      (error) => errorField(error, this._path) === field
    );
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
    this._inlineErrorFields.set(this, this._inlineFields);
    this._claimedIn = this._inlineErrorFields;
  }

  private _sync() {
    const fields = this._errors.length
      ? fieldErrors(this._errors, this._path)
      : {};
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

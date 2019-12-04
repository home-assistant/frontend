import { fireEvent } from "../../../common/dom/fire_event";
import { Person, PersonMutableParams } from "../../../data/person";
import { User } from "../../../data/user";

export interface PersonDetailDialogParams {
  entry?: Person;
  users: User[];
  createEntry: (values: PersonMutableParams) => Promise<unknown>;
  updateEntry: (updates: Partial<PersonMutableParams>) => Promise<unknown>;
  removeEntry: () => Promise<boolean>;
}

export const loadPersonDetailDialog = () =>
  import(
    /* webpackChunkName: "person-detail-dialog" */ "./dialog-person-detail"
  );

export const showPersonDetailDialog = (
  element: HTMLElement,
  systemLogDetailParams: PersonDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-person-detail",
    dialogImport: loadPersonDetailDialog,
    dialogParams: systemLogDetailParams,
  });
};

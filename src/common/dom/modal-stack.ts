/**
 * Tracks open modal surfaces (dialogs and bottom sheets) in opening order.
 *
 * While a modal is open, the browser makes everything outside it inert, even
 * content painted above it in the top layer. Content that must stay usable
 * while a modal is open, like toasts, has to move inside the topmost modal.
 * A modal that registers here renders a `toast-host` slot inside its native
 * `<dialog>` for that content.
 */

type OpenModalsListener = () => void;

const OPEN_MODALS: HTMLElement[] = [];
const LISTENERS = new Set<OpenModalsListener>();

const notify = () => {
  LISTENERS.forEach((listener) => listener());
};

/** Marks a modal as open and on top. */
export const addOpenModal = (modal: HTMLElement) => {
  const index = OPEN_MODALS.indexOf(modal);
  if (index === OPEN_MODALS.length - 1 && index !== -1) {
    return;
  }
  if (index !== -1) {
    OPEN_MODALS.splice(index, 1);
  }
  OPEN_MODALS.push(modal);
  notify();
};

/** Marks a modal as closed. */
export const removeOpenModal = (modal: HTMLElement) => {
  const index = OPEN_MODALS.indexOf(modal);
  if (index === -1) {
    return;
  }
  OPEN_MODALS.splice(index, 1);
  notify();
};

/** The modal opened last that is still open, if any. */
export const getTopOpenModal = (): HTMLElement | undefined =>
  OPEN_MODALS[OPEN_MODALS.length - 1];

/**
 * Calls the listener whenever a modal opens or closes.
 * @returns A function that removes the listener.
 */
export const subscribeOpenModals = (listener: OpenModalsListener) => {
  LISTENERS.add(listener);
  return () => {
    LISTENERS.delete(listener);
  };
};

// Containers of the open modal dialogs, in opening order. A child of a
// container is in the flat tree of its native modal `<dialog>`.
const OPEN_MODALS: HTMLElement[] = [];
const listeners = new Set<() => void>();

/**
 * Tracks a modal dialog. While a modal is open the browser makes everything
 * outside it inert, so an element that must stay interactive has to move into
 * the topmost container.
 */
export const setModalOpen = (container: HTMLElement, open: boolean) => {
  const index = OPEN_MODALS.indexOf(container);
  if (index === -1 && !open) {
    return;
  }
  if (index !== -1) {
    OPEN_MODALS.splice(index, 1);
  }
  if (open) {
    OPEN_MODALS.push(container);
  }
  listeners.forEach((listener) => listener());
};

export const getTopModal = (): HTMLElement | undefined =>
  OPEN_MODALS[OPEN_MODALS.length - 1];

export const subscribeOpenModals = (listener: () => void) => {
  listeners.add(listener);
};

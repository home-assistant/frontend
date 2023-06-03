export const keydown =
  (activate: (e: KeyboardEvent) => void) => (e: KeyboardEvent) => {
    if (e.key === " ") e.preventDefault();
    if (e.key === "Enter") {
      e.preventDefault();
      activate(e);
    }
  };
export const keyup =
  (activate: (e: KeyboardEvent) => void) => (e: KeyboardEvent) => {
    if (e.key === " ") activate(e);
  };

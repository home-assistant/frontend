export const keydown = (e: KeyboardEvent & { currentTarget: HTMLElement }) => {
  if (e.key === " ") e.preventDefault();
  if (e.key === "Enter") {
    e.preventDefault();
    e.currentTarget.click();
  }
};
export const keyup = (e: KeyboardEvent & { currentTarget: HTMLElement }) => {
  if (e.key === " ") e.currentTarget.click();
};

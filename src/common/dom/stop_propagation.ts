export const stopPropagation = (ev) => ev.stopPropagation();

export const stopKeydownEnterSpacePropagation = (ev: KeyboardEvent) => {
  if (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar") {
    ev.stopPropagation();
  }
};

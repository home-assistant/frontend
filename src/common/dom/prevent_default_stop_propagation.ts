export const preventDefaultStopPropagation = (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
};

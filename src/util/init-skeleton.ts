export const removeInitSkeleton = () => {
  const initEl = document.getElementById("ha-init-skeleton");
  if (initEl) {
    initEl.parentElement!.removeChild(initEl);
  }
};

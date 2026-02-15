export const fileDownload = (href: string, filename = ""): void => {
  const element = document.createElement("a");
  element.target = "_blank";
  element.href = href;
  element.download = filename;
  element.style.display = "none";
  document.body.appendChild(element);
  element.dispatchEvent(new MouseEvent("click"));
  document.body.removeChild(element);
};

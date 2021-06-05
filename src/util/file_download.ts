export const fileDownload = (
  element: HTMLElement,
  href: string,
  filename: string
): void => {
  const a = document.createElement("a");
  a.target = "_blank";
  a.href = href;
  a.download = filename;

  element.shadowRoot!.appendChild(a);
  a.dispatchEvent(new MouseEvent("click"));
  element.shadowRoot!.removeChild(a);
};

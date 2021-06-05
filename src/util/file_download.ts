import { isAndroid } from "./is_android";
import { isSafari } from "./is_safari";

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

  if (isSafari || isAndroid) {
    // Directy calling a.click() is not working in mobile, fireing a MouseEvent is used as a workaround.
    // https://github.com/home-assistant/frontend/issues/9374
    a.dispatchEvent(new MouseEvent("click"));
  } else {
    a.click();
  }
  element.shadowRoot!.removeChild(a);
};

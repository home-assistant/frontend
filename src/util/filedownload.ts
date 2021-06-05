const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

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

  setTimeout(
    () => {
      a.click();
    },
    // Directy calling a.click() is not working in iOS, adding a delay works around that issue.
    // https://github.com/home-assistant/frontend/issues/9374
    isSafari ? 500 : 0
  );
  element.shadowRoot!.removeChild(a);
};

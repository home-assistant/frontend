export default abstract class AbstractFrontendFormComponent extends HTMLElement {
  public abstract render(
    form_data: { [k: string]: any },
    options: { [k: string]: any },
    submit_cb: (e: Event) => Promise<void> | null
  );
}

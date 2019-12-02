// interface OnChangeComponent {
//   props: {
//     index: number;
//     onChange(index: number, data: object);
//   };
// }

// export function onChangeEvent(this: OnChangeComponent, prop, ev) {
export function onChangeEvent(this: any, prop, ev) {
  if (!this.initialized) {
    return;
  }

  const origData = this.props[prop];
  if (ev.target.value === origData[ev.target.name]) {
    return;
  }

  const data = { ...origData };

  if (ev.target.value) {
    data[ev.target.name] = ev.target.value;
  } else {
    delete data[ev.target.name];
  }

  this.props.onChange(this.props.index, data);
}

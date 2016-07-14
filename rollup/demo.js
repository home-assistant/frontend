import config from './base-config';

export default Object.assign({}, config, {
  entry: 'home-assistant-js/demo_data/expose_window.js',
  targets: [
    { dest: 'build/_demo_data_compiled.js', format: 'iife' },
  ],
});

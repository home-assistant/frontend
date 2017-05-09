import config from './base-config';

export default Object.assign({}, config, {
  entry: 'panels/automation/editor.js',
  targets: [
    { dest: 'build/editor.js', format: 'iife' },
  ],
});

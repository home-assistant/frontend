if (typeof Object.assign != 'function') {
    require('es6-object-assign').polyfill();
    module.exports = Object;
}

var CoreObject = require('core-object'),
    UI = require('../ui');

module.exports = CoreObject.extend({
    name: '',
    description: '',

    init: function init(options) {
        this._super();

        this.ui = options.ui || new UI();
    },

    run: function run() {
        throw new Error('Task \'' + this.name + '\' must implement the run method.');
    }
});

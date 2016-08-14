var updateNotifier = require('update-notifier'),
    pkg = require('../../package.json');

updateNotifier({pkg: pkg}).notify();

'use strict';
const updateNotifier = require('update-notifier');
const pkg = require('../../package.json');

updateNotifier({pkg: pkg}).notify();

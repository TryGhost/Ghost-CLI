var bind = require('lodash/bind'),
    chalk = require('chalk'),
    cursor = require('cli-cursor'),
    assign = require('lodash/assign'),
    symbols = require('log-symbols'),
    spinners = require('cli-spinners'),
    Spinner;

// Because github.com/sindresorhus/ora has dropped support for node 0.10,
// in the short term this will be used in the place of it
// Once node 0.12 reaches EOL, this can be updated to use the straight `ora` module

// Taken from https://github.com/sindresorhus/ora and modified to work with node 0.10/0.12
// Copyright (c) 2016 Sindre Sorhus

Spinner = function Spinner(options) {
    options = assign({
        color: 'green',
        text: '',
        stream: process.stderr
    }, options || {});

    this.text = options.text;
    this.color = options.color;
    this.spinner = (process.platform === 'win32') ? spinners.line :
        (spinners[options.spinner] || spinners.hamburger);

    this.interval = this.spinner.interval || 100;
    this.stream = options.stream;
    this.id = null;
    this.frameIndex = 0;
    this.enabled = options.enabled || ((this.stream && this.stream.isTTY) && !process.env.CI);
};

Spinner.prototype.frame = function frame() {
    var frames = this.spinner.frames,
        frame = frames[this.frameIndex],
        text = this.text;

    if (this.color) {
        frame = chalk[this.color](frame);
        text = chalk[this.color](text);
    }

    this.frameIndex = (this.frameIndex + 1) % frames.length;

    return frame + ' ' + text;
};

Spinner.prototype.clear = function clear() {
    if (!this.enabled) {
        return this;
    }

    this.stream.clearLine();
    this.stream.cursorTo(0);

    return this;
};

Spinner.prototype.render = function render() {
    this.clear();
    this.stream.write(this.frame());

    return this;
};

Spinner.prototype.start = function start() {
    if (!this.enabled || this.id) {
        return this;
    }

    cursor.hide();
    this.render();
    this.id = setInterval(bind(this.render, this), this.interval);

    return this;
};

Spinner.prototype.stop = function stop() {
    if (!this.enabled) {
        return this;
    }

    clearInterval(this.id);
    this.id = null;
    this.frameIndex = 0;
    this.clear();
    cursor.show();

    return this;
};

Spinner.prototype.succeed = function succeed() {
    return this.stopAndPersist(symbols.success);
};

Spinner.prototype.fail = function fail() {
    return this.stopAndPersist(symbols.error);
};

Spinner.prototype.stopAndPersist = function stopAndPersist(symbol) {
    var text = this.text;

    if (this.color) {
        text = chalk[this.color](text);
    }

    this.stop();
    this.stream.write((symbol || ' ') + ' ' + text + '\n');
    return this;
};

module.exports = Spinner;

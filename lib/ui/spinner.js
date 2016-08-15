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
// See https://github.com/TryGhost/Ghost-CLI/issues/11 for more information

// Taken from https://github.com/sindresorhus/ora and modified to work with node 0.10/0.12
// License re-printed below
/*
    The MIT License (MIT)

    Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
*/

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
    return this.stopAndPersist(symbols.success, 'green');
};

Spinner.prototype.fail = function fail() {
    return this.stopAndPersist(symbols.error, 'red');
};

Spinner.prototype.stopAndPersist = function stopAndPersist(symbol, color) {
    var text = this.text;

    if (color || this.color) {
        text = chalk[color || this.color](text);
    }

    this.stop();
    this.stream.write((symbol || ' ') + ' ' + text + '\n');
    return this;
};

module.exports = Spinner;

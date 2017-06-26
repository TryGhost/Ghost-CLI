'use strict';
const UI = require('./index');
const ora = require('ora');
const chalk = require('chalk');

const defaultOptions = {
    refreshRate: 100
};

/**
 * Renderer class used for Listr lists. Adds some integration with the UI
 * class so that prompt and noSpin calls still work
 */
class CLIRenderer {
    constructor(tasks, options) {
        this.tasks = tasks;
        this.options = Object.assign({}, defaultOptions, options);

        this.ui = this.constructor.ui || new UI();
        this.previousFrame = null;
    }

    render() {
        if (this.id) {
            return;
        }

        this.spinner = this.ui.spinner = ora({
            stream: this.ui.stdout,
            spinner: this.options.spinner || 'hamburger'
        });

        this.subscribeToEvents();

        this.id = setInterval(() => {
            this.frame();
        }, this.options.refreshRate);
    }

    subscribeToEvents() {
        this.tasks.forEach((task) => {
            task.subscribe((event) => {
                if (event.type === 'STATE' && (task.isCompleted() || task.isSkipped() || task.hasFailed())) {
                    let spinnerMethod = task.isCompleted() ? 'succeed' : (task.isSkipped() ? 'info' : 'fail');
                    this.spinner[spinnerMethod](task.isSkipped() ? `${task.title} ${chalk.gray('[skipped]')}` : task.title);
                }
            });
        });
    }

    frame() {
        let text = this.tasks
            .filter((task) => task.isPending())
            .map(this.buildText.bind(this)).join(' | ');

        if (text && text !== this.previousFrame && !this.spinner.paused) {
            this.spinner.start(text);
            this.previousFrame = text;
        }
    }

    buildText(task) {
        if (!task.hasSubtasks()) {
            if (task.output && typeof task.output === 'string') {
                let data = task.output.trim().split('\n').filter(Boolean).pop();
                return `${task.title} ${this.constructor.separator} ${chalk.gray(data)}`;
            }

            return task.title;
        }

        let subtaskText = task.subtasks
            .filter((subtask) => subtask.isPending())
            .map((subtask) => this.buildText(subtask))
            .join('/');

        return `${task.title} ${this.constructor.separator} ${subtaskText}`;
    }

    end() {
        if (this.id) {
            clearInterval(this.id);
            this.id = undefined;
        }

        if (this.spinner) {
            this.spinner.stop();
            this.spinner = this.ui.spinner = null;
        }
    }
}

CLIRenderer.separator = chalk.cyan('>');

module.exports = CLIRenderer;

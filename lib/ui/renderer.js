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
 *
 * @class CLIRenderer
 */
class CLIRenderer {
    /**
     * Creates the renderer
     * @param {Array} tasks Tasks array
     * @param {Object} options Options
     */
    constructor(tasks, options) {
        this.tasks = tasks;
        this.options = Object.assign({}, defaultOptions, options);

        this.ui = this.constructor.ui || new UI();
        this.previousFrame = null;
    }

    /**
     * Do the render
     */
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

    /**
     * Subscribes to task events
     */
    subscribeToEvents() {
        this.tasks.forEach((task) => {
            task.subscribe((event) => {
                if (event.type === 'STATE' && (task.isCompleted() || task.isSkipped() || task.hasFailed())) {
                    const spinnerMethod = task.isCompleted() ? 'succeed' : (task.isSkipped() ? 'info' : 'fail');
                    this.spinner[spinnerMethod](task.isSkipped() ? `${task.title} ${chalk.gray('[skipped]')}` : task.title);
                }
            });
        });
    }

    /**
     * Renders a frame of output. Updates spinner text
     */
    frame() {
        const text = this.tasks
            .filter((task) => task.isPending())
            .map(this.buildText.bind(this)).join(' | ');

        if (text && text !== this.previousFrame && !this.spinner.paused) {
            this.spinner.start(text);
            this.previousFrame = text;
        }
    }

    /**
     * Builds the spinner text for a given task
     * @param {Task} task
     */
    buildText(task) {
        if (!task.hasSubtasks()) {
            if (task.output && typeof task.output === 'string') {
                const data = task.output.trim();
                return `${task.title} ${this.constructor.separator} ${chalk.gray(data)}`;
            }

            return task.title;
        }

        const subtaskText = task.subtasks
            .filter((subtask) => subtask.isPending())
            .map((subtask) => this.buildText(subtask))
            .join('/');

        return `${task.title} ${this.constructor.separator} ${subtaskText}`;
    }

    /**
     * Called once all tasks have finished or one has errored.
     * Handles cleanup
     */
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

// Thing that separates tasks from subtasks
CLIRenderer.separator = chalk.cyan('>');

module.exports = CLIRenderer;

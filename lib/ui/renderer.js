'use strict';
const ora = require('ora').default;
const chalk = require('chalk').default;

const defaultOptions = {
    refreshRate: 100,
    separator: chalk.cyan('>'),
    clearOnSuccess: false
};

/**
 * Renderer class used for Listr lists. Adds some integration with the UI
 * class so that prompt and noSpin calls still work
 *
 * @class CLIRenderer
 */
class Renderer {
    /**
     * Creates the renderer
     * @param {Array} tasks Tasks array
     * @param {Object} options Options
     */
    constructor(ui, tasks, options) {
        this.tasks = tasks || [];
        this.options = Object.assign({}, defaultOptions, options);

        this.ui = ui;
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
            spinner: this.options.spinner || 'dots'
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
            task.on('STATE', () => {
                if (task.isCompleted()) {
                    this.spinner[this.options.clearOnSuccess ? 'stop' : 'succeed'](task.title);
                }

                if (task.isSkipped()) {
                    // `task.skip(message)` sets the message *after* it changes the state,
                    // so wait a tick to make sure we have the message before rendering
                    queueMicrotask(() => this.renderSkipped(task));
                }

                if (task.hasFailed()) {
                    this.spinner.fail(task.title);
                }
            });
        });
    }

    /**
     * Outputs a skipped task, along with the reason it was skipped (if there is one)
     * @param {Task} task
     */
    renderSkipped(task) {
        const {skip} = task.message;

        // Listr falls back to the task title when a task is skipped without a message,
        // which the `[skipped]` line below already covers
        if (skip && skip !== task.title) {
            this.ui.log(skip, 'yellow');
        }

        this.spinner.info(`${task.title} ${chalk.gray('[skipped]')}`);
    }

    /**
     * Renders a frame of output. Updates spinner text
     */
    frame() {
        const text = this.tasks
            .filter(task => task.isPending())
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
                const data = task.output.trim().split('\n').pop();
                return `${task.title} ${this.options.separator} ${chalk.gray(data)}`;
            }

            return task.title;
        }

        const subtaskText = task.subtasks
            .filter(subtask => subtask.isPending())
            .map(subtask => this.buildText(subtask))
            .join('/');

        return `${task.title} ${this.options.separator} ${subtaskText}`;
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

// Listr uses this to decide whether it can use this renderer in a non-tty
// environment - it can't, so it falls back to the verbose renderer instead
Renderer.nonTTY = false;

module.exports = ui => class extends Renderer {
    constructor(...args) {
        super(ui, ...args);
    }
};

module.exports.Renderer = Renderer;

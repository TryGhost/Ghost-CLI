'use strict';
const moment = require('moment');
const Transform = require('stream').Transform;
const format = require('util').format;
const prettyJson = require('prettyjson');
const chalk = require('chalk');
const isObject = require('lodash/isObject');
const isString = require('lodash/isString');
const omit = require('lodash/fp/omit');
const each = require('lodash/each');
const isArray = require('lodash/isArray');
const isEmpty = require('lodash/isEmpty');

const levels = {
    10: 'trace',
    20: 'debug',
    30: 'info',
    40: 'warn',
    50: 'error',
    60: 'fatal'
};

const levelColors = {
    trace: 'grey',
    debug: 'grey',
    info: 'cyan',
    warn: 'magenta',
    error: 'red',
    fatal: 'inverse'
};

const omitFields = omit(['time', 'level', 'name', 'hostname', 'pid', 'v', 'msg']);

function statusCode(status) {
    if (status >= 500) {
        return chalk.red(status);
    } else if (status >= 400) {
        return chalk.yellow(status);
    } else if (status >= 300) {
        return chalk.cyan(status);
    } else if (status >= 200) {
        return chalk.green(status);
    } else {
        return status;
    }
}

class PrettyStream extends Transform {
    constructor(options) {
        options = options || {};
        super(options);

        this.verbose = options.verbose || false;
    }

    write(data, enc, cb) {
        // Bunyan sometimes passes things as objects. Because of this, we need to make sure
        // the data is converted to JSON
        if (isObject(data) && !(data instanceof Buffer)) {
            data = JSON.stringify(data);
        }

        super.write(data, enc, cb);
    }

    _transform(data, enc, cb) {
        // istanbul ignore next
        if (!isString(data)) {
            data = data.toString();
        }

        // Remove trailing newline if any
        data = data.replace(/\\n$/, '');

        try {
            data = JSON.parse(data);
        } catch (err) {
            // istanbul ignore next
            cb(err);
            // If data is not JSON we don't want to continue processing as if it is
            // istanbul ignore next
            return;
        }

        const time = moment(data.time).format('YYYY-MM-DD HH:mm:ss');
        const logLevel = levels[data.level];
        const levelColor = chalk[levelColors[logLevel]];

        let output = '';
        let prettyBody = '';

        // CASE: bunyan passes each plain string/integer as `msg` attribute (logging.info('Hey!'))
        // CASE: bunyan extended this by figuring out a message in an error object (new Error('message'))
        if (data.msg && !data.err) {
            prettyBody += data.msg;

            output += format('[%s] %s %s\n',
                time,
                levelColor(logLevel.toUpperCase()),
                prettyBody
            );
        } else {
            // CASE: log objects in pretty JSON format

            // common log format:
            // 127.0.0.1 user-identifier user-id [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326

            // if all values are available we log in common format
            // can be extended to define from outside, but not important
            try {
                output += format('[%s] %s "%s %s" %s %s\n',
                    time,
                    levelColor(logLevel.toUpperCase()),
                    data.req.method.toUpperCase(),
                    data.req.originalUrl,
                    statusCode(data.res.statusCode),
                    data.res.responseTime
                );
            } catch (err) {
                output += format('[%s] %s\n',
                    time,
                    levelColor(logLevel.toUpperCase())
                );
            }

            each(omitFields(data), (value, key) => {
                // we always output errors for now
                if (isObject(value) && value.message && value.stack) {
                    let error = '\n';

                    if (value.name) {
                        error += `${levelColor(`NAME: ${value.name}`)}\n`;
                    }

                    if (value.code) {
                        error += `${levelColor(`CODE: ${value.code}`)}\n`;
                    }

                    error += `${levelColor(`MESSAGE: ${value.message}`)}\n\n`;

                    if (value.level) {
                        error += `${chalk.white(`level: ${value.level}`)}\n\n`;
                    }

                    if (value.context) {
                        error += `${chalk.white(value.context)}\n`;
                    }

                    if (value.help) {
                        error += `${chalk.white(value.help)}\n`;
                    }

                    if (value.errorDetails) {
                        const errorDetails = isArray(value.errorDetails) ? value.errorDetails[0] : value.errorDetails;
                        error += `${levelColor(`ERROR DETAILS:\n${prettyJson.render(errorDetails, {noColor: true}, 4)}`)}\n\n`;
                    }

                    if (value.stack && !value.hideStack) {
                        error += `${chalk.white(value.stack)}\n`;
                    }

                    output += `${levelColor(error)}\n`;
                } else if (isObject(value)) {
                    prettyBody += `\n${chalk.yellow(key.toUpperCase())}\n`;

                    const sanitized = Object.keys(value).reduce((obj, innerKey) => {
                        if (!isEmpty(value[innerKey])) {
                            obj[innerKey] = value[innerKey];
                        }

                        return obj;
                    }, {});

                    prettyBody += `${prettyJson.render(sanitized, {})}\n`;
                } else {
                    prettyBody += `${prettyJson.render(value, {})}\n`;
                }
            });

            if (this.verbose) {
                output += `${chalk.grey(prettyBody)}\n`;
            }
        }

        cb(null, output);
    }
}

module.exports = PrettyStream;

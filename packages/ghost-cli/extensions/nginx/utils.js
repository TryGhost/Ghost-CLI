const {errors} = require('../../lib');
const {ProcessError, CliError} = errors;

function errorWrapper(fn) {
    return async (...args) => {
        try {
            await fn(...args);
        } catch (error) {
            if (error instanceof CliError) {
                throw error;
            }

            throw new ProcessError(error);
        }
    };
}

module.exports = {errorWrapper};

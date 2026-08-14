'use strict';
const stream = require('stream');
const isString = require('lodash/isString');

function noopRead(stream) {
    return function () {
        stream.push(null);
    };
}

function noopWrite(_chunk, _enc, next) {
    next();
}

function writeWrap(writeFunc) {
    return function (chunk, _enc, next) {
        if (!isString(chunk)) {
            // chunk is a buffer, convert it to string
            writeFunc(chunk.toString());
        } else {
            writeFunc(chunk);
        }

        return next();
    };
}

const streamUtils = {
    /**
     * Consumes a readable stream the same way Listr does - resolves with all of the
     * chunks that were emitted, rejects with whatever the stream errored with
     */
    collect: function collect(readable) {
        return new Promise((resolve, reject) => {
            const chunks = [];

            readable.on('data', chunk => chunks.push(chunk.toString()));
            readable.on('error', reject);
            readable.on('end', () => resolve(chunks));
        });
    },

    /**
     * Matches the check Listr uses to decide whether a task returned a stream
     */
    isReadable: function isReadable(obj) {
        return Boolean(obj) && typeof obj === 'object' && obj.readable === true &&
            typeof obj.read === 'function' && typeof obj.on === 'function';
    },

    /**
     * A readable stream that fails with the given error as soon as it's read from
     */
    erroringStream: function erroringStream(error) {
        return new stream.Readable({
            read() {
                process.nextTick(() => this.destroy(error));
            }
        });
    },

    getReadableStream: function getReadableStream(_read) {
        const readStream = stream.Readable();

        readStream._read = _read || noopRead(readStream);
        return readStream;
    },

    getWritableStream: function getWritableStream(_write, wrap) {
        const writeStream = stream.Writable({decodeStrings: false});

        writeStream._write = _write ? (wrap ? writeWrap(_write) : _write) : noopWrite;

        return writeStream;
    },

    /**
     * Stands in for an execa subprocess: a promise with the given streams hung off it that
     * only resolves once they've all ended, which is the ordering the real thing guarantees.
     * Resolving any earlier lets consumers end their output stream mid-pipe
     */
    fakeSubprocess: function fakeSubprocess(streams) {
        const ended = Object.values(streams).map(
            stream => new Promise((resolve) => {
                stream.on('end', resolve);
            })
        );

        return Object.assign(Promise.all(ended).then(() => {}), streams);
    },

    /**
     * A writable stream plus a promise that resolves with the first chunk written to it,
     * or rejects if the stream errors. Lets tests await output rather than assert inside
     * the stream's write callback
     */
    captureFirstWrite: function captureFirstWrite() {
        let resolve;
        let reject;

        const written = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });

        const writeStream = streamUtils.getWritableStream(chunk => resolve(chunk.toString()));
        writeStream.on('error', reject);

        return {stream: writeStream, written};
    },

    mockStandardStreams: function mockStandardStreams(streamCallbacks, errorCallback) {
        streamCallbacks = streamCallbacks || {};

        const streams = {
            stdin: streamUtils.getReadableStream(streamCallbacks.stdin),
            stdout: streamUtils.getWritableStream(streamCallbacks.stdout),
            stderr: streamUtils.getWritableStream(streamCallbacks.stderr || streamCallbacks.stdout)
        };

        streams.stdin.on('error', errorCallback);
        streams.stdout.on('error', errorCallback);
        streams.stderr.on('error', errorCallback);

        return streams;
    }
};

module.exports = streamUtils;

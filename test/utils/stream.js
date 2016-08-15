var stream = require('stream'),
    isString = require('lodash/isString'),
    streamUtils;

function noopRead(stream) {
    return function () {
        stream.push(null);
    };
}

function noopWrite(chunk, enc, next) {
    next();
}

function writeWrap(writeFunc) {
    return function (chunk, enc, next) {
        if (!isString(chunk)) {
            // chunk is a buffer, convert it to string
            writeFunc(chunk.toString());
        } else {
            writeFunc(chunk);
        }

        return next();
    };
}

streamUtils = {
    getReadableStream: function getReadableStream(_read) {
        var readStream = stream.Readable();

        readStream._read = _read || noopRead(readStream);
        return readStream;
    },

    getWritableStream: function getWritableStream(_write, wrap) {
        var writeStream = stream.Writable({decodeStrings: false});

        writeStream._write = _write ? (wrap ? writeWrap(_write) : _write) : noopWrite;

        return writeStream;
    },

    mockStandardStreams: function mockStandardStreams(streamCallbacks, errorCallback) {
        var streams;

        streamCallbacks = streamCallbacks || {};

        streams = {
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

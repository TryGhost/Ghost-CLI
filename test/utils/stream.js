var stream = require('stream'),
    streamUtils;

function noopRead(stream) {
    return function () {
        stream.push(null);
    };
}

function noopWrite(chunk, enc, next) {
    next();
}

streamUtils = {
    getReadableStream: function getReadableStream(_read) {
        var readStream = stream.Readable();

        readStream._read = _read || noopRead(readStream);
        return readStream;
    },

    getWritableStream: function getWritableStream(_write) {
        var writeStream = stream.Writable({decodeStrings: false});

        writeStream._write = _write || noopWrite;
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

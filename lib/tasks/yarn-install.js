'use strict';
const fs = require('fs-extra');
const Listr = require('listr');
const shasum = require('shasum');
const download = require('download');
const decompress = require('decompress');

const yarn = require('../utils/yarn');

const subTasks = {
    dist: (ctx) => {
        return yarn(['info', `ghost@${ctx.version}`, 'dist', '--json']).then((result) => {
            let dist = JSON.parse(result.stdout).data || {};

            if (!dist) {
                return Promise.reject(new Error('Ghost download information could not be read correctly.'));
            }

            ctx.shasum = dist.shasum;
            ctx.tarball = dist.tarball;
        });
    },
    download: (ctx) => {
        return download(ctx.tarball).then((data) => {
            if (!shasum(data) === ctx.shasum) {
                // shasums don't match - this is not good
                return Promise.reject(new Error('Ghost download integrity compromised.' +
                    'Cancelling install because of potential security issues'));
            }

            fs.ensureDirSync(ctx.installPath);
            return decompress(data, ctx.installPath, {
                map: (file) => {
                    file.path = file.path.replace('package/', '');
                    return file;
                }
            });
        });
    }
};

module.exports.subTasks = subTasks;
module.exports = function yarnInstall(renderer) {
    return new Listr([{
        title: 'Getting download information',
        task: subTasks.dist
    }, {
        title: 'Downloading',
        task: subTasks.download
    }, {
        title: 'Installing dependencies',
        task: (ctx) => yarn(['install', '--no-emoji', '--no-progress'], {
            cwd: ctx.installPath,
            env: {NODE_ENV: 'production'},
            observe: true
        })
    }], {renderer: renderer});
};

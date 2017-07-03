'use strict';
const url = require('url');
const path = require('path');
const execa = require('execa');

const LIVE_URL = 'https://acme-v01.api.letsencrypt.org/directory';
const STAGING_URL = 'https://acme-staging.api.letsencrypt.org/directory';

module.exports = function letsencrypt(instance, email, staging) {
    let hostname = url.parse(instance.config.get('url')).hostname;
    let rootPath = path.resolve(instance.dir, 'system', 'nginx-root');
    let letsencryptFolder = path.join(instance.dir, 'system', 'letsencrypt');
    let sslGenArgs = `certonly --agree-tos --email ${email} --webroot --webroot-path ${rootPath}` +
                    ` --config-dir ${letsencryptFolder} --domains ${hostname} --server ${staging ? STAGING_URL : LIVE_URL}`;

    return execa('greenlock', sslGenArgs.split(' '), {
        preferLocal: true,
        localDir: __dirname
    });
};

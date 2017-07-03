'use strict';
const cli = require('../../../lib');
const letsencrypt = require('../letsencrypt');

class SslRenewCommand extends cli.Command {
    run() {
        let instance = this.system.getInstance();
        instance.checkEnvironment();

        if (!instance.cliConfig.has('extension.sslemail')) {
            return Promise.reject(new cli.errors.SystemError('No saved email found, skipping automatic letsencrypt renewal'));
        }

        let email = instance.cliConfig.get('extension.sslemail');
        return this.ui.run(letsencrypt(instance, email, false), 'Renewing SSL certificate')
            .catch((error) => Promise.reject(new cli.errors.ProcessError(error)));
    }
}

SslRenewCommand.description = 'Renew an SSL certificate for a Ghost installation';

module.exports = SslRenewCommand;


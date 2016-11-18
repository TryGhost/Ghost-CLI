var BaseProcess = require('../index'),
    execSync = require('child_process').execSync;

module.exports = BaseProcess.extend({
    name: 'systemd',

    init: function init(config) {
        this._super(config);
        this.service = 'ghost_' + config.get('pname');
    },

    setup: function setup() {
        var Promise = require('bluebird'),
            template = require('lodash/template'),
            path = require('path'),
            fs = require('fs'),
            service = template(fs.readFileSync(path.join(__dirname, 'ghost.service.template'), 'utf8')),
            serviceFileName = this.service + '.service';

        fs.writeFileSync(path.join(process.cwd(), serviceFileName), service({
            name: this.config.get('pname'),
            dir: process.cwd(),
            user: process.getuid(),
            // TODO: once setup supports passing in node_env, replace
            // this line with the environment. Until now, it's safe to
            // hardcode 'production' in.
            environment: 'production',
            ghost_exec_path: process.argv.slice(0,2).join(' ')
        }), 'utf8');

        try {
            // Because of the loading spinner, we must run this using execSync in the case
            // that the sudo command prompts for a password. Running a promisified version of exec
            // does not work in this case.
            execSync('sudo mv ' + serviceFileName + ' /lib/systemd/system', {
                cwd: process.cwd(),
                stdio: ['inherit', 'inherit', 'inherit']
            });
        } catch (e) {
            return Promise.reject('Ghost service file could not be put in place, ensure you have proper sudo permissions and systemd is installed.');
        }
    },

    start: function start() {
        execSync('systemctl start ' + this.service, {
            stdio: ['inherit', 'inherit', 'inherit']
        });
    },

    stop: function stop() {
        execSync('systemctl stop ' + this.service, {
            stdio: ['inherit', 'inherit', 'inherit']
        });
    }
});

'use strict';
const expect = require('chai').expect;
const proxyquire = require('proxyquire');

const modulePath = '../../../lib/utils/needed-migrations';

describe('Unit: Utils > needed-migrations', function () {
    it('concatenates core migrations with extension migrations and filters out unnecessary migrations', function () {
        const coreMigrations = [{
            before: '1.2.0',
            title: 'Migration One',
            task: () => {}
        }, {
            title: 'Migration Two',
            task: () => {}
        }];

        const extensionOne = [{
            before: '1.1.0',
            title: 'Extension One',
            task: () => {}
        }];

        const extensionTwo = [{
            before: '1.2.0',
            title: 'Extension Two',
            task: () => {}
        }];

        const parse = proxyquire(modulePath, {
            '../migrations': coreMigrations
        });

        const result = parse(
            '1.1.0',
            '1.3.0',
            [extensionOne, extensionTwo]
        );

        expect(result).to.deep.equal(coreMigrations.concat(extensionTwo));
    });
});

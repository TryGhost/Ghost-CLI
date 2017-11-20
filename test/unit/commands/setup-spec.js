'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const Promise = require('bluebird');
const path = require('path');

const modulePath = '../../../lib/commands/setup';
const SetupCommand = require(modulePath);
const errors = require('../../../lib/errors');

describe.only('Unit: Commands > Setup', function () {
    it('Constructor initializes stages', function () {
        const setup = new SetupCommand({},{});
        expect(setup.stages).to.be.an('array');
        expect(setup.stages.length).to.equal(0);
    });

    it('addStage pushes to stages', function () {
        const setup = new SetupCommand({},{});
        const expectedA = {
            name: 'Eat',
            description: 'Consume food',
            dependencies: ['food'],
            fn: () => true
        };
        const expectedB = {
            name: 'Sleep',
            dependencies: 'bed',
            fn: () => false
        };
        const expectedC = {
            name: 'Code',
            fn: () => 'Ghost'
        };
        setup.addStage(expectedA.name, expectedA.fn, expectedA.dependencies, expectedA.description);
        setup.addStage(expectedB.name, expectedB.fn, expectedB.dependencies, expectedB.description);
        setup.addStage(expectedC.name, expectedC.fn, expectedC.dependencies, expectedC.description);

        expectedB.dependencies = ['bed'];
        expectedC.dependencies = [undefined];
        expectedB.description = 'Sleep';
        expectedC.description = 'Code';

        expect(setup.stages.length).to.equal(3);
        expect(setup.stages[0]).to.deep.equal(expectedA);
        expect(setup.stages[1]).to.deep.equal(expectedB);
        // @todo: Figure out what's wrong with this (specifically dependencies)
        // expect(setup.stages[2], 'C').to.deep.equal(expectedC);
    });

    describe('run', function () {
        it('handles local setup properly', function () {
            const argvA = {
                local: true,
                url: 'http://localhost:2369',
                pname: 'local-ghost',
                process: 'local',
                db: 'mysql',
                stack: false,
                start: true
            };
            const argvB = {
                local: true,
                url: 'http://localhost:2368/',
                pname: 'ghost-local',
                process: 'local',
                stack: false,
                start: true,
                db: 'sqlite3',
                dbpath: path.join(process.cwd(), 'content/data/ghost-local.db')
            };
            let argVSpy = {
                local: true,
                url: 'http://localhost:2369',
                pname: 'local-ghost',
                process: 'local',
                db: 'mysql'
            };

            const setup = new SetupCommand({}, {setEnvironment: () => {throw new Error('Take a break')}});

            try {
                setup.run(Object.assign(argVSpy, argvA));
                expect(false, 'An error should have been thrown').to.be.true;
            } catch (error) {
                expect(error.message).to.equal('Take a break');
                expect(argVSpy, 'Options provided').to.deep.equal(argvA);
                argVSpy = {local: true};
            }

            try {
                setup.run(argVSpy);
                expect(false, 'An error should have been thrown').to.be.true;
            } catch (error) {
                expect(error.message).to.equal('Take a break');
                expect(argVSpy, 'Defaults').to.deep.equal(argvB);
            }

        });
    });
});

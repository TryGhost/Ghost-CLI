import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

export const mochaHooks = {
    beforeAll() {
        chai.use(chaiAsPromised);
    }
};

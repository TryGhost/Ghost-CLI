module.exports = {
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/node'
    ],
    parserOptions: {
        ecmaVersion: 2019
    },
    rules: {
        'no-console': ['off']
    }
};

module.exports = {
    env: {
        es2021: true,
        node: true
    },
    extends: [
        'standard'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    plugins: [
        '@typescript-eslint'
    ],
    rules: {
        indent: ['error', 4],
        curly: 0,
        semi: 0,
        camelcase: 0,
        eqeqeq: 0
    }
}

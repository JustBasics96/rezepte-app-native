module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  ignorePatterns: ['dist/', 'build/', 'node_modules/'],
  rules: {
    // Keep logs in English. Avoid noisy logs in production paths.
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  }
}

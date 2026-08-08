const app = require('../dist/server').default || require('../dist/server');

module.exports = (req, res) => {
  return app(req, res);
};

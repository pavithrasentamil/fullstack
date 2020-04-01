const validate = require('./validate');
const buildSchema = require('./buildSchema');
const routes = require('./routes');


function registerGlobals() {
  validate(this.config.globals);
  this.globals = buildSchema(this.config);
  this.router.use(routes(this.config.globals, this.globals));
}

module.exports = registerGlobals;
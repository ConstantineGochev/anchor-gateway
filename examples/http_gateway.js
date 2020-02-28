const AnchorGateway = require('../index.js')

const gateway = new AnchorGateway({
  port: 8000,
  xfwd: false // OPTIONAL: Setup your gateway but disable the X-Forwarded-For header
})

gateway.init([{
  src: 'localhost/admin',
  target: 'http://127.0.0.1:3001'
}, {
  src: 'localhost/boats',
  target: 'http://127.0.0.1:3003'
}])

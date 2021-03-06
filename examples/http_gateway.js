const AnchorGateway = require('../index.js')

const gateway = new AnchorGateway({
  port: 8000,
  xfwd: false,
  redis: {} // OPTIONAL: Setup your gateway but disable the X-Forwarded-For header
})

gateway.init([{
  src: 'localhost/admin',
  target: 'http://127.0.0.1:3001',
  cache: ['/some/test/4', '/some/test/5']
}, {
  src: 'localhost/boats',
  target: 'http://127.0.0.1:3003',

}])
gateway.get_all_services().then(function(services) {
  console.log(services)
}).catch(err => console.log(err))

<p align="center">
  <img src="https://raw.github.com/ConstantineGochev/anchor-gateway/master/docs/anc-portal2.png"/>
</p>

# anchor-gateway

## api gateway for node with HTTPS, cluster and WebSocket support

Very small library that enables very easy handling of things like load balancing, proxying web sockets, dynamic routing and SSL encryption.

`anchor-gateway` includes everything you need for easy reverse routing of your applications.
Great for handling microservice routing from different domains in one single host, handling SSL and web sockets.


### Table of Contents
  * [Installation](#installation)
  * [Core Concept](#core-concept)
  * [Use Cases](#use-cases)
    * [Setup a basic HTTP gateway server](#setup-a-basic-http-gateway-server)
    * [Using HTTPS](#using-https)
    * [HTTP to HTTPS](#http-to-https)
    * [Proxying WebSockets](#proxying-websockets-gateway-server)
    * [Adding Custom Resolvers](#adding-custom-resolvers)
    * [Docker Support](#docker-support)
  * [Options](#options)
  * [Shutdown](#shutdown)
  * [Test](#test)
  * [Logo](#logo)
  * [Contributing and Issues](#contributing-and-issues)
  * [License](#license)

### Installation

`npm install anchor-gateway --save`

**[Back to top](#table-of-contents)**

### Core Concept

A new gateway is created by calling the AnchorGateway constructor and passing
an `options` object as argument 

```javascript
const AnchorGateway = require('anchor-gateway');
let options = {
    ...
}

const gateway = new AnchorGateway(options);
```

Then it is easy to proxy requests by calling the `init` function with an array
of objects that must have src and target properties.

````javascript

gateway.init([
    {
        src: 'localhost',
        target: 'http://127.0.0.1:3333'
    },
        {
        src: 'localhost/api-2',
        target: 'http://127.0.0.1:4444'
    }
])

````

**[Back to top](#table-of-contents)**

### Use Cases

#### Setup a basic HTTP gateway server

````javascript

const AnchorGateway = require('anchor-gateway')

const gateway = new AnchorGateway({
    port: 8000,
    xfwd: false // OPTIONAL: Setup your gateway but disable the X-Forwarded-For header
})

gateway.init([
    {
        src: 'example.com',
        target: 'http://127.0.0.1:3333'
    },
    {
        src: 'example.com/static',
        target: 'http://174.11.45.7:5444'
    },
    {
        src: 'sub.example.com',
        target: 'http://174.11.45.7:4481'
    },
    {
        src: 'sub.example.com/second',
        target: 'http://174.11.45.7:4481/second'
    },
    // You can enable load balancing if you register the same source(src) with different targets
    {
        src: 'balance.tube',
        target: 'http://190.22.33.4:5556'
    },
        {
        src: 'balance.tube',
        target: 'http://190.23.31.4:3556'
    },
        {
        src: 'balance.tube',
        target: 'http://190.22.32.1:6356'
    },
  
])

//You can remove route objects from the array programmatically even at runtime by calling the remove function
//with the index of the route object you want to remove

gateway.remove(1) //will remove the object with index 1 ({src: 'example.com/static',target: 'http://174.11.45.7:5444'})

setTimeout(function() {
    gateway.remove(3)
}, 4000)

````

#### Using HTTPS

````javascript

const AnchorGateway = require('anchor-gateway')
const fs = require('fs')

const gateway = new AnchorGateway({
    port: 8000,
    secure: false, //can be true depending on your need but the certs must be from authority
    ssl: {
        key: fs.readFileSync('path/to/key.pem', 'utf8'),
        cert: fs.readFileSync('path/to/cert.pem', 'utf8')
    }
})

gateway.init([
    {
        src: 'localhost',
        target: 'https://127.0.0.1:3455'
    },
        {
        src: 'localhost/api-2',
        target: 'https://127.0.0.1:7755'
    }
])

````

#### HTTP to HTTPS

You have to generate a PKCS12 client certificate

You can do it by running 

```sh
/path/to $ openssl pkcs12 -export -out certificate.pfx -inkey privateKey.key -in certificate.crt -certfile more.crt

```

````javascript

const AnchorGateway = require('anchor-gateway')
const fs = require('fs')
 

const gateway = new AnchorGateway({
    port: 8000,
    pfx: fs.readFileSync('path/to/certificate.p12'),
    passphrase: 'password',
    secure: false, //can be true depending on your need but the certs must be from authority

})

gateway.init([
    {
        src: 'localhost',
        target: 'https://127.0.0.1:3455'
    },
        {
        src: 'localhost/api-2',
        target: 'http://127.0.0.1:7755'
    }
])

````

#### Proxying WebSockets

````javascript

const AnchorGateway = require('anchor-gateway')


const gateway = new AnchorGateway({
    port: 3000,
    ws:true,
    secure: false, //can be true depending on your need but the certs must be from authority

})

gateway.init([
        {
            src: 'localhost/ws',
            target: 'ws://localhost:8080'
        }
])

````
And in socket.js

````javascript
const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 8080 });
// wss.emit('upgrade')
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });

    ws.send('something');
});
var client = new WebSocket('ws://localhost:3000/ws')
setInterval(function() {

    client.on('message', function(msg) {
        util.debug('Got message from client: ' + msg);
    });
}, 1000)

````

#### Adding Custom Resolvers
With custom resolvers you can:
- Do path-based routing.
- Do headers based routing.
- Do wildcard domain routing.

````javascript
var custom_resolver = function(host, url, req) {
   if(/^\/api-v2\//.test(url)){
      return 'http://127.0.0.1:3333';
   }
 };

const gateway = new AnchorGateway({
    port: 3000,
    resolvers: [
        custom_resolver,
        function(host, url, req) {

        }
    ]

})

// remove the resolver after 10 minutes,
setTimeout(function() {
  gateway.removeResolver(custom_resolver);
}, 600000);

````

#### Docker Support

TODO

### Options

`AnchorGateway(options)` supports the following options
*  **host**: valid hostname 
*  **port**: port number to listen on
*  **ssl**: object to be passed to https.createServer()
*  **ws**: true/false, if you want to proxy websockets
*  **xfwd**: true/false, adds x-forward headers
*  **secure**: true/false, if you want to verify the SSL Certs
*  **pfx**: path to PKCS12 client certificate
*  **passphrase**: password for the PKCS12 client certificate
*  **resolvers**: array of functions aka custom resolvers
*  **prependPath**: true/false, Default: true - specify whether you want to prepend the target's path to the proxy path
*  **changeOrigin**: true/false, Default: false - changes the origin of the host header to the target URL


**[Back to top](#table-of-contents)**

### Shutdown

````javascript

gateway.close()

````

### Test

```
$ npm run test
```

### Logo

Logo created by [Vanaya](https://www.facebook.com/vanina.ivanova.16)


### Contributing and Issues

* If you feel comfortable about fixing an issue, fork the repo
* Commit to your local branch (which must be different from `master`)
* Submit your Pull Request (be sure to include tests and update documentation)


### License

>The MIT License (MIT)
>
>Copyright (c) 2018 - 2019 Constantine Gochev, & the Contributors.
>
>Permission is hereby granted, free of charge, to any person obtaining a copy
>of this software and associated documentation files (the "Software"), to deal
>in the Software without restriction, including without limitation the rights
>to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
>copies of the Software, and to permit persons to whom the Software is
>furnished to do so, subject to the following conditions:
>
>The above copyright notice and this permission notice shall be included in
>all copies or substantial portions of the Software.
>
>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
>IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
>FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
>AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
>LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
>OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
>THE SOFTWARE.
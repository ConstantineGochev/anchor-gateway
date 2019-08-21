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
    * [Using HTTPS](#using-https-gateway-server)
    * [HTTP to HTTPS](#http-to-https-gateway-server)
    * [Proxying WebSockets](#proxying-websockets-gateway-server)
    * [Adding Custom Resolvers](#adding-custom-resolvers)
    * [Docker Support](#docker-support)
  * [Options](#options)
  * [Shutdown](#shutdown)
  * [Miscellaneous](#miscellaneous)
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
        target: 'http://127.0.0.1:3333
    },
        {
        src: 'localhost/api-2',
        target: 'http://127.0.0.1:4444
    }
])

````
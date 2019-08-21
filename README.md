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
  * [Upgrading from 0.8.x ?](#upgrading-from-08x-)
  * [Core Concept](#core-concept)
  * [Use Cases](#use-cases)
    * [Setup a basic stand-alone proxy server](#setup-a-basic-stand-alone-proxy-server)
    * [Setup a stand-alone proxy server with custom server logic](#setup-a-stand-alone-proxy-server-with-custom-server-logic)
    * [Setup a stand-alone proxy server with proxy request header re-writing](#setup-a-stand-alone-proxy-server-with-proxy-request-header-re-writing)
    * [Modify a response from a proxied server](#modify-a-response-from-a-proxied-server)
    * [Setup a stand-alone proxy server with latency](#setup-a-stand-alone-proxy-server-with-latency)
    * [Using HTTPS](#using-https)
    * [Proxying WebSockets](#proxying-websockets)
  * [Options](#options)
  * [Listening for proxy events](#listening-for-proxy-events)
  * [Shutdown](#shutdown)
  * [Miscellaneous](#miscellaneous)
    * [Test](#test)
    * [ProxyTable API](#proxytable-api)
    * [Logo](#logo)
  * [Contributing and Issues](#contributing-and-issues)
  * [License](#license)

### Installation

`npm install anchor-gateway --save`

**[Back to top](#table-of-contents)**
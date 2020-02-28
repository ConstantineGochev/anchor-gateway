"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var http = require('http');

var https = require('https');

var httpProxy = require('http-proxy');

var bunyan = require('bunyan');

var _ = require('lodash');

var validUrl = require('valid-url');

var LRUCache = require('lru-cache');

var url = require('url');

var cluster = require('cluster');

var path = require('path');

var RedisBackend = require('./redis');

var route_cache = new LRUCache({
  max: 5000
});

var AnchorGateway = /*#__PURE__*/function () {
  // routing: {};
  // opts;
  // logger;
  // resolvers[];
  // proxy: httpProxy;
  // server;
  // certs;
  // letsencrypt_host;
  // httpsServer;
  // priority: number;
  function AnchorGateway() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, AnchorGateway);

    this.opts = opts;

    if (this.opts.httpProxy == undefined) {
      this.opts.httpProxy = {};
    } //routing object


    this.routing = {};
    this.logger;
    this.server;

    if (opts.logger !== false) {
      this.logger = bunyan.createLogger(opts.bunyan || {
        name: 'anchor-proxy'
      });
    }

    if (opts.cluster && !_.isNumber(opts.cluster) || opts.cluster > 32) {
      throw Error('Cluster setting must be an integer less than 32');
    }

    if (opts.cluster && cluster.isMaster) {
      for (var i = 0; i < opts.cluster; i++) {
        cluster.fork();
      }

      cluster.on('exit', function (worker, code, signal) {
        this.logger && this.logger.error({
          code: code,
          signal: signal
        }, 'worker died unexpectedly... restarting it.');
        cluster.fork();
      });
    } else {
      // this.default_resolver.priority = 1
      this.resolvers = [this.default_resolver];
      this.opts.port = this.opts.port || 8080;
      console.log("OPTS in constructor ====");
      console.log(this.opts);

      if (this.opts.resolvers) {
        this.add_resolver(this.opts.resolvers);
      }

      this.proxy = this.create_proxy_server(this.opts);
      this.proxy.on('proxyReq', function (p, req) {
        if (req.headers.host != null) {
          p.setHeader('host', req.headers.host);
        }
      });
    }

    var _this = this;

    var server = this.setup_server(this.proxy, this.logger, this.opts);
    server.on('upgrade', function (req, socket, head) {
      _this.websocketsUpgrade(req, socket, head);
    }); //console.log(server)

    server.listen(opts.port, opts.host);

    if (opts.error_handler && _.isFunction(opts.error_handler)) {
      this.proxy.on('error', opts.error_handler);
    } else {
      this.proxy.on('error', this.proxy_error_handler);
    }

    this.logger && this.logger.info('Started a AnchorGateway proxy server on port %s', opts.port);
  }

  _createClass(AnchorGateway, [{
    key: "get_source",
    value: function get_source(req) {
      if (this.opts.preferForwardedHost === true && req.headers['x-forwarded-host']) {
        return req.headers['x-forwarded-host'].split(':')[0];
      }

      if (req.headers.host) {
        return req.headers.host.split(':')[0];
      }
    }
  }, {
    key: "create_proxy_server",
    value: function create_proxy_server(opts) {
      var proxy;

      if (opts.ssl && opts.ssl.key && opts.ssl.cert) {
        proxy = httpProxy.createServer({
          xfwd: opts.xfwd != false,
          prependPath: false,
          secure: opts.secure !== false,
          ws: opts.ws !== false,
          ssl: {
            key: opts.ssl.key,
            cert: opts.ssl.cert
          }
        });
      } else {
        proxy = httpProxy.createProxyServer({
          xfwd: opts.xfwd != false,
          ws: opts.ws !== false,
          prependPath: false,
          secure: opts.secure !== false
        });
      } //console.log(proxy)


      return proxy;
    }
  }, {
    key: "resolve",
    value: function resolve(host, url, req) {
      var promise_array = [];

      var _this = this;

      host = host && host.toLowerCase(); // console.log('RESOLVERS in resolve func ========')
      // console.log(this.resolvers)

      for (var i = 0; i < this.resolvers.length; i++) {
        promise_array.push(this.resolvers[i].call(this, host, url, req));
      }

      return Promise.all(promise_array).then(function (resolverResults) {
        for (var i = 0; i < resolverResults.length; i++) {
          var route = resolverResults[i]; // console.log(route)
          // console.log('in for after promise all')
          // console.log(route)

          if (route && (route = _this.build_route(route))) {
            // ensure resolved route has path that prefixes URL
            // no need to check for native routes.
            if (!route.isResolved || route.path === '/' || _this.starts_with(url, route.path)) {
              return route;
            }
          }
        }
      })["catch"](function (error) {
        console.error('Resolvers error:', error);
      });
    }
  }, {
    key: "build_route",
    value: function build_route(route) {
      var _this = this;

      if (!_.isString(route) && !_.isObject(route)) {
        console.log('route is not a string or an object');
        return null;
      }

      if (_.isObject(route) && route.hasOwnProperty('urls') && route.hasOwnProperty('path')) {
        // default route type matched.
        return route;
      }

      var cacheKey = route;
      var entry = route_cache.get(cacheKey);

      if (entry) {
        return entry;
      }

      var route_obj = {
        rr: 0,
        isResolved: true,
        urls: [],
        path: ''
      };

      if (_.isString(route)) {
        route_obj.urls = [this.build_target(route)];
        route_obj.path = '/';
      } else {
        if (!route.hasOwnProperty('url')) {
          console.log('doesnt have url prop');
          return null;
        }

        route_obj.urls = (_.isArray(route.url) ? route.url : [route.url]).map(function (url) {
          return _this.build_target(url, route.opts || {});
        });
        route_obj.path = route.path || '/';
      }

      route_cache.set(cacheKey, route_obj);
      return route_obj;
    }
  }, {
    key: "setup_server",
    value: function setup_server(proxy, logger, opts) {
      var _this = this;

      var server_module;
      var ssl_opts = opts.ssl || null;

      if (!opts.ssl) {
        server_module = opts.server_module || http;
      }

      if (opts.ssl && ssl_opts.key && ssl_opts.cert) {
        server_module = opts.server_module || https;
      }

      function create_server(ssl_opts, s_module, cb) {
        if (!ssl_opts || ssl_opts === null || ssl_opts === undefined) {
          return s_module.createServer(function (req, res) {
            cb(req, res);
          });
        } else {
          return s_module.createServer(ssl_opts, function (req, res) {
            cb(req, res);
          });
        }
      }

      var server = create_server(ssl_opts, server_module, function (req, res) {
        var source = _this.get_source(req);

        _this.get_target(source, req).then(function (target) {
          if (target) {
            proxy.web(req, res, {
              target: target,
              secure: !proxy.options || proxy.options.secure !== false
            });
          } else {
            _this.respond_not_found(req, res);
          }
        }.bind(_this))["catch"](function (err) {
          return console.log("Error setting up server", err);
        });
      });
      server.on('error', function (err) {
        logger && logger.error(err, 'HTTPS Server Error');
      });
      server.on('clientError', function (err) {
        logger && logger.error(err, 'HTTPS Client  Error');
      });
      return server;
    }
  }, {
    key: "websocketsUpgrade",
    value: function websocketsUpgrade(req, socket, head) {
      socket.on('error', function (err) {
        this.logger && this.logger.error(err, 'WebSockets error');
      });

      var _this = this;

      var src = this.get_source(req);
      console.log("=========== IN UPGRADE =============");
      this.get_target(src, req).then(function (target) {
        _this.logger && _this.logger.info({
          headers: req.headers,
          target: target
        }, 'upgrade to websockets');

        if (target) {
          _this.proxy.ws(req, socket, head, {
            target: target
          });
        } else {
          this.respond_not_found(req, socket);
        }
      });
    }
  }, {
    key: "get_target",
    value: function get_target(src, req) {
      var url = req.url;

      var _this = this;

      return this.resolve(src, url, req).then(function (route) {
        _this.logger.warn({
          route: route
        }, 'the route object');

        if (!route) {
          _this.logger && _this.logger.warn({
            src: src,
            url: url
          }, 'no valid route found for given source');
          return;
        }

        var pathname = route.path;

        if (pathname.length > 1) {
          //
          // remove prefix = require( src
          //
          req._url = url; // save original url

          req.url = url.substr(pathname.length) || '/';
        } //
        // Perform Round-Robin on the available targets
        // TODO: if target errors with EHOSTUNREACH we should skip this
        // target and try with another.
        //


        var urls = route.urls;
        var j = route.rr;
        route.rr = (j + 1) % urls.length; // get and update Round-robin index.

        var target = route.urls[j]; //
        // Fix request url if targetname specified.
        //

        if (target.pathname) {
          req.url = path.join(target.pathname, req.url);
        }

        if (this.opts.pfx) {
          if (!this.opts.passphrase) {
            throw new Error('No password for the  PKCS certificate');
          }

          target.pfx = this.opts.pfx;
          target.passphrase = this.opts.passphrase;
        } //
        // Host headers are passed through = require( the source by default
        // Often we want to use the host header of the target instead
        //


        if (target.useTargetHostHeader === true) {
          req.host = target.host;
        }

        _this.logger && _this.logger.info('Proxying %s to %s', src + url, path.join(target.host, req.url));
        return target;
      }.bind(_this));
    }
  }, {
    key: "add_resolver",
    value: function add_resolver(resolver) {
      if (this.opts.cluster && cluster.isMaster) return this;

      if (!_.isArray(resolver)) {
        resolver = [resolver];
      }

      var _this = this;

      resolver.forEach(function (resolv_obj) {
        if (!_.isFunction(resolv_obj)) {
          throw new Error("Resolver must be a function.");
        }

        if (!resolv_obj.hasOwnProperty('priority')) {
          resolv_obj.priority = 0;
        }

        _this.resolvers.push(resolv_obj);
      });
      _this.resolvers = _.sortBy(_.uniq(_this.resolvers), ['priority']).reverse();
    }
  }, {
    key: "remove_resolver",
    value: function remove_resolver(resolver) {
      if (this.opts.cluster && cluster.isMaster) return this; // since unique resolvers are not checked for performance,
      // just remove every existence.

      this.resolvers = this.resolvers.filter(function (resolver_fn) {
        return resolver_fn !== resolver;
      });
    }
  }, {
    key: "starts_with",
    value: function starts_with(input, str) {
      return input.slice(0, str.length) === str && (input.length === str.length || input[str.length] === '/');
    }
  }, {
    key: "default_resolver",
    value: function default_resolver(host, url) {
      if (!host) {
        return;
      } //this.priority = 1;


      url = url || '/';
      var routes = this.routing[host];
      var i = 0;

      if (routes) {
        var len = routes.length;

        for (i = 0; i < len; i++) {
          var route = routes[i];
          console.log('default resolver for'); //console.log(route)

          if (route.path === '/' || this.starts_with(url, route.path)) {
            return route;
          }
        }
      }
    }
  }, {
    key: "set_http",
    value: function set_http(link) {
      if (link.search(/^http[s]?\:\/\//) === -1) {
        link = 'http://' + link;
      }

      return link;
    }
  }, {
    key: "prepare_url",
    value: function prepare_url(_url) {
      _url = _.clone(_url);

      if (_.isString(_url)) {
        if (_url.search(/^ws\:\/\//) === -1 || this.opts.ws !== true) {
          _url = this.set_http(_url);

          if (!validUrl.isHttpUri(_url) && !validUrl.isHttpsUri(_url)) {
            throw Error('uri is not a valid http uri ' + _url);
          }
        }

        _url = url.parse(_url);
      }

      return _url;
    }
  }, {
    key: "build_target",
    value: function build_target(target, opts) {
      opts = opts || {};
      target = this.prepare_url(target);
      target.useTargetHostHeader = opts.useTargetHostHeader === true;
      return target;
    }
  }, {
    key: "init",
    value: function init(init_arr) {
      if (this.opts.cluster && cluster.isMaster) return this;
      var arr_length = init_arr.length;

      var _this = this;

      var routing = this.routing;

      for (var i = 0; i < arr_length; i++) {
        if (!init_arr[i].src || !init_arr[i].target) {
          throw Error('Cannot register a new route with unspecified src or target');
        }

        var src = init_arr[i].src = _this.prepare_url(init_arr[i].src);

        var target = init_arr[i].target = _this.build_target(init_arr[i].target, init_arr[i].opts);

        var host = routing[src.hostname] = routing[src.hostname] || [];
        var pathname = src.pathname || '/';

        var route = _.find(host, {
          path: pathname
        });

        if (!route) {
          route = {
            id: i,
            path: pathname,
            rr: 0,
            urls: []
          };
          host.push(route); //
          // Sort routes
          //

          routing[src.hostname] = _.sortBy(host, function (_route) {
            return -_route.path.length;
          });
        }

        this.logger && this.logger.info({
          from: src,
          to: target
        }, 'Registered a new schema');
        route.urls.push(target);
      }

      return this;
    }
  }, {
    key: "remove",
    value: function remove(id) {
      this.routing = _.remove(this.routing, function (o) {
        o.id === id;
      });
    }
  }, {
    key: "close",
    value: function close() {
      try {
        this.server.close();
      } catch (err) {
        console.log('Error closing server', err);
      }
    }
  }, {
    key: "respond_not_found",
    value: function respond_not_found(req, res) {
      res.statusCode = 404;
      res.write('Not Found');
      res.end();
    }
  }, {
    key: "proxy_error_handler",
    value: function proxy_error_handler(err, req, res) {
      if (err.code === 'ECONNREFUSED') {
        res.writeHead && res.writeHead(502);
      } else if (!res.headersSent) {
        res.writeHead && res.writeHead(500);
      }

      if (err.message !== 'socket hang up') {
        this.logger && this.logger.error(err, 'Proxy Error');
      }

      res.end(err.code);
    }
  }]);

  return AnchorGateway;
}();

module.exports = AnchorGateway;
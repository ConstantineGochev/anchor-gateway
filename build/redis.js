"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Redis = require('ioredis');

var RedisBackend = /*#__PURE__*/function () {
  function RedisBackend() {
    var port = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 6379;
    var hostname = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'localhost';
    var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _classCallCheck(this, RedisBackend);

    this.redis = new Redis(port, hostname, opts);
    this.prefix = opts.prefix + '';
    this.service_base_key = base_key(this.prefix);
  }

  _createClass(RedisBackend, [{
    key: "register",
    value: function register(service) {
      var service_base_key = this.service_base_key;
      return this.redis.incr(service_base_key + 'counter').then(function (id) {
        // Store it
        this.redis.hset(service_base_key + id, service).then(function () {
          return id;
        });
      });
    }
  }, {
    key: "get_service",
    value: function get_service(id) {
      return this.redis.hgetall(this.service_base_key + id).then(function (service) {
        if (service) {
          return service;
        } else {
          //
          // Service has expired,  delete it from the service set.
          //
          return this.redis.srem(id);
        }
      });
    }
  }, {
    key: "get_all_services",
    value: function get_all_services() {
      var _this = this;

      return this.redis.smembers(this.service_base_key + 'ids').then(function (service_ids) {
        return Promise.all(_.map(service_ids, function (id) {
          return _this.get_service(id);
        }));
      }).then(function (services) {
        // Clean expired services
        return _.compact(services);
      });
    }
  }]);

  return RedisBackend;
}();

function base_key(prefix) {
  return 'anchor-' + prefix + '-services-';
}

module.exports = RedisBackend;
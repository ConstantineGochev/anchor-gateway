const Redis = require('ioredis')
const _ = require('lodash')
class RedisBackend {
  constructor(port = 6379, hostname = 'localhost', opts = {}) {
    this.redis = new Redis(port, hostname, opts);
    this.prefix = opts.prefix || ''
    this.base_key = base_key(this.prefix);
  }

  register(service) {
    const base_key = this.base_key;

    this.redis.sadd(`${base_key}:SERVICES`, service).then(function() {
      console.log("REDIS REGISTED SERVICE")
      return id
    }).catch(err => console.log(err))
  }
  set_cache_routes(id, routes) {
    this.get_service(id).then(service => {

      this.redis.hset(service, this.create_set(routes))
    })
  }
  create_set(arr) {

  }
  get_service(id) {
    return this.redis.getall(this.service_base_key + id).then(function(
      service) {
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
  get_all_services() {
    var _this = this;

    return this.redis.smembers(this.service_base_key + 'ids').then(function(
        service_ids) {
        console.log("SERVICE IDS", service_ids)
        return service_ids
          // return Promise.all(_.map(service_ids, function(id) {
          //   return _this.get_service(id);
          // }));
      }).catch(err => console.log(err))
      // .then(function(services) {
      //   // Clean expired services
      //   return _.compact(services);
      // });
  }
}

function base_key(prefix) {
  return 'anchor-' + prefix + '-services-';
}
module.exports = RedisBackend

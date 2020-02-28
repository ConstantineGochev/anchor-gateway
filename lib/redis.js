const Redis = require('ioredis')

class RedisBackend {
  constructor(port = 6379, hostname = 'localhost', opts = {}) {
    this.redis = new Redis(port, hostname, opts);
    this.prefix = opts.prefix + ''
    this.service_base_key = base_key(this.prefix);
  }

register(service) {
  const service_base_key = this.service_base_key;

  	return this.redis.incr(service_base_key + 'counter').then(function(id){
		// Store it
		this.redis.hset(service_base_key + id, service).then(function(){
			return id;
		})
	})
 }

 get_service(id) {
   return this.redis.hgetall(this.service_base_key + id).then(function(service){
   if(service){
     return service;
   }else{
     //
     // Service has expired,  delete it from the service set.
     //
     return this.redis.srem(id);
   }
 });
 }
 get_all_services() {
  var _this = this;

	return this.redis.smembers(this.service_base_key + 'ids').then(function(service_ids){
		return Promise.all(_.map(service_ids, function(id){
			return _this.get_service(id);
		}));
	}).then(function(services){
		// Clean expired services
		return _.compact(services);
	});
 }
}
function base_key(prefix) {
  return 'anchor-' + prefix + '-services-';
}
module.exports = RedisBackend

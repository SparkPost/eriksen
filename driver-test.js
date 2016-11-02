'use strict';
const redis = require('redis');
const log = console;

let count = 0
  , client = redis.createClient({
    host: 'localhost',
    port: 6379
  });

client.on('connect', () => {
  log.log('Logging messages...');
  streamMessage(client, 'eriksen-dev-bloop');
});

function streamMessage(client, key) {
  client.lpop(key, function(err, reply) {
    if (!err && reply) {
      count++;

      log.log('Received message', err, JSON.parse(reply));
      return streamMessage(client, key);
    }

    log.log(`Received all ${count} messages.`, err, JSON.parse(reply));
    client.unref();
  });
}

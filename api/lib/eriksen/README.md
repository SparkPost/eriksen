# Eriksen

Eriksen is a model factory that makes it easy to write model code that retrieves
or saves data to multiple, configurable places.  It's main job is to 
[Marshal](http://www.imdb.com/character/ch0026515/) reads & writes to a configurable 
and swappable backend, allowing for a separation that preserves an interface even
when the backend data storage system changes.

## Why?

Eriksen is useful when you're writing code that may change database backends, or 
if you're currently changing code to move from one backend to another.  Since it 
concerns itself with only the db interactions from your code, it allows your data
access code to be more modularized within a codebase.  And since Eriksen acts as
the coding interface, you should not need to change any other code unless expectations
change as db backends switch in or out.

Because Eriksen sits between the code that accesses a backend storage system, this 
allows for Eriksen to do some smart things that can help out during situations like
migrating from one system to another, such as:

1. Logging failures for a non-primary backend in the background
1. Allows for configuring a wait time before processing writes for a given store
1. Queueing writes to a local [LevelDB](https://github.com/Level/levelup) store 
   instead of processing them immediately
1. Processing a queue of writes through library functionality 

## Usage

### Instantiate and Configure Eriksen

```
  let model = new Eriksen('accounts');

  model.addModel('cassandra', cassandraModel);
  model.addModel('dynamodb', dynamodbModel);
  model.setPrimary('cassandra');
```

### Add two models to Eriksen

```
  let cassandraMapper = {
    getAllOfTheThings: (name) => {
      return cassandra.query("SELECT ...");
    }
  }

  let dynamoMapper = {
    getAllOfTheThings: (name) => {
      return aws.dynamodb.DocumentClient(...);
    }
  }

  let Eriksen = require('eriksen');
  let model = new Eriksen('allThings');
  model.addModel('cassandra', cassandraMapper);
  model.addModel('dynamodb', dynamodbMapper);
  model.setPrimary('cassandra');

  function retrieveAllOfTheThings(thingName) {
    return model.getAllOfTheThings(name);
  }
```

### Configure Eriksen

```
  let model = new Eriksen('accounts');

  model.addModel('cassandra', cassandraModel);
  model.addModel('dynamodb', dynamodbModel);
  model.setPrimary('cassandra');

  model.configure('dynamodb', {
    waitTime: 0 | 60 | 120, // Number of seconds to sleep before invoking the method for this backend
    queue: false | true, // If true, queue any writes to disk
    queueLocation: '/tmp/queue' // Defaults to /tmp/queue-{{ model }}-{{ backend }}.queue
  });
```

### Back-filling a queue of writes

```
  let model = new Ericksen('accounts');
  model.addModel('dynamodb', dynamodbModel);
  model.setPrimary('dynamodb');

  model.flushQueue('/tmp/queue-accounts-dynamodb.queue')
    .then(() => {
      console.log('Done processing queue!');
    })
```

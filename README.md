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

  model.configure({
    waitTime: 0 | 60 | 120, // Number of seconds to sleep before invoking the method for this backend
  });
```

### Set Eriksen to only wrap certain methods on a secondary object (others with no-op)

```
  let model = new Eriksen('accounts');

  model.addModel('cassandra', cassandraModel);
  model.addModel('dynamodb', dynamodbModel, ['callThis', 'andThis]);
  model.setPrimary('cassandra');

  model.configure({
    waitTime: 0 | 60 | 120, // Number of seconds to sleep before invoking the method for this backend
    queue: false | true, // If true, queue any writes to disk
    queueLocation: '/tmp/queue' // Defaults to /tmp/queue-{{ model }}-{{ backend }}.queue
  });
```

### Back-filling a queue of writes

```
  let model = new Ericksen('accounts');
  model.addModel('cassandra', dynamodbModel);
  model.addModel('dynamodb', dynamodbModel);
  model.setPrimary('dynamodb');

  model.configure({
    queue: {
      host: 'localhost',
      port: 6379,
      messageKey: 'eriksen-dev-meta',
      queueKey: 'eriksen-dev-accounts'
    }
  });

  setTimeout(() => {
    lawyer.setQueueState(true);
  }, 1000);

  setTimeout(() => {
    app.performMigrationSteps()
      .then(() => {
        // Transition from true -> false will flush the backlog
        // of queued writes across cluster
        lawyer.setQueueState(false);
      });
  }, 2000);
```

## Behaviors

### What configuration can an Eriksen model take?

| key | type | default | description |
| --- | ---- | ------- | ----------- |
| waitTime | int | 0 | Allows for waiting a configurable number of seconds before flushing a write to the backend data model.  This can be useful for delaying writes during a short migration, or to validate that resources aren't consumed for secondary models within the request|
| queue | object{host, port, messageKey, queueKey} | false | Allows for specifying that instead of actually invoking a model's backend, queue the metadata about the method call to disk so that it can be replayed later|
| logger | object | nil | A logger object that supports at least `log()` and `error()` methods, which Eriksen will use to display error / status information about requests.  Useful for debugging errors on secondary methods.  By default, no logs will be generated.|

#### Queue Options

`queue.host` : A redis hostname / ip addr
`queue.port` : A redis port
`queue.queueKey` : A key that uniquely identifies the model & environment where queues should occur.  Defaults to `eriksen-${modelName}-${NODE_ENV}`
`queue.messageKey` : A redis message channel name for communicating state changes for migrations, that should correspond to where the events would be captured.  Defaults to `eriksen-metadata`.


### How does Eriksen name methods?

Eriksen simply wraps calls to the underlying model methods as means to inject logic (i.e., for swapping the models, logging errors, queueing method calls instead of invoking them, or delaying calls to a backend).  It works under the assumption that two models that are passed in will share a similar prototype, with all of the methods you intend to invoke taking the same arguments and returning the same data structure.
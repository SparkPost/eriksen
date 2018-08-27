# Eriksen

Eriksen is a model factory that makes it easy to write model code that retrieves
or saves data to multiple, configurable places.  It's main job is to
[Marshal](https://en.wikipedia.org/wiki/Marshall_Eriksen) reads & writes to a configurable
and swappable backend, allowing for a separation that preserves an interface even
when the backend data storage system changes.

## Installation

```
npm i eriksen
```

## Why?

Eriksen is useful when you're writing code that may change database backends, or
if you're currently changing code to move from one backend to another.  Since it
concerns itself with only the db interactions from your code, it allows your data
access code to be more modularized within a codebase.  And since Eriksen acts as
the coding interface, you should not need to change any other code unless expectations
change as db backends switch in or out.

Because Eriksen sits between the code that accesses a backend storage system, this
allows for Eriksen to log failures for a non-primary backend in the background.

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

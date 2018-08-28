# Eriksen
[![Build Status](https://travis-ci.org/SparkPost/eriksen.svg?branch=master)](https://travis-ci.org/SparkPost/eriksen)

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
This example creates two models in different databases and configures eriksen to use cassandra as the primary and dynamodb as the secondary. It calls the getAllOfTheThings method with cassandra as the primary, meaning if the getAllOfTheThings fails in dynamo, it just logs out the errors, does not fail the call. If the primary fails it will throw an error.

```
  // cassandra model
  const cassandraMapper = {
    getAllOfTheThings: (name) => {
      return cassandra.query("SELECT ...");
    }
  }

  // dynamo model
  const dynamoMapper = {
    getAllOfTheThings: (name) => {
      return aws.dynamodb.DocumentClient(...);
    }
  }

  const Eriksen = require('eriksen');
  const model = new Eriksen('allThings');
  model.addModel('cassandra', cassandraMapper);
  model.addModel('dynamodb', dynamoMapper);
  model.configure({
    primary: cassandraMapper,
    secondary: dynamoMapper
  });

  function retrieveAllOfTheThings(thingName) {
    return model.proxy.getAllOfTheThings(name);
  }

  // calling function that calls the eriksen instance to marshall calls
  retrieveAllOfTheThings('allMyThings')
    .then((things) => {
      console.log('list of my things', things);
    })
    .catch((err) => {
      console.log(`it failed ${err.message}`);
    });
```

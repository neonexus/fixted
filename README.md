# Fixted
### A simple way to populate [Sails.js](https://sailsjs.com) v1 models with data fixtures for testing purposes.

Fixted is based on [Barrels](https://www.npmjs.com/package/barrels), by Ruslan Bredikhin.

[![npm](https://img.shields.io/npm/dm/fixted?logo=npm&style=plastic)](https://www.npmjs.com/package/fixted)
[![Build Status](https://img.shields.io/travis/com/neonexus/fixted/master?style=plastic&logo=travis)](https://app.travis-ci.com/neonexus/fixted)
[![NPM version](https://img.shields.io/npm/v/fixted/latest?style=plastic&logo=npm&label=latest)](https://www.npmjs.com/package/fixted)
[![GitHub version](https://img.shields.io/github/v/release/neonexus/fixted?style=plastic&logo=github&label=latest)](https://github.com/neonexus/fixted)
[<img src="mit.svg" width="95" height="18">](LICENSE)

## Installation

```console
npm i --save-dev fixted
```

## Real-World Usage Example

See [neonexus/sails-react-bootstrap-webpack](https://github.com/neonexus/sails-react-bootstrap-webpack/blob/release/test/startTests.js#L153) for an example of automated tests that depend on fake data.

## Usage

Drop your fixtures in `test/fixtures` as JSON files (or CommonJS modules) named after your models. See [test/fixtures](test/fixtures) for examples.

Once your [Sails.js](http://sailsjs.org/) server is running:

```javascript
const Fixted = require('fixted');
const fixted = new Fixted();
const fixtures = fixted.data;

// then we populate our datastore, with automatic accociation support
fixted.populate((err) => {
    // perform tests on your models, which should be populated with data
});
```

Pass to the constructor the path to the folder containing your fixtures
(defaults to `./test/fixtures`).

`Populate`'ing the test database involves three steps:

* Removing any existing data from the collection corresponding to the fixture
* Loading the fixture data into the test database
* Automatically applying associations (can be disabled by passing `false` as
  the last parameter to `populate`)

`Populate` also accepts an array of names of collections to populate as
the first (optional) argument, for example:

```javascript
fixted.populate(['products'], function(err) {
    // Only products will be populated
});
```

## Automatic association

Use the number of position (starting from one) of an entry in the JSON fixture
as a reference to associate models (see
[test/fixtures/products.json](test/fixtures/products.json)
for example). This feature can be disabled by passing `false` as the last
parameter to `populate`.

## Required associations

If you have any associations described as `required: true`, they will be
added automatically, no matter if the last parameter to `populate` is `false`
or not. However, you have to load your fixtures gradually (by passing an array
of collection names as the first parameter) in such an order that collections
corresponding to the required associations get populated first.

Let's say, for example, you are implementing a `Passport.js`-based
authentication, and every `Passport` has `User` as a required association. You'd
write something like this:

```javascript
fixted.populate(['user', 'passport'], function(err) {
    if (err) {
        return done(err); // Higher level callback
    }

    // Do your thing...
    done();
});
```

## Dependencies

* [Async.js](https://github.com/caolan/async)
* [Lo-Dash](http://lodash.com/)

## License

[The MIT License](http://opensource.org/licenses/MIT)

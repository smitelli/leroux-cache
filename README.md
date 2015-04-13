# leroux-cache

A cache object that *actually* deletes the least-recently-used items.

[![Build Status](https://travis-ci.org/smitelli/leroux-cache.svg?branch=master)](https://travis-ci.org/smitelli/leroux-cache) [![Coverage Status](https://coveralls.io/repos/smitelli/leroux-cache/badge.svg?branch=master)](https://coveralls.io/r/smitelli/leroux-cache?branch=master)

## Basic Usage

```js
var cache = require('leroux-cache')();

cache.set('one', "Item One");
cache.set('two', {value: "Item Two"});

cache.get('one');
// 'Item One'

cache.get('two');
// { value: 'Item Two' }

cache.del('two');
cache.get('two');
// undefined
```

## TODO

This documentation is woefully incomplete.

## Acknowledgements

This module was heavily inspired by [node-lru-cache](https://github.com/isaacs/node-lru-cache).
While it doesn't maintain strict compatibility with the original API anymore, it
should still be pretty close.

## License

MIT

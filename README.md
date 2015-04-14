# leroux-cache

A cache object that *actually* deletes the least-recently-used items.

by [Scott Smitelli](mailto:scott@smitelli.com)

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

## Initialization

A cache instance can be obtained with or without the use of `new`. The following
two caches are equivalent:

```js
var leroux = require('leroux-cache'),
    cache1 = leroux(),
    cache2 = new leroux();
```

`cache1` and `cache2` are separate, but otherwise equivalent cache instances. No
data is shared between instances.

An `options` object can be passed to the initialization function. This is a
plain Object. See the **Options** section for information on the available keys
that can be used here.

```js
var cache = require('leroux-cache')({
    maxAge  : 60 * 1000,
    maxSize : 1000
});
```

## Options

Every option can be set by passing an `options` object to the initialization
function. Every option can also be read through the corresponding property on
a cache instance. Many of these options can also be set through the instance
properties, and the cache will respond accordingly.

If an attempt is made to set an option to an invalid value, the request will be
silently dropped and the previous value (possibly the default) will prevail.

* **maxAge:** (Defaults to `null`) Can be any number greater than zero, or
`null` to disable the behavior. The unit is milliseconds. If a cached item has
not been used (via the `get()` or `set()` methods) within the last `maxAge`
milliseconds, it will be dropped from the cache. This attribute can be read and
written on the fly.

* **maxSize:** (Defaults to `null`) Any number greater than zero, or `null` to
disable the behavior. The unit varies. If the cache's total `size` exceeds
`maxSize` at any point, items will be dropped from the cache until the `size` is
small enough again. This is a rather exceptional condition, and the choice of
which items are dropped is not predictable. This attribute can be read and
written on the fly.

* **sizeFn:** (Defaults to a counting function where each item equals exactly
`1`) Any JS function. This function will be invoked with a single argument, the
value of a cache item. This function should return a number representing the
"size" of the cache item's value. The cache will sum all of the returned sizes
to determine the total size of the cache, and compare this to the `maxSize`
option to determine if items need to start being dropped. This attribute can be
read and written on the fly, and changes will result in the entire cache being
re-measured.

* **sweepDelay:** (Defaults to 2500 ms) Any number greater than zero. The unit
is milliseconds. This option controls the interval between sweep operations.
Each sweep operation drops expired items from the cache and makes sure that the
overall size is not greater than `maxSize`.

## Cache API

* **size:** A read-only property indicating the current size of all the cache
items. This count may include items that have expired but not yet been swept,
so set `sweepDelay` to occur more frequently to improve the accuracy of this
count.

* **set(key, value):** Adds a new item to the cache, or replaces an existing
item. The `key` and `value` can be any type, but using an object reference as
a key may hold unwanted references that could impede garbage collection. Each
call to `set()` resets the last-used timestamp.

* **del(key):** Removes `key` from the cache. If such an item does not exist,
this method is a no-op.

* **reset():** Drops all cache items and resets the cache to its initial state.
Any options that were already set will be preserved.

* **get(key):** Return the stored value for `key`. If such an item does not
exist, this method returns `undefined`. Each call to `get()` resets the
last-used timestamp.

* **has(key):** Return `true` if the cache currently holds a value for `key`, or
`false` otherwise.

* **forEach(fn, [context]):** Invoke the supplied function for each item in the
cache. `fn` is called with arguments (`value, key, cache`). `key` and `value`
are self-explanatory. `cache` is a reference to the cache instance. The optional
`context` will be used as `this` inside the invoked function. If not specified,
`context` is a reference to the cache instance.

## Theory of Operation

The cache object is a simple JS Object instance with a `null` prototype. Entries
are keyed by the `key` supplied through the public API methods. Each entry is
represented by an `Entry` instance that holds the entry's key, value, size, and
last-used timestamp. When an item is created or updated, the last-used timestamp
is set to the current time, and the entry's size is computed by running the
value through the `sizeFn` and taking the returned number. A running total size
count is kept at the cache level.

When cache items are used via `get()`, a quick check is done to make sure that
the entry is not too old. If it is too old, `undefined` is returned, otherwise
the last-used timestamp is updated to the current time and the true value is
returned.

The novel part of the implementation is centered around the `Sweeper`. The
cache, at any given time, has one sweeper instance open. Any time an entry's
last-used timestamp is set or updated, the entry's `key` is appended to a list
contained within the currently-open sweeper. During each scheduled sweep
interval, the current sweeper instance is taken out of service and pushed onto
the end of a queue. A fresh, empty `Sweeper` instance is put in its place.

This queue of `Sweepers` is consumed in a FIFO manner. Each sweeper contains
a snapshot of every cache key that was read or written during the slice of time
when that particular sweeper was open. When the oldest sweeper in the queue
becomes older than `maxAge`, we know it's possible that some of the keys it
references are at least that old too. The old sweeper is shifted off, the keys
contained inside are iterated over, and any of those cache entries that have
not been touched are deleted in one batch.

The beauty of this approach is that it consolidates all the deletions into a
single tick, and spreads these ticks out over a predictable and configurable
span of time. Compare this to a scheme where expired entries are deleted on
(attempted) use -- not only does it leave a lot of dead data hanging around in
memory that could be better used elsewhere, but it opens up the possibility to
have a lot of GC thrash during `get()` or `has()` operations.

Is this approach measurably better? No idea. But there was no harm in trying.

## Acknowledgements

This module was heavily inspired by [node-lru-cache](https://github.com/isaacs/node-lru-cache).
While it doesn't maintain strict compatibility with the original API anymore, it
should still be pretty close.

## License

MIT

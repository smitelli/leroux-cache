'use strict';

var defaultOptions = {
    length : function () { return 1; },
    max    : null,
    maxAge : null,
    sweep  : 5000
};

function LRUCache (options) {
    if (!(this instanceof LRUCache)) {
        return new LRUCache(options);
    }

    if (typeof options === 'number') {
        options = { max : options };
    }

    if (!options) {
        options = {};
    }

    this._sizeFn = (typeof options.length === 'function') ?
        options.length : defaultOptions.length;

    this._maxSize = (typeof options.max === 'number' && options.max > 0) ?
        options.max : defaultOptions.max;

    this._maxAge = (typeof options.maxAge === 'number' && options.maxAge > 0) ?
        options.maxAge : defaultOptions.maxAge;

    this._sweepDelay = (typeof options.sweep === 'number' && options.sweep > 0) ?
        options.sweep : defaultOptions.sweep;

    this.reset();
}

LRUCache.prototype.reset = function () {
    var self = this;

    function fn () {
        sweep(self);
    }

    this._cache      = Object.create(null);
    this._cacheSize  = 0;
    this._sweepQueue = [];
    this._sweeper    = new Sweeper();

    clearInterval(this._sweepIntervalID);
    this._sweepIntervalID = setInterval(fn, this._sweepDelay);
};

LRUCache.prototype.del = function (key) {
    var hit = this._cache[key];

    if (hit instanceof Entry) {
        this._cacheSize -= hit.size;
        delete this._cache[key];
    }
};

LRUCache.prototype.get = function (key) {
    var hit = get(this, key);

    if (!hit) {
        return undefined;
    }

    hit.touch();
    this._sweeper.track(key);

    return hit.value;
};

LRUCache.prototype.has = function (key) {
    return !!get(this, key);
};

LRUCache.prototype.set = function (key, value) {
    var hit  = this._cache[key],
        size = this._sizeFn(value);

    if (hit instanceof Entry) {
        hit.value = value;
        hit.size  = size;
        hit.touch();
    } else {
        this._cache[key] = new Entry(key, value, size);
    }

    this._cacheSize += size;
    this._sweeper.track(key);
};

function get (self, key) {
    var hit = self._cache[key],
        cutoff;

    if (!(hit instanceof Entry)) {
        return undefined;
    }

    if (self._maxAge) {
        cutoff = Date.now() - self._maxAge;

        if (hit.untouchedSince(cutoff)) {
            return undefined;
        }
    }

    return hit;
}

function sweep (self) {
    var cutoff,
        sw;

    function oversize () {
        return (self._maxSize && self._cacheSize > self._maxSize);
    }

    self._sweepQueue.push(self._sweeper);
    self._sweeper = new Sweeper();

    if (self._maxAge) {
        cutoff = Date.now() - self._maxAge;

        if (self._sweepQueue[0].untouchedSince(cutoff)) {
            sw = self._sweepQueue.shift();

            sw.keys.forEach(function (key) {
                var hit = self._cache[key];

                if (hit.untouchedSince(cutoff)) {
                    self.del(key);
                }
            });
        }
    }

    while (oversize() && self._sweepQueue) {
        sw = self._sweepQueue.shift();

        while (oversize() && sw.keys) {
            self.del(sw.keys.shift());
        }
    }
}

function Entry (key, value, size) {
    this.key   = key;
    this.value = value;
    this.size  = size;

    this.touch();
}

Entry.prototype.touch = function () {
    this.touched = Date.now();
};

Entry.prototype.untouchedSince = function (cutoff) {
    return (this.touched < cutoff);
};

function Sweeper () {
    this.keys = [];

    this.touch();
}

Sweeper.prototype.track = function (key) {
    if (this.keys.indexOf(key) === -1) {
        this.keys.push(key);
    }

    this.touched = Date.now();
};

Sweeper.prototype.untouchedSince  = function (cutoff) {
    return (this.touched < cutoff);
};

module.exports = LRUCache;

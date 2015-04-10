'use strict';

var defaultOptions = {
    length : function () { return 1; }
    max    : Infinity,
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

    this._lengthFn = (typeof options.length === 'function') ?
        options.length : defaults.length;

    this._max = (typeof options.max === 'number' && options.max > 0) ?
        options.max : defaultOptions.max;

    this._maxAge = (typeof options.maxAge === 'number' && options.maxAge > 0) ?
        options.maxAge : defaults.maxAge;

    this._sweep = (typeof options.sweep === 'number' && options.sweep > 0) ?
        options.sweep : defaults.sweep;

    this.reset();
}

LRUCache.prototype.del = function (key) {
    if (this._cache[key] instanceof Entry) {
        this._length -= this._cache[key].length;
        delete this._cache[key];
    }
};

LRUCache.prototype.get = function (key) {
    if (!this.has(key)) {
        return undefined;
    }

    this._cache[key].touch();
    this._sweeper.track(key);
    return this._cache[key].value;
};

LRUCache.prototype.has = function (key) {
    if (!(this._cache[key] instanceof Entry)) {
        return false;
    }

    if (this._maxAge && this._cache[key].age() > this._maxAge) {
        return false;
    }

    return true;
};

LRUCache.prototype.reset = function () {
    this._cache      = Object.create(null);
    this._length     = 0;
    this._sweepQueue = [];
    this._sweeper    = new Sweeper();

    clearInterval(this._sweepInterval);
    this._sweepInterval = setInterval(this._doSweep.bind(this), this._sweep);
};

LRUCache.prototype.set = function (key, value) {
    var length = this._lengthFn(value);

    if (this._cache[key] instanceof Entry) {
        this._cache[key].value  = value;
        this._cache[key].length = length;
        this._cache[key].touch();
    } else {
        this._cache[key] = new Entry(key, value, length);
    }

    this._length += length;
    this._sweeper.track(key);
};

LRUCache.prototype._doSweep = function () {
    var sw;

    this._sweepQueue.push(this._sweeper);
    this._sweeper = new Sweeper();

    if (this._maxAge && this._sweepQueue[0].age() > this._maxAge) {
        sw = this._sweepQueue.shift();

        sw.keys.forEach(function (key) {
            if (this._cache[key].age() > this._maxAge) {
                this.del(key);
            }
        }, this);
    }

    while (this._length > this._max) {
        // TODO start throwing things away if the cache is too big
    }
};

function Entry (key, value, length) {
    this.key    = key;
    this.value  = value;
    this.length = length;

    this.touch();
}

Entry.prototype.age = function () {
    return Date.now() - this.touched;
};

Entry.prototype.touch = function () {
    this.touched = Date.now();
};

function Sweeper () {
    this.keys = [];

    this.touch();
}

Sweeper.prototype.age  = function () {
    return Date.now() - this.touched;
}

Sweeper.prototype.track = function (key) {
    if (this.keys.indexOf(key) === -1) {
        this.keys.push(key);
    }

    this.touched = Date.now();
};

if (typeof module === 'object' && module.exports) {
    module.exports = LRUCache;
} else {
    this.LRUCache = LRUCache;
}

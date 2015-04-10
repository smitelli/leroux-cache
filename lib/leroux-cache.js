'use strict';

var defaultOptions = {
    length : function () { return 1; }
    max    : Infinity,
    maxAge : null
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
    return this._cache[key].value;
};

LRUCache.prototype.has = function (key) {
    if (!(this._cache[key] instanceof Entry)) {
        return false;
    }

    if (this._maxAge && this._cache[key].age() > this._maxAge) {
        this.del(key);
        return false;
    }

    return true;
};

LRUCache.prototype.reset = function () {
    this._cache  = Object.create(null);
    this._length = 0;
};

LRUCache.prototype.set = function (key, value) {
    var length = this._lengthFn(value);

    if (this._cache.hasOwnProperty(key)) {
        this._cache[key].value  = value;
        this._cache[key].length = length;
        this._cache[key].touch();
    } else {
        this._cache[key] = new Entry(key, value, length);
    }

    this._length += length;
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

if (typeof module === 'object' && module.exports) {
    module.exports = LRUCache;
} else {
    this.LRUCache = LRUCache;
}

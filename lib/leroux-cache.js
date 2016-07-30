'use strict';

function LRUCache (options) {
    if (!(this instanceof LRUCache)) {
        return new LRUCache(options);
    }

    this.sizeFn     = function () { return 1; };
    this.maxSize    = null;
    this.maxAge     = null;
    this.sweepDelay = 2500;

    if (typeof options === 'number') {
        options = { maxSize : options };
    }

    if (!options) {
        options = {};
    }
    this.sizeFn     = options.sizeFn;
    this.maxSize    = options.maxSize;
    this.maxAge     = options.maxAge;
    this.sweepDelay = options.sweepDelay;

    this.reset();
}

Object.defineProperty(LRUCache.prototype, 'sizeFn', {
    set : function (value) {
        var key, hit, size;

        if (typeof value === 'function') {
            this._sizeFn = value;

            this._cacheSize = 0;
            for (key in this._cache) {
                /* istanbul ignore else */
                if (hasOwnProp(this._cache, key)) {
                    hit = this._cache[key];

                    size = this._sizeFn(hit.value);
                    hit.size = size;
                    this._cacheSize += size;
                }
            }
        }
    },
    get : function () { return this._sizeFn; },
    enumerable : true
});

Object.defineProperty(LRUCache.prototype, 'maxSize', {
    set : function (value) {
        if (value === null || (typeof value === 'number' && value > 0)) {
            this._maxSize = value;
        }
    },
    get : function () { return this._maxSize; },
    enumerable : true
});

Object.defineProperty(LRUCache.prototype, 'maxAge', {
    set : function (value) {
        if (value === null || (typeof value === 'number' && value > 0)) {
            this._maxAge = value;
        }
    },
    get : function () { return this._maxAge; },
    enumerable : true
});

Object.defineProperty(LRUCache.prototype, 'sweepDelay', {
    set : function (value) {
        if (typeof value === 'number' && value > 0) {
            this._sweepDelay = value;

            resetSweepInterval(this);
        }
    },
    get : function () { return this._sweepDelay; },
    enumerable : true
});

Object.defineProperty(LRUCache.prototype, 'size', {
    get : function () { return this._cacheSize; },
    enumerable : true
});

LRUCache.prototype.reset = function () {
    this._cache      = Object.create(null);
    this._cacheSize  = 0;
    this._sweepQueue = [];
    this._sweeper    = new Sweeper();

    resetSweepInterval(this);
};

LRUCache.prototype.del = function (key) {
    var hit = this._cache[key];

    if (hit instanceof Entry) {
        this._cacheSize -= hit.size;
        delete this._cache[key];
    }
};

/**
 * @todo I'm torn -- should this touch() each hit as it iterates over them?
 */
LRUCache.prototype.forEach = function (fn, context) {
    var key, hit;

    context = context || this;

    for (key in this._cache) {
        /* istanbul ignore else */
        if (hasOwnProp(this._cache, key)) {
            hit = get(this, key);

            if (hit) {
                fn.call(context, hit.value, hit.key, this);
            }
        }
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
        size = this.sizeFn(value);

    if (hit instanceof Entry) {
        this._cacheSize -= hit.size;

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

    if (self.maxAge) {
        cutoff = Date.now() - self.maxAge;

        if (hit.untouchedSince(cutoff)) {
            return undefined;
        }
    }

    return hit;
}

function hasOwnProp (obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function resetSweepInterval (self) {
    clearInterval(self._sweepIntervalID);

    self._sweepIntervalID = setInterval(function () {
        sweep(self);
    }, self.sweepDelay);
}

function sweep (self) {
    var cutoff, sw;

    function oversize () {
        return (self.maxSize && self.size > self.maxSize);
    }

    self._sweepQueue.push(self._sweeper);
    self._sweeper = new Sweeper();

    if (self.maxAge) {
        cutoff = Date.now() - self.maxAge;

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

    while (oversize() && self._sweepQueue.length) {
        sw = self._sweepQueue[0];

        while (oversize() && sw.keys.length) {
            self.del(sw.keys.shift());
        }

        if (!sw.keys.length) {
            self._sweepQueue.shift();
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
    this.touched = Date.now();
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

'use strict';

var cache  = require('../');

describe('leroux-cache', function () {
    var c;

    function keyCounter () {
        var sum = 0;
        c.forEach(function () { sum++; });
        return sum;
    }

    describe('Initialization, Setters and Defaults', function () {
        it('should return an instance even if not invoked with new', function () {
            cache().should.be.instanceof(cache);
        });

        it('should interpret a numeric option as maxSize', function () {
            c = cache(111);
            c.maxSize.should.equal(111);
        });

        it('should have a default sizeFn', function () {
            c = cache();
            c.sizeFn.should.be.a.Function;
        });

        it('should have a default maxSize', function () {
            c = cache();
            (c.maxSize === null).should.be.true;
        });

        it('should have a default maxAge', function () {
            c = cache();
            (c.maxAge === null).should.be.true;
        });

        it('should have a default sweepDelay', function () {
            c = cache();
            c.sweepDelay.should.equal(2500);
        });

        it('should only allow sizeFn to be a function', function () {
            var fn = function () {};

            c = cache({ sizeFn : fn });
            c.sizeFn.should.equal(fn);

            c.sizeFn = 'function';
            c.sizeFn.should.equal(fn);
        });

        it('should only allow maxSize to be positive or null', function () {
            c = cache({ maxSize : 222 });
            c.maxSize.should.equal(222);

            c.maxSize = 0;
            c.maxSize.should.equal(222);

            c.maxSize = -2;
            c.maxSize.should.equal(222);

            c.maxSize = 'two';
            c.maxSize.should.equal(222);

            c.maxSize = null;
            (c.maxSize === null).should.be.true;
        });

        it('should only allow maxAge to be positive or null', function () {
            c = cache({ maxAge : 333 });
            c.maxAge.should.equal(333);

            c.maxAge = 0;
            c.maxAge.should.equal(333);

            c.maxAge = -3;
            c.maxAge.should.equal(333);

            c.maxAge = 'three';
            c.maxAge.should.equal(333);

            c.maxAge = null;
            (c.maxAge === null).should.be.true;
        });

        it('should only allow sweepDelay to be positive', function () {
            c = cache({ sweepDelay : 444 });
            c.sweepDelay.should.equal(444);

            c.sweepDelay = 0;
            c.sweepDelay.should.equal(444);

            c.sweepDelay = -4;
            c.sweepDelay.should.equal(444);

            c.sweepDelay = 'four';
            c.sweepDelay.should.equal(444);
        });
    });

    describe('Base Cache Functionality', function () {
        beforeEach(function () {
            c = cache();
            c.set('a', 'AAA');
            c.set('b', 'BBB');
        });

        it('can set() an existing key', function () {
            c.get('a').should.equal('AAA');
            c.set('a', 'new AAA');
            c.get('a').should.equal('new AAA');
        });

        it('should has() an existing key', function () {
            c.has('a').should.be.true;
            c.has('b').should.be.true;
        });

        it('should not has() for missing keys', function () {
            c.has('fake').should.be.false;
            c.has(null).should.be.false;
        });

        it('can get() an existing key', function () {
            c.get('a').should.equal('AAA');
            c.get('b').should.equal('BBB');
        });

        it('should get() undefined for missing keys', function () {
            (typeof c.get('nope')).should.equal('undefined');
            (typeof c.get(null)  ).should.equal('undefined');
        });

        it('can call a function forEach() key', function () {
            var results = [];

            c.forEach(function (value, key, inst) {
                inst.should.equal(c);
                this.push({ k : key, v : value });
            }, results);

            results.should.containDeep([
                { k : 'a', v: 'AAA' },
                { k : 'b', v: 'BBB' }
            ]);
        });

        it('can del() an exsting key', function () {
            c.get('a').should.equal('AAA');
            c.del('a');
            c.has('a').should.be.false;
            (typeof c.get('a')).should.equal('undefined');
        });

        it('should not break on del() for missing keys', function () {
            (function () {
                c.del('errant');
                c.del(null);
            }).should.not.throw();
        });

        it('can reset()', function () {
            c.size.should.equal(2);
            c.reset();
            c.size.should.equal(0);
        });
    });

    describe('Cache Age Control', function () {
        var delay = 5;  //ms

        beforeEach(function () {
            c = cache({
                maxAge     : 60 * 1000,  //avoid expiring/sweeping mid-test
                sweepDelay : 60 * 1000
            });
        });

        it('should not return a stale key, even if sweep has not happened', function (done) {
            var i;

            c.maxAge = delay * 2;

            for (i = 0; i <=3; i++) {
                // Tick 0: Set a.
                // Tick 1: Idle.
                // Tick 2: Set b.
                // Tick 3: Verify a has expired, and b still exists.
                (function (ii) {
                    setTimeout(function () {
                        if (ii === 0) {
                            c.set('a', 'AAA');
                        } else if (ii === 2) {
                            c.set('b', 'BBB');
                        } else if (ii === 3) {
                            (c.get('a') === undefined).should.be.true;
                            keyCounter().should.equal(1);
                            c.get('b').should.equal('BBB');

                            done();
                        }
                    }, ii * delay);
                })(i);
            }
        });

        it('should sweep stale keys automatically', function (done) {
            var i;

            c.sweepDelay = delay / 2;

            for (i = 0; i <=3; i++) {
                // Tick 0: Set a, b, and c.
                // Tick 1: Idle.
                // Tick 2: Touch b, read c, and set d.
                // Tick 3: Verify a has expired, and b/c/d still exist.
                (function (ii) {
                    setTimeout(function () {
                        if (ii === 0) {
                            c.set('a', 'AAA');
                            c.set('b', 'BBB');
                            c.set('c', 'CCC');
                        } else if (ii === 2) {
                            c.set('b', 'BBB updated');
                            c.get('c');
                            c.set('d', 'DDD');
                            c.size.should.equal(4);

                            c.maxAge = delay * 2;
                        } else if (ii === 3) {
                            c.size.should.equal(3);

                            done();
                        }
                    }, ii * delay);
                })(i);
            }
        });
    });

    describe('Cache Size Control', function () {
        var delay = 5,  //ms
            sa, sb, sc;

        beforeEach(function () {
            c = cache({ sweepDelay : 60 * 1000 });  //avoid sweeping mid-test
        });

        function fillCache () {
            c.set('a', 'This is entry A. It is 37 bytes long.');
            c.set('b', 'temporary');
            c.set('b', 'Entry B was once 9 bytes. Now it is 45 bytes.');
            c.set('c', 'This is entry C. It clocks in at a nice round 55 bytes.');
            sa = 37; sb = 45; sc = 55;
        }

        function byteCounter (value) {
            return value.length;
        }

        it('should not allow size to be written', function () {
            (function () {
                c.size = 1;
            }).should.throw(TypeError);
        });

        it('should count each key as size 1 by default', function () {
            fillCache();
            c.size.should.equal(3);
        });

        it('should accept and use a custom sizeFn', function () {
            c.sizeFn = byteCounter;
            fillCache();
            c.size.should.equal(sa + sb + sc);
        });

        it('should recalculate the cache size when sizeFn changes', function () {
            fillCache();
            c.size.should.equal(3);
            c.sizeFn = byteCounter;
            c.size.should.equal(sa + sb + sc);
        });

        it('should increase the cache size when keys are added', function () {
            c.sizeFn = byteCounter;
            fillCache();
            c.size.should.equal(sa + sb + sc);
            c.set('d', '8 bytes.');
            c.size.should.equal(sa + sb + sc + 8);
            c.set('e', 'And 18 more bytes.');
            c.size.should.equal(sa + sb + sc + 8 + 18);
        });

        it('should increase the cache size when keys are updated', function () {
            c.sizeFn = byteCounter;
            fillCache();
            c.size.should.equal(sa + sb + sc);
            c.set('a', '4 b.');
            c.size.should.equal(4 + sb + sc);
            c.set('b', '4 b.');
            c.size.should.equal(4 + 4 + sc);
            c.set('c', '4 b.');
            c.size.should.equal(4 + 4 + 4);
        });

        it('should decrease the cache size when keys are removed', function () {
            c.sizeFn = byteCounter;
            fillCache();
            c.size.should.equal(sa + sb + sc);
            c.del('a');
            c.size.should.equal(sb + sc);
            c.del('b');
            c.size.should.equal(sc);
            c.del('c');
            c.size.should.equal(0);
        });

        it('should not drop items until the cache is over size', function (done) {
            var limit = Math.max(sa, sb, sc),
                i;

            c.sizeFn = byteCounter;
            c.sweepDelay = delay * 1.5;
            c.maxSize = sa + sb + sc;
            fillCache();

            keyCounter().should.equal(3);
            c.size.should.equal(sa + sb + sc);

            for (i = 0; i <= 2; i++){
                // Tick 0: Verify cache size, filled with all items. Decrease
                //         maxSize so we're now violating it.
                // Tick 1: Idle.
                // Tick 2: Verify that the cache reduced size on its own.
                (function (ii) {
                    setTimeout(function () {
                        if (ii === 0) {
                            keyCounter().should.equal(3);
                            c.size.should.equal(sa + sb + sc);

                            c.maxSize = limit;
                        } else if (ii === 2) {
                            keyCounter().should.equal(1);
                            c.size.should.be.lessThan(limit + 1);  //HACK: We mean `<=`

                            done();
                        }
                    }, ii * delay);
                })(i);
            }
        });

        it('can drop the whole cache if critically over size', function (done) {
            var i;

            c.sizeFn = byteCounter;
            c.sweepDelay = delay * 1.5;
            c.maxSize = null;

            for (i = 0; i <= 7; i++) {
                // Tick 0: Add key0.
                // Tick 1: Add key1.
                // Tick 2: Add key2.
                // Tick 3: Add key3.
                // Tick 4: Add key4.
                // Tick 5: Verify cache size, filled with all items. Decrease
                //         maxSize so we're now violating it.
                // Tick 6: Idle.
                // Tick 7: Verify that the cache reduced size on its own.
                (function (ii) {
                    setTimeout(function () {
                        if (ii < 5) {
                            c.set('key' + ii, 'This value is 28 bytes long.');
                        } else if (ii === 5) {
                            keyCounter().should.equal(5);
                            c.size.should.equal(28 * 5);

                            c.maxSize = 20;
                        } else if (ii === 7) {
                            keyCounter().should.equal(0);
                            c.size.should.equal(0);

                            done();
                        }
                    }, ii * delay);
                })(i);
            }
        });
    });
});

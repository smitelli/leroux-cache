'use strict';

var cache = require('../');

describe('leroux-cache', function () {
    describe('Initialization, Setters and Defaults', function () {
        var c;

        it('should return an instance even if not invoked with `new`', function () {
            cache().should.be.instanceof(cache);
        });

        it('should interpret a numeric `options` as `maxSize`', function () {
            c = cache(111);
            c.maxSize.should.equal(111);
        });

        it('should have a default `sizeFn` which sizes objects as `1`', function () {
            c = cache();
            c.sizeFn({a : 'A', b : 'B', c : 'C'}).should.equal(1);
        });

        it('should have a default `maxSize`', function () {
            c = cache();
            (c.maxSize === null).should.be.true;
        });

        it('should have a default `maxAge`', function () {
            c = cache();
            (c.maxAge === null).should.be.true;
        });

        it('should have a default `sweepDelay`', function () {
            c = cache();
            c.sweepDelay.should.equal(2500);
        });

        it('should only allow `sizeFn` to be a function', function () {
            var fn = function () {};

            c = cache({ sizeFn : fn });
            c.sizeFn.should.equal(fn);

            c.sizeFn = 'function';
            c.sizeFn.should.equal(fn);
        });

        it('should only allow `maxSize` to be positive or null', function () {
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

        it('should only allow `maxAge` to be positive or null', function () {
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

        it('should only allow `sweepDelay` to be positive', function () {
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
});

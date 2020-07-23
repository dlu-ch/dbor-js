// SPDX-License-Identifier: LGPL-3.0-or-later
// dbor-js - ECMAScript 2020 implementation of DBOR encoder
// Copyright (C) 2020 Daniel Lutz <dlu-ch@users.noreply.github.com>

// https://tc39.es/ecma262/2020//

// https://mochajs.org/
// https://www.chaijs.com/api/assert/

var assert = chai.assert;


describe('bit manipulation', function () {

  describe('trailingZeroBitCount()', function () {
    it('typical', function () {
      assert.isTrue(trailingZeroBitCount(1) == 0n);
      assert.isTrue(trailingZeroBitCount(14) == 1n);
      assert.isTrue(trailingZeroBitCount(1024) == 10n);
    });

    it('v = 0', function () {
      assert.isTrue(trailingZeroBitCount(0) == -1n);
    });
  });

  describe('boundedFloorLog2()', function () {
    it('typical', function () {
      assert.isTrue(boundedFloorLog2(1024, 10) == 10n);
      assert.isTrue(boundedFloorLog2(1023, 10) == 10n);

      assert.isTrue(boundedFloorLog2(512, 10) == 9n);
      assert.isTrue(boundedFloorLog2(511, 10) == 9n);
    });

    it('v = 0', function () {
      assert.isTrue(boundedFloorLog2(0, 10) == -1n);
      assert.isTrue(boundedFloorLog2(0, 0) == -1n);
    });

    it('n = 0 and v != 0', function () {
      assert.isTrue(boundedFloorLog2(42, 0) == 0n);
      assert.isTrue(boundedFloorLog2(-1, 0) == 0n);
    });
  });

});

describe('encoding helpers', function () {

  describe('binaryRationalPForMinPAndR()', function () {
    it('r = 0', function () {
      assert.equal(binaryRationalPForMinPAndR(0, 0), 4);
      assert.equal(binaryRationalPForMinPAndR(4, 0), 4);
      assert.equal(binaryRationalPForMinPAndR(5, 0), 10);
      assert.equal(binaryRationalPForMinPAndR(10, 0), 10);
      assert.equal(binaryRationalPForMinPAndR(11, 0), 16);
      assert.equal(binaryRationalPForMinPAndR(16, 0), 16);
      assert.equal(binaryRationalPForMinPAndR(17, 0), 23);
      assert.equal(binaryRationalPForMinPAndR(23, 0), 23);
      assert.equal(binaryRationalPForMinPAndR(24, 0), 30);
      assert.equal(binaryRationalPForMinPAndR(30, 0), 30);
      assert.equal(binaryRationalPForMinPAndR(31, 0), 37);
      assert.equal(binaryRationalPForMinPAndR(37, 0), 37);
      assert.equal(binaryRationalPForMinPAndR(38, 0), 44);
      assert.equal(binaryRationalPForMinPAndR(44, 0), 44);
      assert.equal(binaryRationalPForMinPAndR(45, 0), 52);
      assert.equal(binaryRationalPForMinPAndR(52, 0), 52);
      assert.equal(binaryRationalPForMinPAndR(1000, 0), 52);
    });

    it('p = 0', function () {
      assert.equal(binaryRationalPForMinPAndR(0, 0), 4);
      assert.equal(binaryRationalPForMinPAndR(0, 3), 4);
      assert.equal(binaryRationalPForMinPAndR(0, 4), 10);
      assert.equal(binaryRationalPForMinPAndR(0, 5), 10);
      assert.equal(binaryRationalPForMinPAndR(0, 6), 16);
      assert.equal(binaryRationalPForMinPAndR(0, 7), 16);
      assert.equal(binaryRationalPForMinPAndR(0, 8), 23);
      assert.equal(binaryRationalPForMinPAndR(0, 9), 30);
      assert.equal(binaryRationalPForMinPAndR(0, 10), 37);
      assert.equal(binaryRationalPForMinPAndR(0, 11), 44);
      assert.equal(binaryRationalPForMinPAndR(0, 12), 52);
      assert.equal(binaryRationalPForMinPAndR(0, 1000), 52);
    });

    it('p, r != 0', function () {
      assert.equal(binaryRationalPForMinPAndR(17, 4), 23);
      assert.equal(binaryRationalPForMinPAndR(17, 9), 30);
    });

  });

  describe('encodeCodePointAsUtf8()', function () {
    it('p = 0', function () {
      assert.deepEqual(encodeCodePointAsUtf8(-1), []);
      assert.deepEqual(encodeCodePointAsUtf8(0x00), [0x00]);
      assert.deepEqual(encodeCodePointAsUtf8(0x7F), [0x7F]);
      assert.deepEqual(encodeCodePointAsUtf8(0x80), [0xC2, 0x80]);
      assert.deepEqual(encodeCodePointAsUtf8(0x7FF), [0xDF, 0xBF]);
      assert.deepEqual(encodeCodePointAsUtf8(0x800), [0xE0, 0xA0, 0x80]);
      assert.deepEqual(encodeCodePointAsUtf8(0xFFFF), [0xEF, 0xBF, 0xBF]);
      assert.deepEqual(encodeCodePointAsUtf8(0xD800), []);
      assert.deepEqual(encodeCodePointAsUtf8(0x10000), [0xF0, 0x90, 0x80, 0x80]);
      assert.deepEqual(encodeCodePointAsUtf8(0x10FFFF), [0xF4, 0x8F, 0xBF, 0xBF]);
      assert.deepEqual(encodeCodePointAsUtf8(0x110000), []);
    });
  });

  describe('encodeNaturalTokenData()', function () {
    it('typical', function () {
      assert.deepEqual(encodeNaturalTokenData(0x42), [0x41]);
      assert.deepEqual(encodeNaturalTokenData(0x100), [0xFF]);
      assert.deepEqual(encodeNaturalTokenData(0x1234), [0x33, 0x11]);
    });

    it('minimum', function () {
      assert.deepEqual(encodeNaturalTokenData(1), [0x00]);
      assert.throws(function () { encodeNaturalTokenData(0n); }, RangeError);
      assert.throws(function () { encodeNaturalTokenData(-1n); }, RangeError);
    });

    it('maximum', function () {
      const nmax = 18519084246547628288n;
      assert.deepEqual(encodeNaturalTokenData(nmax), [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      assert.throws(function () { encodeNaturalTokenData(nmax + 1n); }, RangeError);
    });
  });

  describe('encodeIntegerToken()', function () {
    it('typical', function () {
      assert.deepEqual(encodeIntegerToken(0, 0x17), [0x17]);
      assert.deepEqual(encodeIntegerToken(0, 0x18), [0x18, 0x00]);
      assert.deepEqual(encodeIntegerToken(0, 0x19), [0x18, 0x01]);

      assert.deepEqual(encodeIntegerToken(7, 0x19), [0xF8, 0x01]);
    });

    it('minimum', function () {
      assert.deepEqual(encodeIntegerToken(0, 0), [0x00]);
      assert.deepEqual(encodeIntegerToken(0xFF, 0), [0xE0]);

      assert.throws(function () { encodeIntegerToken(0, -1); }, RangeError);
    });

    it('maximum', function () {
      const nmax = 18519084246547628311n; // ~= 1.004 * 2^64
      assert.deepEqual(encodeIntegerToken(0, nmax), [0x1F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      assert.throws(function () { encodeIntegerToken(0, nmax + 1n); }, RangeError);
    });
  });

  describe('encodePowerOfTenToken()', function () {
    it('typical', function () {
      assert.deepEqual(encodePowerOfTenToken(5), [0xE4]);
      assert.deepEqual(encodePowerOfTenToken(8), [0xE7]);
      assert.deepEqual(encodePowerOfTenToken(-7), [0xEE]);

      assert.deepEqual(encodePowerOfTenToken(9), [0xD0, 0x00]);
      assert.deepEqual(encodePowerOfTenToken(-0x6789), [0xD9, 0x80, 0x66]);
    });

    it('minimum magnitude', function () {
      assert.deepEqual(encodePowerOfTenToken(1), [0xE0]);
      assert.deepEqual(encodePowerOfTenToken(-1), [0xE8]);
      assert.throws(function () { encodePowerOfTenToken(0); }, RangeError);
    });

    it('maximum magnitude', function () {
      const nmax = 18519084246547628296n; // ~= 1.004 * 2^64

      assert.deepEqual(encodePowerOfTenToken(nmax), [0xD7, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      assert.throws(function () { encodePowerOfTenToken(nmax + 1n); }, RangeError);

      assert.deepEqual(encodePowerOfTenToken(-nmax), [0xDF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      assert.throws(function () { encodePowerOfTenToken(-(nmax + 1n)); }, RangeError);
    });
  });

});

describe('DborEncoder', function () {
  describe('construction', function () {
    it('empty', function () {
      let e = new DborEncoder();
      assert.deepEqual(e.bytes, []);
    });
  });

  describe('None', function () {
    it('typical', function () {
      let e = new DborEncoder();
      e.appendNone().appendNone();
      assert.deepEqual(e.bytes, [0xFF, 0xFF]);
    });
  });

  describe('Numberlike', function () {
    it('typical', function () {
      let e = new DborEncoder();
      e.appendMinusZero().appendMinusInfinity().appendInfinity();
      assert.deepEqual(e.bytes, [0xFC, 0xFD, 0xFE]);
    })
  });

  describe('Integer', function () {
    it('small non-negative', function () {
      let e = new DborEncoder();
      e.appendInteger(0).appendInteger(23).appendInteger(23n).appendInteger(24).appendInteger(24n);
      assert.deepEqual(e.bytes, [
        0x00,
        0x17,
        0x17,
        0x18, 0x00,
        0x18, 0x00,
      ]);
    });

    it('small negative', function () {
      let e = new DborEncoder();
      e.appendInteger(-1).appendInteger(-24).appendInteger(-24n).appendInteger(-25).appendInteger(-25n);
      assert.deepEqual(e.bytes, [
        0x20,
        0x37,
        0x37,
        0x38, 0x00,
        0x38, 0x00,
      ]);
    });

    it('minimum', function () {
      let e = new DborEncoder();
      const nmin = -18519084246547628312n; // ~= -1.004 * 2^64
      e.appendInteger(nmin);
      assert.deepEqual(e.bytes, [0x3F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

      assert.throws(function () { e.appendInteger(nmin - 1n); }, RangeError);
      assert.deepEqual(e.bytes, [0x3F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    });

    it('maximum', function () {
      let e = new DborEncoder();
      const nmax = 18519084246547628311n; // ~= 1.004 * 2^64
      e.appendInteger(nmax);
      assert.deepEqual(e.bytes, [0x1F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

      assert.throws(function () { e.appendInteger(nmax + 1n); }, RangeError);
      assert.deepEqual(e.bytes, [0x1F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    });

  });

  describe('DecimalRational', function () {
    it('typical', function () {
      let e = new DborEncoder();

      e.appendDecimalRational(1, -2).appendDecimalRational(-3, 4);
      assert.deepEqual(e.bytes, [
        0xE9, 0x01,
        0xE3, 0x22
      ]);

      e = new DborEncoder();
      e.appendDecimalRational(1234, -56)
      assert.deepEqual(e.bytes, [
        0xD8, 0x2F,
        0x19, 0xBA, 0x03
      ]);
    });

    it('zero', function () {
      let e = new DborEncoder();
      e.appendDecimalRational(0, 123456781234567812345678n);
      assert.deepEqual(e.bytes, [0x00]);
    });

    it('boundaries', function () {
      let e = new DborEncoder();

      e.appendDecimalRational(-18519084246547628312n, 18519084246547628296n);
      assert.deepEqual(e.bytes, [
        0xD7, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0x3F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF
      ]);

      assert.throws(function () { e.appendDecimalRational(-18519084246547628312n, 18519084246547628297n); }, RangeError);
      assert.throws(function () { e.appendDecimalRational(-18519084246547628313n, 18519084246547628296n); }, RangeError);
      assert.deepEqual(e.bytes, [
        0xD7, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0x3F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF
      ]);

      e = new DborEncoder();

      e.appendDecimalRational(18519084246547628311n, -18519084246547628296n);
      assert.deepEqual(e.bytes, [
        0xDF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0x1F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF
      ]);

      assert.throws(function () { e.appendDecimalRational(18519084246547628311n, -18519084246547628297n); }, RangeError);
      assert.throws(function () { e.appendDecimalRational(18519084246547628312n, -18519084246547628296n); }, RangeError);
      assert.deepEqual(e.bytes, [
        0xDF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0x1F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF
      ]);
    });

  });

  describe('ByteString', function () {
    it('typical', function () {
      let e = new DborEncoder();
      e.appendByteString([]).appendByteString([0xFF, 0x00, 0x03]);
      assert.deepEqual(e.bytes, [
        0x40,
        0x43, 0xFF, 0x00, 0x03
      ]);
    });
  });

  describe('Utf8String', function () {
    it('typical', function () {
      let e = new DborEncoder();
      e.appendUtf8String('').appendUtf8String(42);
      assert.deepEqual(e.bytes, [
        0x60,
        0x62, 0x34, 0x32
      ]);

      e = new DborEncoder();
      e.appendUtf8String('aö𝛼𝕄');
      assert.deepEqual(e.bytes, [
        0x6B,
        0x61,
        0xC3, 0xB6,
        0xF0, 0x9D, 0x9B, 0xBC,
        0xF0, 0x9D, 0x95, 0x84
      ]);
    });

    it('invalid code point', function () {
      let e = new DborEncoder();
      e.appendUtf8String('');
      assert.throws(function () { e.appendUtf8String('\uD800'); }, RangeError);
      assert.deepEqual(e.bytes, [0x60]);
    });
  });

});

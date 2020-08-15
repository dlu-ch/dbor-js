// SPDX-License-Identifier: LGPL-3.0-or-later
// dbor-js - ECMAScript 2020 implementation of DBOR encoder
// Copyright (C) 2020 Daniel Lutz <dlu-ch@users.noreply.github.com>

// https://www.ecma-international.org/ecma-262/11.0/

// https://mochajs.org/
// https://www.chaijs.com/api/assert/

var assert = chai.assert;


describe('bit manipulation', function () {

  describe('trailingZeroBitCount()', function () {
    it('typical', function () {
      assert.isTrue(dbor.trailingZeroBitCount(1) == 0n);
      assert.isTrue(dbor.trailingZeroBitCount(14) == 1n);
      assert.isTrue(dbor.trailingZeroBitCount(1024) == 10n);
    });

    it('v = 0', function () {
      assert.isTrue(dbor.trailingZeroBitCount(0) == -1n);
    });
  });

  describe('boundedFloorLog2()', function () {
    it('typical', function () {
      assert.isTrue(dbor.boundedFloorLog2(1024, 10) == 10n);
      assert.isTrue(dbor.boundedFloorLog2(1023, 10) == 10n);

      assert.isTrue(dbor.boundedFloorLog2(512, 10) == 9n);
      assert.isTrue(dbor.boundedFloorLog2(511, 10) == 9n);
    });

    it('v = 0', function () {
      assert.isTrue(dbor.boundedFloorLog2(0, 10) == -1n);
      assert.isTrue(dbor.boundedFloorLog2(0, 0) == -1n);
    });

    it('n = 0 and v != 0', function () {
      assert.isTrue(dbor.boundedFloorLog2(42, 0) == 0n);
      assert.isTrue(dbor.boundedFloorLog2(-1, 0) == 0n);
    });
  });

});

describe('encoding helpers', function () {

  describe('binaryRationalPForMinPAndR()', function () {
    it('r = 0', function () {
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 0), 4);
      assert.equal(dbor.binaryRationalPForMinPAndR(4, 0), 4);
      assert.equal(dbor.binaryRationalPForMinPAndR(5, 0), 10);
      assert.equal(dbor.binaryRationalPForMinPAndR(10, 0), 10);
      assert.equal(dbor.binaryRationalPForMinPAndR(11, 0), 16);
      assert.equal(dbor.binaryRationalPForMinPAndR(16, 0), 16);
      assert.equal(dbor.binaryRationalPForMinPAndR(17, 0), 23);
      assert.equal(dbor.binaryRationalPForMinPAndR(23, 0), 23);
      assert.equal(dbor.binaryRationalPForMinPAndR(24, 0), 30);
      assert.equal(dbor.binaryRationalPForMinPAndR(30, 0), 30);
      assert.equal(dbor.binaryRationalPForMinPAndR(31, 0), 37);
      assert.equal(dbor.binaryRationalPForMinPAndR(37, 0), 37);
      assert.equal(dbor.binaryRationalPForMinPAndR(38, 0), 44);
      assert.equal(dbor.binaryRationalPForMinPAndR(44, 0), 44);
      assert.equal(dbor.binaryRationalPForMinPAndR(45, 0), 52);
      assert.equal(dbor.binaryRationalPForMinPAndR(52, 0), 52);
      assert.equal(dbor.binaryRationalPForMinPAndR(1000, 0), 52);
    });

    it('p = 0', function () {
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 0), 4);
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 3), 4);
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 4), 10);
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 5), 10);
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 6), 16);
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 7), 16);
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 8), 23);
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 9), 30);
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 10), 37);
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 11), 44);
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 12), 52);
      assert.equal(dbor.binaryRationalPForMinPAndR(0, 1000), 52);
    });

    it('p, r != 0', function () {
      assert.equal(dbor.binaryRationalPForMinPAndR(17, 4), 23);
      assert.equal(dbor.binaryRationalPForMinPAndR(17, 9), 30);
    });

  });

  describe('encodeCodePointAsUtf8()', function () {
    it('p = 0', function () {
      assert.deepEqual(dbor.encodeCodePointAsUtf8(-1), []);
      assert.deepEqual(dbor.encodeCodePointAsUtf8(0x00), [0x00]);
      assert.deepEqual(dbor.encodeCodePointAsUtf8(0x7F), [0x7F]);
      assert.deepEqual(dbor.encodeCodePointAsUtf8(0x80), [0xC2, 0x80]);
      assert.deepEqual(dbor.encodeCodePointAsUtf8(0x7FF), [0xDF, 0xBF]);
      assert.deepEqual(dbor.encodeCodePointAsUtf8(0x800), [0xE0, 0xA0, 0x80]);
      assert.deepEqual(dbor.encodeCodePointAsUtf8(0xFFFF), [0xEF, 0xBF, 0xBF]);
      assert.deepEqual(dbor.encodeCodePointAsUtf8(0xD800), []);
      assert.deepEqual(dbor.encodeCodePointAsUtf8(0x10000), [0xF0, 0x90, 0x80, 0x80]);
      assert.deepEqual(dbor.encodeCodePointAsUtf8(0x10FFFF), [0xF4, 0x8F, 0xBF, 0xBF]);
      assert.deepEqual(dbor.encodeCodePointAsUtf8(0x110000), []);
    });
  });

  describe('encodeNaturalTokenData()', function () {
    it('typical', function () {
      assert.deepEqual(dbor.encodeNaturalTokenData(0x42), [0x41]);
      assert.deepEqual(dbor.encodeNaturalTokenData(0x100), [0xFF]);
      assert.deepEqual(dbor.encodeNaturalTokenData(0x1234), [0x33, 0x11]);
    });

    it('minimum', function () {
      assert.deepEqual(dbor.encodeNaturalTokenData(1), [0x00]);
      assert.throws(function () { dbor.encodeNaturalTokenData(0n); }, RangeError);
      assert.throws(function () { dbor.encodeNaturalTokenData(-1n); }, RangeError);
    });

    it('maximum', function () {
      const nmax = 18519084246547628288n;
      assert.deepEqual(dbor.encodeNaturalTokenData(nmax), [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      assert.throws(function () { dbor.encodeNaturalTokenData(nmax + 1n); }, RangeError);
    });
  });

  describe('encodeIntegerToken()', function () {
    it('typical', function () {
      assert.deepEqual(dbor.encodeIntegerToken(0, 0x17), [0x17]);
      assert.deepEqual(dbor.encodeIntegerToken(0, 0x18), [0x18, 0x00]);
      assert.deepEqual(dbor.encodeIntegerToken(0, 0x19), [0x18, 0x01]);

      assert.deepEqual(dbor.encodeIntegerToken(7, 0x19), [0xF8, 0x01]);
    });

    it('minimum', function () {
      assert.deepEqual(dbor.encodeIntegerToken(0, 0), [0x00]);
      assert.deepEqual(dbor.encodeIntegerToken(0xFF, 0), [0xE0]);

      assert.throws(function () { dbor.encodeIntegerToken(0, -1); }, RangeError);
    });

    it('maximum', function () {
      const nmax = 18519084246547628311n; // ~= 1.004 * 2^64
      assert.deepEqual(dbor.encodeIntegerToken(0, nmax), [0x1F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      assert.throws(function () { dbor.encodeIntegerToken(0, nmax + 1n); }, RangeError);
    });
  });

  describe('encodePowerOfTenToken()', function () {
    it('typical', function () {
      assert.deepEqual(dbor.encodePowerOfTenToken(5), [0xE4]);
      assert.deepEqual(dbor.encodePowerOfTenToken(8), [0xE7]);
      assert.deepEqual(dbor.encodePowerOfTenToken(-7), [0xEE]);

      assert.deepEqual(dbor.encodePowerOfTenToken(9), [0xD0, 0x00]);
      assert.deepEqual(dbor.encodePowerOfTenToken(-0x6789), [0xD9, 0x80, 0x66]);
    });

    it('minimum magnitude', function () {
      assert.deepEqual(dbor.encodePowerOfTenToken(1), [0xE0]);
      assert.deepEqual(dbor.encodePowerOfTenToken(-1), [0xE8]);
      assert.throws(function () { dbor.encodePowerOfTenToken(0); }, RangeError);
    });

    it('maximum magnitude', function () {
      const nmax = 18519084246547628296n; // ~= 1.004 * 2^64

      assert.deepEqual(dbor.encodePowerOfTenToken(nmax), [0xD7, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      assert.throws(function () { dbor.encodePowerOfTenToken(nmax + 1n); }, RangeError);

      assert.deepEqual(dbor.encodePowerOfTenToken(-nmax), [0xDF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      assert.throws(function () { dbor.encodePowerOfTenToken(-(nmax + 1n)); }, RangeError);
    });
  });

  describe('normalizeBinaryRationalComponents()', function () {
    it('power of 2', function () {
      let [isNeg, mantNorm, exp2Norm] = dbor.normalizeBinaryRationalComponents(-1n, 0);
      assert.isTrue(mantNorm == 1n << 52n);
      assert.deepEqual([isNeg, exp2Norm], [true, -52]);

      [isNeg, mantNorm, exp2Norm] = dbor.normalizeBinaryRationalComponents(1n, 100);
      assert.isTrue(mantNorm == 1n << 52n);
      assert.deepEqual([isNeg, exp2Norm], [false, 100 - 52]);

      [isNeg, mantNorm, exp2Norm] = dbor.normalizeBinaryRationalComponents(-1n, -100);
      assert.isTrue(mantNorm == 1n << 52n);
      assert.deepEqual([isNeg, exp2Norm], [true, -100 - 52]);
    });

    it('zero', function () {
      let [isNeg, mantNorm, exp2Norm] = dbor.normalizeBinaryRationalComponents(0, 1234);
      assert.isTrue(mantNorm == 0n);
      assert.deepEqual([isNeg, exp2Norm], [false, -1022 - 52]);
    });

    it('maximum mantissa width for normalized', function () {
      let [isNeg, mantNorm, exp2Norm] = dbor.normalizeBinaryRationalComponents((1n << 53n) - 1n, 0);
      assert.isTrue(mantNorm == (1n << 53n) - 1n);
      assert.deepEqual([isNeg, exp2Norm], [false, 0]);

      assert.throws(function () { dbor.normalizeBinaryRationalComponents((1n << 54n) - 1n, 0n); }, RangeError);
    });

    it('maximum exponent', function () {
      let [isNeg, mantNorm, exp2Norm] = dbor.normalizeBinaryRationalComponents(1n, 1024);
      assert.isTrue(mantNorm == 1n << 52n);
      assert.deepEqual([isNeg, exp2Norm], [false, 1024 - 52]);

      assert.throws(function () { dbor.normalizeBinaryRationalComponents(1n, 1025); }, RangeError);
    });

    it('minimum exponent', function () {
      let [isNeg, mantNorm, exp2Norm] = dbor.normalizeBinaryRationalComponents(1n, -1022);
      // 1.0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000_0000 * 2^-1022
      assert.isTrue(mantNorm == 1n << 52n);
      assert.deepEqual([isNeg, exp2Norm], [false, -1022 - 52]);

      [isNeg, mantNorm, exp2Norm] = dbor.normalizeBinaryRationalComponents(1n, -1022 - 52);
      assert.isTrue(mantNorm == 1n);
      assert.deepEqual([isNeg, exp2Norm], [false, -1022 - 52]);

      assert.throws(function () { dbor.normalizeBinaryRationalComponents(1n, -1022 - 53); }, RangeError);

      [isNeg, mantNorm, exp2Norm] = dbor.normalizeBinaryRationalComponents(-((1n << 53n) - 1n), -1022 - 52);
      assert.isTrue(mantNorm == (1n << 53n) - 1n);
      assert.deepEqual([isNeg, exp2Norm], [true, -1022 - 52]);

      assert.throws(function () { dbor.normalizeBinaryRationalComponents(-((1n << 53n) - 1n), -1022 - 53); }, RangeError);
    });
  });

  describe('encodeCanonicalBinaryRationalToken()', function () {
    it('zero', function () {
      assert.throws(function () { dbor.encodeCanonicalBinaryRationalToken(0n, 1n); }, RangeError);
    });

    it('p = 4', function () {
      assert.deepEqual(dbor.encodeCanonicalBinaryRationalToken(1n, -3n), [0xC8, 0x00]);
      assert.deepEqual(dbor.encodeCanonicalBinaryRationalToken(-1n, -3n), [0xC8, 0x80]);
      assert.deepEqual(dbor.encodeCanonicalBinaryRationalToken(27n, 0n), [0xC8, 0x7B]);
    });

    it('p = 10', function () {
      assert.deepEqual(
        dbor.encodeCanonicalBinaryRationalToken(-(1n << 17n) + (1n << 6n), 0),
        [0xC9, 0xFF, 0xFF]);
    });

    it('p = 44', function () {
      assert.deepEqual(
        dbor.encodeCanonicalBinaryRationalToken(1n, -1023),
        [0xCE, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

      assert.deepEqual(
        dbor.encodeCanonicalBinaryRationalToken((1n << 45n) - 1n, -1023 - 44),
        [0xCE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x0F, 0x00]);

      assert.deepEqual(
        dbor.encodeCanonicalBinaryRationalToken(-1n, 1024),
        [0xCE, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0xFF]);

      assert.deepEqual(
        dbor.encodeCanonicalBinaryRationalToken((1n << 45n) - 1n, 1024 - 44),
        [0xCE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
    });

    it('p = 52', function () {
      assert.deepEqual(
        dbor.encodeCanonicalBinaryRationalToken((1n << 46n) - 1n, 1024 - 45),
        [0xCF, 0x80, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);

      assert.deepEqual(
        dbor.encodeCanonicalBinaryRationalToken(1n, -1074),
        [0xCF, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

      assert.deepEqual(
        dbor.encodeCanonicalBinaryRationalToken((1n << 46n) - 1n, -1023 - 45),
        [0xCF, 0xC0, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x0F, 0x00]);

      assert.throws(function () { dbor.encodeCanonicalBinaryRationalToken(1n, -1075); }, RangeError);

      assert.deepEqual(
        dbor.encodeCanonicalBinaryRationalToken((1n << 52n) - 1n, -1074),
        [0xCF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x0F, 0x00]);
      assert.throws(function () { dbor.encodeCanonicalBinaryRationalToken((1n << 53n) - 1n, -1075); }, RangeError);
    });

  });

  describe('splitFiniteNumberIntoBinaryRationalComponents()', function () {
    it('typical', function () {
      let [mant, exp2] = dbor.splitFiniteNumberIntoBinaryRationalComponents(0.125);  // 2^-3
      assert.isTrue(mant == 1n << 52n);
      assert.equal(exp2, -3 - 52);

      [mant, exp2] = dbor.splitFiniteNumberIntoBinaryRationalComponents(-0.125);  // 2^-3
      assert.isTrue(mant == -(1n << 52n));
      assert.equal(exp2, -3 - 52);
    });

    it('zero', function () {
      let [mant, exp2] = dbor.splitFiniteNumberIntoBinaryRationalComponents(0);
      assert.isTrue(mant == 0n);
      assert.equal(exp2, 0);

      [mant, exp2] = dbor.splitFiniteNumberIntoBinaryRationalComponents(-0);
      assert.isTrue(mant == 0n);
      assert.equal(exp2, 0);
    });

    it('boundaries', function () {
      let [mant, exp2] = dbor.splitFiniteNumberIntoBinaryRationalComponents(Number.MIN_VALUE);
      assert.isTrue(mant == (1n << 52n));
      assert.equal(exp2, -1022 - 52 - 52);

      [mant, exp2] = dbor.splitFiniteNumberIntoBinaryRationalComponents(Number.MAX_VALUE);
      assert.isTrue(mant == (1n << 53n) - 1n);
      assert.equal(exp2, 1023 - 52);
    });

  });

  describe('compareByteSequences()', function () {
    it('one is empty', function () {
      assert.equal(dbor.compareByteSequences([], []), 0);
      assert.equal(dbor.compareByteSequences([], [0]), -1);
      assert.equal(dbor.compareByteSequences([0], []), 1);
    });

    it('non-empty with different first byte', function () {
      assert.equal(dbor.compareByteSequences([0, 0], [1]), -1);
      assert.equal(dbor.compareByteSequences([1], [0, 0]), 1);
    });

    it('non-empty with same first byte and different length', function () {
      assert.equal(dbor.compareByteSequences([0, 0], [0]), 1);
      assert.equal(dbor.compareByteSequences([0], [0, 0]), -1);
    });

    it('non-empty with same first byte and same length', function () {
      assert.equal(dbor.compareByteSequences([0, 3, 1, 2], [0, 0, 2, 2]), -1);
      assert.equal(dbor.compareByteSequences([0, 0, 2, 2], [0, 3, 1, 2]), 1);
    });

    it('non-empty, same', function () {
      assert.equal(dbor.compareByteSequences([0, 3, 1, 2], [0, 3, 1, 2]), 0)
    });

  });

});

describe('Encoder', function () {
  describe('construction', function () {
    it('empty', function () {
      let e = new dbor.Encoder();
      assert.deepEqual(e.bytes, []);
    });
  });

  describe('None', function () {
    it('typical', function () {
      let e = new dbor.Encoder();
      e.appendNone().appendNone();
      assert.deepEqual(e.bytes, [0xFF, 0xFF]);
    });
  });

  describe('Numberlike', function () {
    it('typical', function () {
      let e = new dbor.Encoder();
      e.appendMinusZero().appendMinusInfinity().appendInfinity();
      assert.deepEqual(e.bytes, [0xFC, 0xFD, 0xFE]);
    })
  });

  describe('Integer', function () {
    it('small non-negative', function () {
      let e = new dbor.Encoder();
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
      let e = new dbor.Encoder();
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
      let e = new dbor.Encoder();
      const nmin = -18519084246547628312n; // ~= -1.004 * 2^64
      e.appendInteger(nmin);
      assert.deepEqual(e.bytes, [0x3F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

      assert.throws(function () { e.appendInteger(nmin - 1n); }, RangeError);
      assert.deepEqual(e.bytes, [0x3F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    });

    it('maximum', function () {
      let e = new dbor.Encoder();
      const nmax = 18519084246547628311n; // ~= 1.004 * 2^64
      e.appendInteger(nmax);
      assert.deepEqual(e.bytes, [0x1F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

      assert.throws(function () { e.appendInteger(nmax + 1n); }, RangeError);
      assert.deepEqual(e.bytes, [0x1F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    });

  });

  describe('BinaryRational', function () {
    it('typical', function () {
      let e = new dbor.Encoder();
      e.appendBinaryRational(2, -4).appendBinaryRational(-27n, 0n).appendBinaryRational(-0.125, 0).appendBinaryRational(0.5, -2);
      assert.deepEqual(e.bytes, [
        0xC8, 0x00,
        0xC8, 0xFB,
        0xC8, 0x80,
        0xC8, 0x00
      ]);
    });

    it('zero', function () {
      let e = new dbor.Encoder();
      e.appendBinaryRational(0, 123);
      assert.deepEqual(e.bytes, [0x00]);
    });

    it('non-finite numbers', function () {
      let e = new dbor.Encoder();
      e.appendBinaryRational(Number.NaN, 0).appendBinaryRational(-0, 0)
      .appendBinaryRational(Number.NEGATIVE_INFINITY, 0).appendBinaryRational(Number.POSITIVE_INFINITY, 0);
      assert.deepEqual(e.bytes, [
        0xFF,
        0xFC, 0xFD, 0xFE
      ]);
    });

    it('boundaries', function () {
      let e = new dbor.Encoder();
      e.appendBinaryRational(1n, -1074);
      assert.deepEqual(e.bytes, [0xCF, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      assert.throws(function () { e.appendBinaryRational(1n, -1075); }, RangeError);
      assert.deepEqual(e.bytes, [0xCF, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

      e = new dbor.Encoder();
      e.appendBinaryRational(-((1n << 53n) - 1n), 1024 - 52);
      assert.deepEqual(e.bytes, [0xCF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
      assert.throws(function () { e.appendBinaryRational(-((1n << 53n) - 1n), 1024 - 51); }, RangeError);
      assert.throws(function () { e.appendBinaryRational(-((1n << 54n) - 1n), 1024 - 52); }, RangeError);
      assert.deepEqual(e.bytes, [0xCF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    });

  });

  describe('DecimalRational', function () {
    it('typical', function () {
      let e = new dbor.Encoder();

      e.appendDecimalRational(1, -2).appendDecimalRational(-3, 4);
      assert.deepEqual(e.bytes, [
        0xE9, 0x01,
        0xE3, 0x22
      ]);

      e = new dbor.Encoder();
      e.appendDecimalRational(1234, -56)
      assert.deepEqual(e.bytes, [
        0xD8, 0x2F,
        0x19, 0xBA, 0x03
      ]);
    });

    it('zero', function () {
      let e = new dbor.Encoder();
      e.appendDecimalRational(0, 123456781234567812345678n);
      assert.deepEqual(e.bytes, [0x00]);
    });

    it('boundaries', function () {
      let e = new dbor.Encoder();

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

      e = new dbor.Encoder();

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
      let e = new dbor.Encoder();
      e.appendByteString([]).appendByteString([0xFF, 0x00, 0x03]);
      assert.deepEqual(e.bytes, [
        0x40,
        0x43, 0xFF, 0x00, 0x03
      ]);
    });
  });

  describe('Utf8String', function () {
    it('typical', function () {
      let e = new dbor.Encoder();
      e.appendUtf8String('').appendUtf8String(42);
      assert.deepEqual(e.bytes, [
        0x60,
        0x62, 0x34, 0x32
      ]);

      e = new dbor.Encoder();
      e.appendUtf8String('a\u{F6}\u{01D6FC}\u{01D544}');  // 'aö𝛼𝕄'
      assert.deepEqual(e.bytes, [
        0x6B,
        0x61,
        0xC3, 0xB6,
        0xF0, 0x9D, 0x9B, 0xBC,
        0xF0, 0x9D, 0x95, 0x84
      ]);
    });

    it('invalid code point', function () {
      let e = new dbor.Encoder();
      e.appendUtf8String('');
      assert.throws(function () { e.appendUtf8String('\uD800'); }, RangeError);
      assert.deepEqual(e.bytes, [0x60]);
    });
  });


  describe('Sequence', function () {
    it('typical', function () {
      let e = new dbor.Encoder();
      e.appendSequenceHeader(0);
      assert.deepEqual(e.bytes, [0x80]);

      e = new dbor.Encoder();
      e.appendSequenceHeader(0x17);
      assert.deepEqual(e.bytes, [0x97]);

      e = new dbor.Encoder();
      e.appendSequenceHeader(0xFFFFFFFF);
      assert.deepEqual(e.bytes, [0x9B, 0xE7, 0xFE, 0xFE, 0xFE]);
    });

    it('negative size', function () {
      let e = new dbor.Encoder();
      assert.throws(function () { e.appendSequenceHeader(-1); }, RangeError);
    });
  });

  describe('Dictionary', function () {
    it('typical', function () {
      let e = new dbor.Encoder();
      e.appendDictionaryHeader(0);
      assert.deepEqual(e.bytes, [0xA0]);

      e = new dbor.Encoder();
      e.appendDictionaryHeader(0x17);
      assert.deepEqual(e.bytes, [0xB7]);

      e = new dbor.Encoder();
      e.appendDictionaryHeader(0xFFFFFFFF);
      assert.deepEqual(e.bytes, [0xBB, 0xE7, 0xFE, 0xFE, 0xFE]);
    });

    it('negative size', function () {
      let e = new dbor.Encoder();
      assert.throws(function () { e.appendDictionaryHeader(-1); }, RangeError);
    });
  });

  describe('Allocator', function () {
    it('typical', function () {
      let e = new dbor.Encoder();
      e.appendAllocatorHeader(0x42);
      assert.deepEqual(e.bytes, [0xC0, 0x41]);

      e = new dbor.Encoder();
      e.appendAllocatorHeader(0xFFFFFFFF);
      assert.deepEqual(e.bytes, [0xC3, 0xFE, 0xFE, 0xFE, 0xFE]);
    });

    it('non-positive size', function () {
      let e = new dbor.Encoder();
      assert.throws(function () { e.appendAllocatorHeader(0); }, RangeError);
      assert.throws(function () { e.appendAllocatorHeader(-1); }, RangeError);
    });
  });

});

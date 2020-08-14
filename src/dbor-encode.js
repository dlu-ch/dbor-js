// SPDX-License-Identifier: LGPL-3.0-or-later
// dbor-js - ECMAScript 2020 implementation of DBOR encoder
// Copyright (C) 2020 Daniel Lutz <dlu-ch@users.noreply.github.com>

// https://www.ecma-international.org/ecma-262/11.0/

"use strict";

let dbor = {};  // name space


dbor.trailingZeroBitCount = function (v) {
  v = BigInt(v);
  if (v == 0n)
    return -1n;
  let n = 0;
  while (!(v & 1n)) {
    v >>= 1n;
    n += 1;
  }
  return n;
};


// Returns smallest i in the range -1 ... n such that 2^i >= v or n if no such i.
dbor.boundedFloorLog2 = function (v, n) {
  v = BigInt(v);
  n = BigInt(n);

  if (v == 0n)
    return -1n;

  if (n == 0n)
    return 0n;

  const vm = 1n << (n - 1n);
  while (v <= vm) {
    v <<= 1n;
    n -= 1n;
  }

  return n;
};


dbor.binaryRationalPForMinPAndR = function (p, r) {  // -> p from [4, 10, 16, 23, 30, 37, 44, 52]
  p = Number(p);
  r = Number(r);

  if (p > 44n || r > 11n)
    return 52;

  let k = p < 23 ? Math.floor((p + 1) / 6) : Math.floor((p + 4) / 7);
  if (r > 2)
    k = Math.max(k, r < 9 ? Math.floor(r / 2) - 1 : Math.min(11, r) - 5);

  return [4, 10, 16, 23, 30, 37, 44, 52][k];
};


// Return its UTF-8 encoding (as an array of integer 0x00 ... 0xFF) if the non-negative integer *codePoint*
// is a valid Unicode code point (in the range 0 .. 0xD7FF or 0xE000 .. 0x10FFFF) and [] otherwise.
dbor.encodeCodePointAsUtf8 = function (codePoint) {
  if (codePoint < 0)
    return [];
  if (codePoint <= 0x7F)
    return [codePoint];
  if (codePoint <= 0x7FF)
    return [0xC0 | codePoint >> 6, 0x80 | codePoint & 0x3F];
  if (codePoint <= 0xFFFF) {
    if (codePoint > 0xD7FF && codePoint < 0xE000)
      return [];
    return [0xE0 | codePoint >> 12, 0x80 | ((codePoint >> 6) & 0x3F), 0x80 | codePoint & 0x3F];
  }
  if (codePoint <= 0x10FFFF)
    return [0xF0 | codePoint >> 18, 0x80 | ((codePoint >> 12) & 0x3F), 0x80 | ((codePoint >> 6) & 0x3F), 0x80 | codePoint & 0x3F];
  return [];
};


dbor.encodeNaturalTokenData = function (value) {
  value = BigInt(value);

  if (value <= 0n)
    throw new RangeError('too small');

  let s = [];
  while (value > 0) {
      value -= BigInt(1);
      s.push(Number(value % 256n));
      value = value / 256n;
      if (s.length > 8)
          throw new RangeError('too large');
  }
  return s;
};


dbor.encodeIntegerToken = function (h, value) {
  if (value < 0)
    throw new RangeError(`expected non-negative 'value', got ${value}`);

  let first = (Number(h) & 7) << 5;
  if (value <= 0x17)
    return [first | Number(value)];
  const data = dbor.encodeNaturalTokenData(BigInt(value) - 0x17n);
  return [first | 0x18 | (data.length - 1)].concat(data);
};


dbor.encodePowerOfTenToken = function (value) {
  value = BigInt(value);
  if (value == 0)
    throw new RangeError('must not be 0');

  const valueAbs = value < 0 ? -value : value;
  const h = 0xC0 | (value < 0 ? 8 : 0);
  if (valueAbs <= 8n)
    return [h | 0x20 | (Number(valueAbs) - 1)];
  const data = dbor.encodeNaturalTokenData(valueAbs - 8n);
  return [h | 0x10 | (data.length - 1)].concat(data);
};


// Return [mant, exp2] such that mant * 2^exp2 = value and 2^52 <= |mant| < 2^53.
dbor.splitFiniteNumberIntoBinaryRationalComponents = function (value) {
  if (!Number.isFinite(value))
    throw new RangeError("'value' must be finite number");  // also if not a Number

  let exp2 = 0;
  let mantAbs = Math.abs(value);
  if (Number.isSafeInteger(value))  // -0 is an integer
    return [BigInt(value), 0];

  while (mantAbs < 0) {
    mantAbs *= 4503599627370496;
    exp2 -= 52;
  }
  while (mantAbs > 4503599627370496) {  // 2^52
    mantAbs /= 4503599627370496;
    exp2 += 52;
  }
  while (mantAbs < 4503599627370496) {
    mantAbs *= 2;
    exp2 -= 1;
  }
  // 2^52 <= mantAbs < 2^53

  return [BigInt(value < 0 ? -mantAbs : mantAbs), exp2];
};


// Return [isNeg, mantNorm, exp2Norm] where
// 0 <= mantNorm < 2^53, -1022 - 52 <= exp2Norm <= 1024 - 52, such that
// |mantNorm| * 2^exp2Norm = |mant| * 2^exp2, and mant >= 2^52 for exp2 > -1022 - 52.
dbor.normalizeBinaryRationalComponents = function (mant, exp2) {
  mant = BigInt(mant);
  exp2 = BigInt(exp2);

  if (mant == 0n)
    return [false, 0n, -1022 - 52];

  const isNeg = mant < 0;
  let mantNormAbs = mant >= 0n ? mant : -mant;
  let exp2Norm = exp2;
  while (mantNormAbs > (1n << 53n) && !(mantNormAbs & 1n)) {
    mantNormAbs /= 2;
    exp2Norm += 1;
  }
  if (mantNormAbs > (1n << 53n))
    throw new RangeError("mantissa too wide");
  while (mantNormAbs < (1n << 52n)) {
      mantNormAbs *= 2n;
      exp2Norm -= 1n;
  }

  // 2^52 <= mantNormAbs < 2^53
  // mantNormAbs * 2^exp2Norm = |mant * 2^exp2|

  if (exp2Norm > 1024n - 52n)
    throw new RangeError('magnitude too large');

  if (exp2Norm <= -1022n - 52n) {
    // subnormal
    while (exp2Norm < -1022n - 52n && !(mantNormAbs & 1n)) {
      mantNormAbs /= 2n;
      exp2Norm += 1n;
    }
    // exp2Norm <= -1022n - 52n, mantNormAbs < 2^53
    if (exp2Norm < -1022n - 52n)
      throw new RangeError('magnitude too small');
    return [isNeg, mantNormAbs, -1022 - 52];
  }

  return [isNeg, mantNormAbs, Number(exp2Norm)];
};


dbor.encodeCanonicalBinaryRationalToken = function (mant, exp2) {
  let [isNeg, mantNorm, exp2Norm] = dbor.normalizeBinaryRationalComponents(mant, exp2)
  if (mantNorm == 0n)
    throw new RangeError('must not be 0');

  if (exp2Norm <= -1022 - 52 && mantNorm >= (1n << 51n) && !(mantNorm & 0x7Fn)) {
    // p <= 44 -> normalized with exp2 = -1023 - 52
    mantNorm *= 2n;
    exp2Norm -= 1;
  }

  // mantNormMsb is 0 or 2^52
  // 0 <= mantNorm < 2^52
  // -1023 - 52 <= exp2Norm <= 1024 - 52

  let k;  // size of BinaryRationalValue - 1
  let binary; // lowest 8 (k + 1) bits will represent the number

  if (mantNorm < (1n << 52n)) {  // subnormal?
    binary = mantNorm;
    k = 7;
  } else {  // normalized
    const exp2NormOffset = exp2Norm + 52;  // -1023 .. 1024

    let p = 52 - dbor.trailingZeroBitCount(mantNorm);
    // 0 <= p <= 52: number of necessary mantissa bits if normalized (without hidden bit)
    let r = dbor.boundedFloorLog2(exp2NormOffset < 0 ? -exp2NormOffset + 1 : exp2NormOffset, 10) + 1n;
    // -1 <= r <= 10: number of necessary exponent bits if normalized

    p = dbor.binaryRationalPForMinPAndR(p, r);
    k = Math.floor(p / 7);
    r = 8 * k + 7 - p;
    binary = (mantNorm - (1n << 52n)) >> BigInt(52 - p);  // normalized
    binary += (BigInt(exp2NormOffset) + (1n << BigInt(r - 1)) - 1n) << BigInt(p);
  }

  // add sign bit
  if (isNeg)
    binary += 1n << (8n * BigInt(k) + 7n);

  let bytes = [0xC8 | k];
  for (let i = k + 1; i > 0; i -= 1) {
    bytes.push(Number(binary % 256n));
    binary /= 256n;
  }

  return bytes;
};


dbor.Encoder = class {
  constructor() {
    this.bytes = [];  // TODO to Uint8Array?
  }

  // Append a NoneValue.
  appendNone() {
    this.bytes.push(0xFF);
    return this;
  }

  // Append a MinusZeroValue.
  appendMinusZero () {
    this.bytes.push(0xFC);
    return this;
  }

  // Append a MinusInfinityValue.
  appendMinusInfinity () {
    this.bytes.push(0xFD);
    return this;
  }

  // Append a InfinityValue.
  appendInfinity () {
    this.bytes.push(0xFE);
    return this;
  }

  // Append an IntegerValue representing *value*, which can by an integer Number or a BigInt.
  // Throws RangeError if *value* not in the range -18'519'084'246'547'628'312 .. 18'519'084'246'547'628'311.
  appendInteger (value) {
    value = BigInt(value);
    const bytes = (value >= 0n) ? dbor.encodeIntegerToken(0, value) : dbor.encodeIntegerToken(1, -(value + 1n));
    this.bytes = this.bytes.concat(bytes);
    return this;
  }

  // Append an IntegerValue or BinaryRationalValue representing *mant * 2^exp2*.
  // *mant* can be a Number or BigInt, *exp2* a BigInt.
  // Throws RangeError if *mant * 2^exp2* not representable.
  appendBinaryRational (mant, exp2) {
    if (Number.isNaN(mant))
      return this.appendNone();
    if (mant === Number.NEGATIVE_INFINITY)
      return this.appendMinusInfinity();
    if (mant === Number.POSITIVE_INFINITY)
      return this.appendInfinity();
    if (mant === 0 && 1 / mant < 0)
      return this.appendMinusZero();

    exp2 = BigInt(exp2);
    if (Number.isFinite(mant)) { // false for BigInt
      let [mantm, exp2m] = dbor.splitFiniteNumberIntoBinaryRationalComponents(mant);
      mant = mantm;
      exp2 += BigInt(exp2m);
    }

    mant = BigInt(mant);
    if (mant == 0n)
      return this.appendInteger(0);

    const bytes = dbor.encodeCanonicalBinaryRationalToken(mant, exp2);
    this.bytes = this.bytes.concat(bytes);
    return this;
  }

  // Append an IntegerValue or DecimalRationalValue representing *mant * 10^exp10*.
  // *mant* and *exp10* can be integer Number or a BigInt.
  // Throws RangeError if *mant* not in the range -18'519'084'246'547'628'312 .. 18'519'084'246'547'628'311 or
  // *exp10* not in the range -18'519'084'246'547'628'296 .. 18'519'084'246'547'628'296.
  appendDecimalRational (mant, exp10) {
    mant = BigInt(mant);
    exp10 = BigInt(exp10);
    if (mant == 0n || exp10 == 0n)
      return this.appendInteger(mant);

    const bytes = dbor.encodePowerOfTenToken(exp10).concat(new this.constructor().appendInteger(mant).bytes);
    this.bytes = this.bytes.concat(bytes);
    return this;
  }

  // Append a ByteStringValue representing *value* (an array of numbers).
  // Throws RangeError if *value* is not an iterable of object o such that Number(o) is an integer in the range 0x00 .. 0xFF.
  appendByteString (value) {
    let bytes = [];
    value.forEach(b => {
      const n = Number(b);
      if (!Number.isInteger(n) || n < 0 || n > 0xFF)
        throw new RangeError(`not a valid byte: ${b}`);
      bytes.push(n);
    });

    this.bytes = this.bytes.concat(dbor.encodeIntegerToken(2, bytes.length)).concat(bytes);
    return this;
  }

  // Append a Utf8StringValue representing String(value) in Normalization Form C.
  // Throws RangeError if String(value) contains an invalid code point.
  appendUtf8String (value) {
    value = String(value);

    let codepoints = [];
    Array.from(value.normalize('NFC')).forEach(c => codepoints.push(c.codePointAt(0)));

    let bytes = [];
    codepoints.forEach(c => {
      let b = dbor.encodeCodePointAsUtf8(c);
      if (b.length <= 0) {
        let cp = c.toString(16).toUpperCase();
        throw new RangeError(`not a valid code point: 0x${cp}`);
      }
      bytes = bytes.concat(b);
    });

    this.bytes = this.bytes.concat(dbor.encodeIntegerToken(3, bytes.length)).concat(bytes);
    return this;
  }

  // Append the header of a SequenceValue, to be followed by exactly contentSize bytes.
  // Throws RangeError if contentSize too large.
  appendSequenceHeader (contentSize) {
    this.bytes = this.bytes.concat(dbor.encodeIntegerToken(4, contentSize));
    return this;
  }

};

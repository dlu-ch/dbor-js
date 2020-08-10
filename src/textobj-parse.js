// SPDX-License-Identifier: LGPL-3.0-or-later
// dbor-js - ECMAScript 2020 implementation of DBOR encoder
// Copyright (C) 2020 Daniel Lutz <dlu-ch@users.noreply.github.com>

// https://www.ecma-international.org/ecma-262/11.0/

"use strict";

let textobj = {};  // name space


textobj.InputError = class extends Error {
  constructor(message, index = 0) {
    super(message);
    this.index = index;  // 0-based index of first invalid UTF-16 code unit in input
  }
};


textobj.InputTypeError = class extends textobj.InputError {
};


textobj.Object = class {
};


textobj.IntegerWithExpFactor = class extends textobj.Object {
  constructor(mant, base, exp, isNeg) {
    super();
    this.mant = BigInt(mant || 0);
    this.exp = BigInt(exp || 0);
    this.base = base == null ? null : BigInt(base);
    this.isNeg = (isNeg || this.mant < 0n) && this.mant <= 0n;
  }
};


// Input from UTF-16 code unit 'index' to UTF-16 code unit
// 'index' + 'length' - 1 with (optional) associated object 'object'.

textobj.InputRange = class {
  constructor(index, length, object = null) {
    this.index = Number(index || 0);
    this.length = Number(length || 0);
    this.object = object;
  }
};


textobj.makeIndexRelativeToLine = function (index, text = '') {  // -> [lineIndex, columnIndex]
  text = String(text);
  index = Number(index);

  let lineIndex = 0;
  let columnIndex = 0;

  let i = 0;
  let j = Math.min(Number(index), text.length);
  for (i = 0; i < j; i += 1) {
    if (text[i] == '\n' || text[i] == '\r') {
      if (text[i] == '\r' && i + 1 < text.length && text[i + 1] == '\n')  // CR LF?
        i += 1;
      lineIndex += 1;
      columnIndex = 0;
    } else {
      columnIndex += 1;
    }
  }

  return [lineIndex, columnIndex + index - j];
};


// Parse the longest non-empty prefix of text that matches <number> as a number.
//
// When no <base-spec> is given, a <base-spec> of '10#' is assumed.
// The number n with <decimal-nonnegative> in a <base-spec> is the number base; it is invalid if
// outside the range 2 .. 36.
// For a number base n with 2 <= n <= 36, <digits-with-optional-dot> is invalid if one of its
// <digit> is not one of the first n elements in the sequence "0", ..., "9", "A", ..., "Z".
//
// If 'decimalPlaces' is null, the value of the represented number is 'value'.
// If 'decimalPlaces' is not null, the represented number is 'value' / 'base'^'decimalPlaces' and
// 'decimalPlaces' >= 0.
//
// Syntax:
//
//   <number> ::= [ "-" | "+" ] [ <base-spec> ] <digits-with-optional-dot>.
//
//   <base-spec> ::= <decimal-nonnegative> "#".
//   <digits-with-optional-dot> ::= <digit-group> { "_" <digit-group> } [ "." <digit-group> { "_" <digit-group> } ].
//
//   <decimal-nonnegative> ::= <decimal-digit> { <decimal-digit> }.
//   <digit-group> ::= <digit> { <digit> }.
//
//   <decimal-digit> ::= "0" | ... | "9".
//   <digit> ::= <decimal-digit> | "A" | ... | "Z".

textobj.parseSimpleNumber = function (text) {  // -> [isNeg: bool, value: BigInt, base: BigInt, decimalPlaces: BigInt, dotPos: Number, parsedlength: Number]
  text = String(text);
  let m = text.match(/^([+-])?[0-9]/);
  if (!m)
    throw new textobj.InputTypeError('missing number', 0);

  const isNeg = m[1] == '-';
  const afterSignPos = (m[1] || '').length;
  let pos = afterSignPos;

  // parse as decimal number (e.g. '12_345.678_90_')
  let base = 10n;
  let hasExplicitBase = false;

  let absValue;
  let lastUnderscorePos;
  let lastDotPos;
  let decimalPlaces;  // null or non-negative number of digits after '.'

  while (true) {
    absValue = 0n;
    lastUnderscorePos = null;
    lastDotPos = null;
    decimalPlaces = null;

    while (true) {
      if (pos >= text.length)
        break;

      if (text[pos] >= '0' && text[pos] <= '9' || text[pos] >= 'A' && text[pos] <= 'Z') {
        const c = text[pos].codePointAt(0);
        const d = BigInt(c >= 0x41 ? c - 0x41 + 10 : c - 0x30);
        if (d >= base)
          throw new textobj.InputError(`invalid digit for base ${base} number`, pos);
        absValue = base * absValue + d;
        if (lastDotPos !== null)
          decimalPlaces += 1n;
      } else if (text[pos] == '_') {
        if (lastUnderscorePos !== null && lastUnderscorePos + 1 == pos)
          throw new textobj.InputError("surplus '_' in number", pos);
        if (lastDotPos !== null && lastDotPos + 1 == pos)
          throw new textobj.InputError("missing digit after '.'", pos);
        lastUnderscorePos = pos;
      } else if (text[pos] == '.') {
        if (lastDotPos !== null)
          throw new textobj.InputError("surplus '.' in number", pos);
        lastDotPos = pos;
        decimalPlaces = 0n;
      } else {
        break
      }

      pos += 1;
    }

    // so far:
    // - at least one decimal digit
    // - at most one '.'
    // - does not contain '__'
    // - does not end with '.'
    // - may end with '_'
    // - absolute value is absValue / base^digitsAfterDot

    if (pos >= text.length)
      break;

    if (text[pos] != '#')
      break;

    if (hasExplicitBase)
      throw new textobj.InputError("surplus '#' in number", pos);
    if (lastUnderscorePos !== null)
      throw new textobj.InputError("invalid in number base: '_'", lastUnderscorePos);
    if (lastDotPos !== null)
      throw new textobj.InputError("invalid in number base: '.'", lastDotPos);
    if (absValue < 2 || absValue > 36)
      throw new textobj.InputError(`number base must be 2 .. 36, not ${absValue}`, afterSignPos);

    hasExplicitBase = true;
    base = absValue;
    pos += 1;
    if (pos >= text.length || !text[pos].match(/^[0-9A-Z]/))
      throw new textobj.InputError("missing digit after '#'", pos);
  }

  if (lastUnderscorePos !== null && lastUnderscorePos + 1 == pos)
    pos -= 1;

  return [isNeg, isNeg ? -absValue : absValue, base, decimalPlaces, lastDotPos, pos]
};


textobj.parseSimpleInteger = function (text) {  // -> [isNeg: bool, absValue: BigInt, parsedlength: Number]
  const [isNeg, value, base, decimalPlaces, dotPos, parsedLength] = textobj.parseSimpleNumber(text);
  if (dotPos != null)
      throw new textobj.InputError("invalid in integer number: '.'", dotPos);
  return [value, parsedLength];
};


textobj.Parser = class {

  constructor (text) {
    this.unparsed = String(text);
    this.index = 0; // current position in input; 0 based, UTF-16 code units (not codepoints)
  }


  advance (n = 1) {
    n = Number(n);
    this.unparsed = this.unparsed.substring(n);
    this.index += n;
  }


  // Remove all characters with code points <= U+0020 at the beginning of the unparsed string.
  consumeOptionalWhitespace () {
    let n;
    for (n = 0; n < this.unparsed.length && this.unparsed.charCodeAt(n) <= 0x20; n += 1);
    this.advance(n);
  }


  // Consume the longest prefix of the unparsed text that is a number <number> (at least one character)
  // an return [isNeg, mant, base, exp] as an exact representation of the parsed number.
  //
  // 'base' is 2n or 10n or null.
  // 'base' is null if and only if <number> contains <mantissa> with "." or an <exp-factor>.
  // If 'mant' = 0, 'exp' = 0.
  // If 'mant' > 0, 'isNeg' = false.
  // If 'mant' < 0, 'isNeg' = true.
  //
  // 'mant' and 'exp' are BigInt instances.
  // If 'base' = null, the represented number is 'mant'.
  // If 'base' != null, the represented number is 'mant' * 'base'^'exp'.
  //
  // Examples of <number>:
  //
  //   -0.75
  //   10^-42
  //   1.234_*_10^-3
  //   1.234_/_10^3
  //   2#0.0100_1010_0100_10_*_10^-16#10_FFFE
  //   -2#1.01001010010010*2^-16#10FFFE
  //
  // Syntax:
  //
  //   <number> ::=  [ "-" | "+" ] <nonnegative-number>.
  //   <nonnegative-number> ::= <mantissa> | <mantissa> [ "_" ] [ "*" | "/" ] [ "_" ] <exp-factor> | <exp-factor>.
  //
  //   <mantissa> ::= <simple-number>.
  //   <exp-factor> ::= <simple-number> "^" <simple-number>.
  //   <number> ::=  <base-spec> <digit-group> { "_" <digit-group> } [ "." <digit-group> { "_" <digit-group> } ].
  //
  //   <base-spec> ::= <decimal-natural> "#" <decimal-natural>.
  //   <decimal-nonnegative> ::= <decimal-digit> { <decimal-digit> }.
  //
  //   <digit-group> ::= <digit> { <digit> }.
  //
  //   <decimal-digit> ::= "0" | ... | "9".
  //   <digit> ::= <decimal-digit> | "A" | ... | "Z".

  consumeNumber () {  // -> textobj.IntegerWithExpFactor(mant, powerBase, exp, isNeg) where powerBase is 2 or 10 or null
    let pos = 0;  // relative to this.index

    // parse
    let isNeg = false;
    let mant = 1n;
    let mantBase = 10n;
    let mantDecimalPlaces = null;
    let mantDotPos = null;
    let powerBase = null;
    let exp = 0n;

    try {

      let invertExp = false;
      let expStr = null;
      let powerBaseStr = null;

      let m = this.unparsed.match(/^([+-]?)(2|10)\^/);
      if (m) {  // e.g. '-10^-42'
        // mantissa
        isNeg = m[1] == '-';
        mant = isNeg ? -1n : 1n;

        // prepare exponent
        powerBaseStr = m[2];
        pos += m[0].length;
        expStr = this.unparsed.substring(pos);
      } else {
        // parse mantissa
        let mantLength;
        [isNeg, mant, mantBase, mantDecimalPlaces, mantDotPos, mantLength] =
          textobj.parseSimpleNumber(this.unparsed);
        if (mantDecimalPlaces != null)
          powerBase = 10n;

        pos += mantLength;

        const potentialExpStr = this.unparsed.substring(pos);
        m = potentialExpStr.match(/^_?([*/])_?(2|10)\^/);
        if (m) {
          invertExp = m[1] == '/';
          powerBaseStr = m[2];
          expStr = potentialExpStr.substring(m[0].length);
          pos += m[0].length;
        } else if (potentialExpStr.match(/^[0-9A-Z_^*/+-]/)) {
            throw new textobj.InputError('missing digit or exponentiation factor', 0);
        }
      }

      // parse exponent
      if (expStr) {
        let expLength;
        [exp, expLength] = textobj.parseSimpleInteger(expStr);
        if (invertExp)
          exp = -exp;
        pos += expLength;
        powerBase = BigInt(powerBaseStr);
      }

    } catch (error) {
      if (!(error instanceof textobj.InputError))
        throw error;
      throw new error.constructor(
        error.message, this.index + pos + error.index);
    }

    // transform

    if (mantDecimalPlaces !== null) {
      // mantissa is mant / mantBase^mantDecimalPlaces with mantDecimalPlaces >= 0
      const origMantBase = mantBase;

      while (mantBase % powerBase === 0n) {
        // with r := mantBase / powerBase:
        // mant / mantBase^mantDecimalPlaces * powerBase^exp
        // = mant / (r * powerBase)^mantDecimalPlaces * powerBase^exp
        // = mant * r^mantDecimalPlaces * powerBase^(exp - mantDecimalPlaces)
        mantBase /= powerBase;  // = r
        exp -= mantDecimalPlaces;
      }

      // mantBase % powerBase !== 0
      const smallerPowerBasePrimeFactors = powerBase == 10n ? [2n, 5n] : [];
      for (let p of smallerPowerBasePrimeFactors) {
        while (mantBase % p === 0n) {
          // with r := mantBase / p, s := powerBase / p:
          // mant / mantBase^mantDecimalPlaces * 10^exp
          // = mant / (p * r)^mantDecimalPlaces * 10^exp
          // = mant * s^mantDecimalPlaces / (p * s * r)^mantDecimalPlaces * 10^exp
          // = mant * s^mantDecimalPlaces / r^mantDecimalPlaces * 10^(exp - mantDecimalPlaces)
          mantBase /= p;  // = r
          mant *= (powerBase / p)**mantDecimalPlaces;
          exp -= mantDecimalPlaces;
        }
      }

      // mantBase and powerBase have no common prime factors
      while (mantBase > 1n && mantDecimalPlaces > 0n) {
        if (mant % mantBase != 0n)
          throw new textobj.InputError(
            `non-integer mantissa in base ${origMantBase} cannot be ` +
            `represented exactly in base ${powerBase}`,
            this.index + (mantDotPos || 0));
        mant /= mantBase;
        mantDecimalPlaces -= 1n;
      }

      // normalize
      if (mant == 0n) {
        exp = 0n;
      } else {
        while (mant % powerBase == 0n) {
          mant /= powerBase;
          exp += 1n;
        }
      }
    }

    this.advance(pos);
    return new textobj.IntegerWithExpFactor(mant, powerBase, exp, isNeg);
  }


  // TODO test

  parse () {  // [ InputRange(), ...]
    let objects = [];

    while (true) {
      this.consumeOptionalWhitespace();

      const startIndex = this.index;
      const number = this.consumeNumber();
      objects.push(new textobj.InputRange(startIndex, this.index - startIndex, number));

      this.consumeOptionalWhitespace();
      if (!this.unparsed)
        break;

      if (this.unparsed[0] != ',')
        throw new textobj.InputError("missing ','", this.index);

      this.advance();
    }

    return objects;
  }

};

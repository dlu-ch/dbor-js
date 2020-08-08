// SPDX-License-Identifier: LGPL-3.0-or-later
// dbor-js - ECMAScript 2020 implementation of DBOR encoder
// Copyright (C) 2020 Daniel Lutz <dlu-ch@users.noreply.github.com>

// https://www.ecma-international.org/ecma-262/11.0/

class InputError extends Error {
  constructor(message, columnIndex = 0, lineIndex = 0) {
    super(message);
    this.columnIndex = columnIndex;  // 0-based character index of in line 'lineIndex'
    this.lineIndex = lineIndex; // 0-based index of input line containing first invalid character
  }
}


class InputTypeError extends InputError {
}


class IntegerWithPowerFactor {
  constructor(mant, base, exp, isNeg) {
    this.mant = BigInt(mant || 0);
    this.base = BigInt(base || 10);
    this.exp = BigInt(exp || 0);
    this.isNeg = (isNeg || this.mant < 0n) && this.mant <= 0n;
  }
}



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

function parseSimpleNumber (text) {  // -> [isNeg: bool, value: BigInt, base: BigInt, decimalPlaces: BigInt, dotPos: Number, parsedlength: Number]
  text = String(text);
  let m = text.match(/^([+-])?[0-9]/);
  if (!m)
    throw new InputTypeError('not a number', 0);

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
          throw new InputError(`invalid digit for base ${base} number`, pos);
        absValue = base * absValue + d;
        if (lastDotPos !== null)
          decimalPlaces += 1n;
      } else if (text[pos] == '_') {
        if (lastUnderscorePos !== null && lastUnderscorePos + 1 == pos)
          throw new InputError("surplus '_'", pos);
        if (lastDotPos !== null && lastDotPos + 1 == pos)
          throw new InputError("missing digit after '.'", pos);
        lastUnderscorePos = pos;
      } else if (text[pos] == '.') {
        if (lastDotPos !== null)
          throw new InputError("surplus '.'", pos);
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
      throw new InputError("surplus '#'", pos);
    if (lastUnderscorePos !== null)
      throw new InputError("invalid in number base: '_'", lastUnderscorePos);
    if (lastDotPos !== null)
      throw new InputError("invalid in number base: '.'", lastDotPos);
    if (absValue < 2 || absValue > 36)
      throw new InputError(`number base must be 2 .. 36, not ${absValue}`, afterSignPos);

    hasExplicitBase = true;
    base = absValue;
    pos += 1;
    if (pos >= text.length || !text[pos].match(/^[0-9A-Z]/))
      throw new InputError("missing digit after '#'", pos);
  }

  if (lastUnderscorePos !== null && lastUnderscorePos + 1 == pos)
    pos -= 1;

  return [isNeg, isNeg ? -absValue : absValue, base, decimalPlaces, lastDotPos, pos]
}


function parseSimpleInteger (text) {  // -> [isNeg: bool, absValue: BigInt, parsedlength: Number]
  const [isNeg, value, base, decimalPlaces, dotPos, parsedLength] = parseSimpleNumber(text);
  if (dotPos != null)
      throw new InputError("invalid in integer number: '.'", dotPos);
  return [value, parsedLength];
}


class Parser {

  constructor (text) {
    this.unparsed = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    this.columnIndex = 0; // 0 based
    this.lineIndex = 0;  // 0 based
  }


  // Remove all characters with code points <= U+0020 at the beginning of the unparsed string.
  consumeOptionalWhitespace () {
    while (true) {
      // remove all code points <= U+0020 except '\n'
      let i = 0;
      while (i < this.unparsed.length && this.unparsed.charCodeAt(i) <= 0x20 && this.unparsed[i] != '\n')
        i += 1;
      this.unparsed = this.unparsed.substring(i);
      this.columnIndex += i;

      // remove '\n'
      i = 0;
      while (i < this.unparsed.length && this.unparsed[i] == '\n')
        i += 1;
      if (i <= 0)
        break;
      this.unparsed = this.unparsed.substring(i);
      this.columnIndex = 0;
      this.lineIndex += i;
    }
  }


  // Consume unparsed text until before the first non-number character and parse it as a <number>.
  // A non-number character is any code point different from all of these:
  // "A" ... "Z", "a" ... "z", "0" ... "9", ".", "+", "-", "*", "/", "^", "_", "#".
  //
  // Returns [isNeg, mant, base, exp] as an exact representation of the parsed number, where base is
  // either 2n or 10n.
  // For a number != 0: Number is mant * base^exp, mant is != 0 and isNeg is true if and only
  // if mant < 0.
  // For a number = 0: mant is 0.
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

  consumeNumber () {  // -> IntegerWithPowerFactor(mant, powerBase, exp, isNeg) where powerBase is 2 or 10
    let pos = 0;  // relative to this.columnIndex

    // parse
    let isNeg = false;
    let mant = 1n;
    let mantBase = 10n;
    let mantDecimalPlaces = null;
    let mantDotPos = null;
    let powerBase = 10n;
    let exp = 0n;

    try {

      let invertExp = false;
      let expStr;
      let powerBaseStr;

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
            parseSimpleNumber(this.unparsed);
        pos += mantLength;
        expStr = this.unparsed.substring(pos);

        m = expStr.match(/^_?([*/])_?(2|10)\^/);
        if (m) {
          invertExp = m[1] == '/';
          powerBaseStr = m[2];
          expStr = expStr.substring(m[0].length);
          pos += m[0].length;
        } else if (expStr.match(/^[0-9A-Z_^*/+-]/)) {
          throw new InputError('unexpected in number', 0);
        }
      }

      // parse exponent
      if (expStr) {
        let expLength;
        [exp, expLength] = parseSimpleInteger(expStr);
        if (invertExp)
          exp = -exp;
        pos += expLength;
        powerBase = BigInt(powerBaseStr);
      }

    } catch (error) {
      if (!(error instanceof InputError))
        throw error;
      throw new error.constructor(
        error.message, this.columnIndex + pos + error.columnIndex, this.lineIndex);
    }

    // transform

    if (mantDecimalPlaces !== null) {
      // mantissa is mant / mantBase^mantDecimalPlaces with mantDecimalPlaces >= 0
      if (mant === 0n) {
        mantDecimalPlaces = 0n;
      } else {
        // normalize
        while (mant % mantBase == 0n) {
          mant /= mantBase;
          mantDecimalPlaces -= 1n;
        }
      }
      // mantissa is integer if and only iff mantDecimalPlaces = 0

      if (mantDecimalPlaces > 0n) {
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
          if (mantBase !== 1n)
            throw new InputError(
              `non-integer mantissa in base ${mantBase} cannot be ` +
              `represented exactly in base ${powerBase}`,
              this.columnIndex + (mantDotPos || 0), this.lineIndex);
      }
    }

    this.unparsed = this.unparsed.substring(pos);
    this.columnIndex += pos;

    return new IntegerWithPowerFactor(mant, powerBase, exp, isNeg);
  }

}

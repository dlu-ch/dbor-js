// SPDX-License-Identifier: LGPL-3.0-or-later
// dbor-js - ECMAScript 2020 implementation of DBOR encoder
// Copyright (C) 2020 Daniel Lutz <dlu-ch@users.noreply.github.com>

// https://www.ecma-international.org/ecma-262/11.0/

// https://mochajs.org/
// https://www.chaijs.com/api/assert/

var assert = chai.assert;

describe('parser helpers', function () {

  describe('IntegerWithExpFactor', function () {
    it('positive integer', function () {
      let n = new textobj.IntegerWithExpFactor(123);
      assert.isTrue(n.mant == 123n);
      assert.isTrue(n.exp == 0n);
      assert.isNull(n.base);
      assert.isFalse(n.isNeg);
    });

    it('negative integer', function () {
      let n = new textobj.IntegerWithExpFactor(-123);
      assert.isTrue(n.mant == -123n);
      assert.isTrue(n.exp == 0n);
      assert.isNull(n.base);
      assert.isTrue(n.isNeg);
    });

    it('zero', function () {
      let n = new textobj.IntegerWithExpFactor();
      assert.isTrue(n.mant == 0n);
      assert.isTrue(n.exp == 0n);
      assert.isNull(n.base);
      assert.isFalse(n.isNeg);
    });

    it('negative integer by power of 2', function () {
      let n = new textobj.IntegerWithExpFactor(-123, 2, -45, false);
      assert.isTrue(n.mant == -123n);
      assert.isTrue(n.exp == -45n);
      assert.isTrue(n.base == 2n);
      assert.isTrue(n.isNeg);
    });
  });


  describe('makeIndexRelativeToLine()', function () {
    it('empty', function () {
      assert.deepEqual(textobj.makeIndexRelativeToLine(0, ''), [0, 0]);
      assert.deepEqual(textobj.makeIndexRelativeToLine(123, ''), [0, 123]);
      assert.deepEqual(textobj.makeIndexRelativeToLine(123, ''), [0, 123]);
    });

    it('CR LF', function () {
      assert.deepEqual(textobj.makeIndexRelativeToLine(0, 'a\r\n\n\r\r\n\nb'), [0, 0]);
      assert.deepEqual(textobj.makeIndexRelativeToLine(1, 'a\r\n\n\r\r\n\nb'), [0, 1]);

      assert.deepEqual(textobj.makeIndexRelativeToLine(2, 'a\r\n\n\r\r\n\nb'), [1, 0]);
      assert.deepEqual(textobj.makeIndexRelativeToLine(3, 'a\r\n\n\r\r\n\nb'), [1, 0]);
                                                       //   ^^^^ CR LF

      assert.deepEqual(textobj.makeIndexRelativeToLine(4, 'a\r\n\n\r\r\n\nb'), [2, 0]);

      assert.deepEqual(textobj.makeIndexRelativeToLine(5, 'a\r\n\n\r\r\n\nb'), [3, 0]);

      assert.deepEqual(textobj.makeIndexRelativeToLine(6, 'a\r\n\n\r\r\n\nb'), [4, 0]);
      assert.deepEqual(textobj.makeIndexRelativeToLine(7, 'a\r\n\n\r\r\n\nb'), [4, 0]);
                                                       //           ^^^^ CR LF

      assert.deepEqual(textobj.makeIndexRelativeToLine(8, 'a\r\n\n\r\r\n\nb'), [5, 0]);
      assert.deepEqual(textobj.makeIndexRelativeToLine(9, 'a\r\n\n\r\r\n\nb'), [5, 1]);
      assert.deepEqual(textobj.makeIndexRelativeToLine(10, 'a\r\n\n\r\r\n\nb'), [5, 10 - 8]);
      assert.deepEqual(textobj.makeIndexRelativeToLine(100, 'a\r\n\n\r\r\n\nb'), [5, 100 - 8]);
    });
  });

  describe('parseSimpleNumber()', function () {

    describe('valid', function () {

      it('decimal integer', function () {
        const [isNeg, value, base, decimalPlaces, dotPos, parsedLength] =
            textobj.parseSimpleNumber('-1_23_');
        assert.isTrue(isNeg);
        assert.isTrue(value == -123n);
        assert.isTrue(base == 10n);
        assert.isNull(decimalPlaces);
        assert.equal(dotPos, null);
        assert.equal(parsedLength, 5);
      });

      it('decimal non-integer', function () {
        const [isNeg, value, base, decimalPlaces, dotPos, parsedLength] =
            textobj.parseSimpleNumber('1_2.34_5_');
        assert.isFalse(isNeg);
        assert.isTrue(value == 12345n);
        assert.isTrue(base == 10n);
        assert.isTrue(decimalPlaces == 3n);
        assert.equal(dotPos, 3);
        assert.equal(parsedLength, 8);
      });

      it('binary non-integer', function () {
        const [isNeg, value, base, decimalPlaces, dotPos, parsedLength] =
            textobj.parseSimpleNumber('-2#10.001_011');
        assert.isTrue(isNeg);
        assert.isTrue(value == -0b10001011n);
        assert.isTrue(base == 2n);
        assert.isTrue(decimalPlaces == 6n);
        assert.equal(dotPos, 5);
        assert.equal(parsedLength, 13);
      });

      it('base 36 non-integer', function () {
        const [isNeg, value, base, decimalPlaces, dotPos, parsedLength] =
            textobj.parseSimpleNumber('36#Z.Z');
        assert.isFalse(isNeg);
        assert.isTrue(value == 35n * 36n + 35n);
        assert.isTrue(base == 36n);
        assert.isTrue(decimalPlaces == 1n);
        assert.equal(dotPos, 4);
        assert.equal(parsedLength, 6);
      });

    });

    describe('invalid', function () {

      it('empty', function () {
        try {
          textobj.parseSimpleNumber('');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'missing number');
          assert.equal(error.index, 0);
        }
      });

      it('only sign', function () {
        try {
          textobj.parseSimpleNumber('-');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'missing number');
          assert.equal(error.index, 0);
        }
      });

      it('starts with non-decimal digit', function () {
        try {
          textobj.parseSimpleNumber('A');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'missing number');
          assert.equal(error.index, 0);
        }
      });

      it('starts with _', function () {
        try {
          textobj.parseSimpleNumber('_');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'missing number');
          assert.equal(error.index, 0);
        }
      });

      it('starts with .', function () {
        try {
          textobj.parseSimpleNumber('.');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'missing number');
          assert.equal(error.index, 0);
        }
      });

      it('non-decimal digit', function () {
        try {
          textobj.parseSimpleNumber('123A3');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'invalid digit for base 10 number');
          assert.equal(error.index, 3);
        }
      });

      it('consecutive _', function () {
        try {
          textobj.parseSimpleNumber('1_2__3');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, "surplus '_' in number");
          assert.equal(error.index, 4);
        }
      });

      it('_ after .', function () {
        try {
          textobj.parseSimpleNumber('1_2._3');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, "missing digit after '.'");
          assert.equal(error.index, 4);
        }
      });

      it('multiple .', function () {
        try {
          textobj.parseSimpleNumber('1_2.4.5');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, "surplus '.' in number")
          assert.equal(error.index, 5);
        }
      });

      it('. in base', function () {
        try {
          textobj.parseSimpleNumber('-1.2#');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, "invalid in number base: '.'")
          assert.equal(error.index, 2);
        }
      });

      it('_ in base', function () {
        try {
          textobj.parseSimpleNumber('-1_2#');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, "invalid in number base: '_'")
          assert.equal(error.index, 2);
        }
      });

      it('base too small', function () {
        try {
          textobj.parseSimpleNumber('1#0');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, "number base must be 2 .. 36, not 1");
          assert.equal(error.index, 0);
        }
      });

      it('base too great', function () {
        try {
          textobj.parseSimpleNumber('-37#0');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, "number base must be 2 .. 36, not 37");
          assert.equal(error.index, 1);
        }
      });

      it('base much too great', function () {
        try {
          textobj.parseSimpleNumber('999999999999999999999999999999999999#0');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message,
                       "number base must be 2 .. 36, not 999999999999999999999999999999999999");
          assert.equal(error.index, 0);
        }
      });

      it('invalid digit', function () {
        try {
          textobj.parseSimpleNumber('16#ABCDEFGH');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'invalid digit for base 16 number');
          assert.equal(error.index, 9);
        }
      });

      it('ends with .', function () {
        try {
          textobj.parseSimpleNumber('1_2.');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, "missing digit after '.'");
          assert.equal(error.index, 4);
        }
      });

      it('ends with #', function () {
        try {
          textobj.parseSimpleNumber('12#');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, "missing digit after '#'");
          assert.equal(error.index, 3);
        }
      });

      it('multiple #', function () {
        try {
          textobj.parseSimpleNumber('8#777#');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, "surplus '#' in number");
          assert.equal(error.index, 5);
        }
      });

    });

  });

});


describe('Parser', function () {
  describe('construction', function () {
    it('line separators', function () {
      let p = new textobj.Parser('a\r\nb\rc\n\r\n');
      assert.equal(p.unparsed, 'a\r\nb\rc\n\r\n')
    });

    it('indices are 0', function () {
      let p = new textobj.Parser('');
      assert.equal(p.index, 0);
    });
  });

  describe('consumeOptionalWhitespace()', function () {
    it('empty', function () {
      let p = new textobj.Parser('');
      assert.equal(p.unparsed, '')
      assert.equal(p.index, 0);

      p.consumeOptionalWhitespace();
      assert.equal(p.unparsed, '')
      assert.equal(p.index, 0);
    });

    it('non-empty', function () {
      let p = new textobj.Parser('\n\t  \n \b x');
      p.consumeOptionalWhitespace();
      assert.equal(p.unparsed, 'x')
      assert.equal(p.index, 8);
    });

  });

  describe('consumeNumber()', function () {

    describe('valid', function () {

      it('negative decimal integer', function () {
        let p = new textobj.Parser('-10232');
        const n = p.consumeNumber();

        assert.isTrue(n.isNeg);
        assert.isTrue(n.mant == -10232n);
        assert.isNull(n.base);
        assert.isTrue(n.exp == 0n);

        assert.equal(p.unparsed, '');
        assert.equal(p.index, 6);
      });

      it('negative hexdecimal integer', function () {
        let p = new textobj.Parser('-16#DEAD_BEEF');
        const n = p.consumeNumber();

        assert.isTrue(n.isNeg);
        assert.isTrue(n.mant == -0xDEADBEEFn);
        assert.isNull(n.base);
        assert.isTrue(n.exp == 0n);

        assert.equal(p.unparsed, '')
        assert.equal(p.index, 13);
      });

      it('positive power of ten', function () {
        let p = new textobj.Parser('10^-10232');
        const n = p.consumeNumber();

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 1n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == -10232n);

        assert.equal(p.unparsed, '');
        assert.equal(p.index, 9);
      });

      it('negative power of ten', function () {
        let p = new textobj.Parser('-10^10232');
        const n = p.consumeNumber();

        assert.isTrue(n.isNeg);
        assert.isTrue(n.mant == -1n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == 10232n);

        assert.equal(p.unparsed, '');
        assert.equal(p.index, 9);
      });

      it('non-integer decimal mantissa (gets normalized)', function () {
        let p = new textobj.Parser('12.340_000_*_10^5');
        const n = p.consumeNumber();

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 1234n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == 3n);

        assert.equal(p.unparsed, '');
        assert.equal(p.index, 17);
      });

      it('non-integer decimal mantissa (*)', function () {
        let p = new textobj.Parser('123400_*_10^1');
        const n = p.consumeNumber();

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 123400n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == 1n);

        assert.equal(p.unparsed, '');
        assert.equal(p.index, 13);
      });

      it('non-integer decimal mantissa (/)', function () {
        let p = new textobj.Parser('123400_/_10^-5');
        const n = p.consumeNumber();

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 123400n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == 5n);

        assert.equal(p.unparsed, '');
        assert.equal(p.index, 14);
      });

      it('integer base 3 mantissa', function () {
        let p = new textobj.Parser('3#12.00_*_10^1');
        const n = p.consumeNumber();

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 5n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == 1n);

        assert.equal(p.unparsed, '');
        assert.equal(p.index, 14);
      });

      it('non-integer base 5 mantissa', function () {
        let p = new textobj.Parser('5#12.34_*_10^1');
        const n = p.consumeNumber();
        // 194 / 5^2 * 10^1 = 194 * 2^2 / 10^2 * 10^1 = 776 * 10^-1

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 776n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == -1n);

        assert.equal(p.unparsed, '');
        assert.equal(p.index, 14);
      });

      it('non-integer base 8 mantissa', function () {
        let p = new textobj.Parser('8#12.34_*_10^1');
        const n = p.consumeNumber();
        // 668 / 8^2 * 10^1 = 668 * 5^6 / 10^6 * 10^1 = 10437500 * 10^-5 = 104375 * 10^-3

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 104375n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == -3n);

        assert.equal(p.unparsed, '');
        assert.equal(p.index, 14);
      });

      it('non-integer base 20 mantissa', function () {
        let p = new textobj.Parser('20#12.34_*_10^1');
        const n = p.consumeNumber();
        // 8864 / 20^2 * 10^1 = 8864 * 5^2 / 10^4 * 10^1 = 8864 * 5^2 * 10^-3 = 2216 * 10^-1

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 2216n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == -1n);

        assert.equal(p.unparsed, '');
        assert.equal(p.index, 15);
      });

      it('non-integer base 10 mantissa', function () {
        let p = new textobj.Parser('6.125*2^7');
        const n = p.consumeNumber();
        // 6125 / 10^3 * 2^7 = 6125 / 5^3 * 2^4 = 49 * 2^4

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 49n);
        assert.isTrue(n.base == 2n);
        assert.isTrue(n.exp == 4n);

        assert.equal(p.unparsed, '');
        assert.equal(p.index, 9);
      });

      it('zero mantissa with non-zero exponent', function () {
        let p = new textobj.Parser('-0.000*2^7');
        const n = p.consumeNumber();

        assert.isTrue(n.isNeg);
        assert.isTrue(n.mant == 0n);
        assert.isTrue(n.base == 2n);
        assert.isTrue(n.exp == 0n);

        assert.equal(p.unparsed, '');
        assert.equal(p.index, 10);
      });

    });

    describe('invalid', function () {

      it('empty', function () {
        let p = new textobj.Parser('\n ');
        p.consumeOptionalWhitespace();
        try {
            p.consumeNumber()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
        }
        assert.equal(p.index, 2);
      });

      it('non-integer base 3 mantissa', function () {
        let p = new textobj.Parser('\n -3#12.01_*_10^1');
        p.consumeOptionalWhitespace();
        try {
          p.consumeNumber();
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message,
                       'non-integer mantissa in base 3 cannot be represented exactly in base 10');
          assert.equal(error.index, 2 + 5);
        }
        assert.equal(p.index, 2 + 15);
      });

      it('syntax error in mantissa', function () {
        let p = new textobj.Parser('\n +2#12.3*10^3');
        p.consumeOptionalWhitespace();
        try {
          p.consumeNumber();
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'invalid digit for base 2 number');
          assert.equal(error.index, 2 + 4);
        }
        assert.equal(p.index, 2);
      });

      it('syntax error in exponent', function () {
        let p = new textobj.Parser('\n -1.23_*_10^+2#123');
        p.consumeOptionalWhitespace();
        try {
          p.consumeNumber();
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'invalid digit for base 2 number');
          assert.equal(error.index, 2 + 15);
        }
        assert.equal(p.index, 2 + 11);
      });

      it('syntax error in exponent (without mantissa)', function () {
        let p = new textobj.Parser('\n +10^2#123');
        p.consumeOptionalWhitespace();
        try {
          p.consumeNumber();
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'invalid digit for base 2 number');
          assert.equal(error.index, 2 + 7);
        }
        assert.equal(p.index, 2 + 4);
      });

      it('syntax error between mantissa and exponent', function () {
        let p = new textobj.Parser('\n 1.23_*/10^2#123');
        p.consumeOptionalWhitespace();
        try {
          p.consumeNumber();
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'missing digit or exponentiation factor');
          assert.equal(error.index, 2 + 4);
        }
        assert.equal(p.index, 2 + 4);
      });

    });

    describe('base or no base?', function () {
      it('zero', function () {
        assert.isNull(new textobj.Parser('0').consumeNumber().base);
        assert.isTrue(new textobj.Parser('0.0').consumeNumber().base == 10n);
        assert.isTrue(new textobj.Parser('0*10^0').consumeNumber().base == 10n);
      });

      it('non-zero', function () {
        assert.isNull(new textobj.Parser('123').consumeNumber().base);
        assert.isTrue(new textobj.Parser('16#12.3').consumeNumber().base == 10n);
        assert.isTrue(new textobj.Parser('12*10^3').consumeNumber().base == 10n);
      });
    });

    describe('partial', function () {
      it('stops before ,', function () {
        const p = new textobj.Parser('123,');
        const n = p.consumeNumber();
        assert.equal(p.index, 3);
      });
    });
  });

  describe('consumeSpecialLiteral()', function () {

    describe('valid', function () {
      it('None', function () {
        let p = new textobj.Parser('None');
        let o = p.consumeSpecialLiteral();
        assert.equal(o.literal, 'None');
        assert.equal(p.index, 4);
      });

      it('Inf', function () {
        let p = new textobj.Parser('Inf ');
        let o = p.consumeSpecialLiteral();
        assert.equal(o.literal, 'Infinity');
        assert.equal(p.index, 3);
      });

      it('+Inf', function () {
        let p = new textobj.Parser('+Inf');
        let o = p.consumeSpecialLiteral();
        assert.equal(o.literal, 'Infinity');
        assert.equal(p.index, 4);
      });

      it('-Inf', function () {
        let p = new textobj.Parser('-Inf,');
        let o = p.consumeSpecialLiteral();
        assert.equal(o.literal, 'MinusInfinity');
        assert.equal(p.index, 4);
      });

    });

    describe('invalid', function () {
      it('+None', function () {
        let p = new textobj.Parser('\n +None');
        p.consumeOptionalWhitespace();
        try {
          p.consumeSpecialLiteral();
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'unknown literal');
          assert.equal(error.index, 2 + 0);
        }
        assert.equal(p.index, 2);
      });

      it('non-letter suffix', function () {
        let p = new textobj.Parser('\n None_123');
        p.consumeOptionalWhitespace();
        try {
          p.consumeSpecialLiteral();
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'unknown literal');
          assert.equal(error.index, 2 + 0);
        }
        assert.equal(p.index, 2);
      });

    });

  });

  describe('consumeUnicodeString()', function () {

    describe('valid', function () {
      it('empty', function () {
        let p = new textobj.Parser('""');
        let s = p.consumeUnicodeString();
        assert.instanceOf(s, textobj.UnicodeString);
        assert.equal(s.value, '');
        assert.equal(p.index, 2);
      });

      it('non-reserved ASCII only', function () {
        let p = new textobj.Parser('"a bc"');
        let s = p.consumeUnicodeString();
        assert.equal(s.value, 'a bc');
        assert.equal(p.index, 2 + s.value.length);
      });

      it('valid unicode and escaped braces', function () {
        const input = '"a{0}\\{{b}}\u{10FFFF}c"';
        let p = new textobj.Parser(input);
        let s = p.consumeUnicodeString();
        assert.equal(s.value, 'a\0\\{b}\u{10FFFF}c'); // 8 codepoints, 9 UTF-16 code units
        assert.equal(p.index, input.length);
      });

      it('code point in braces', function () {
        let p = new textobj.Parser('"a{16#10FFFF}b"');
        let s = p.consumeUnicodeString();
        assert.equal(s.value, 'a\u{10FFFF}b'); // 3 codepoints, 4 UTF-16 code units
        assert.equal(p.index, 15);
      });

    });

    describe('invalid', function () {

      it('missing "', function () {
        let p = new textobj.Parser('\n "');
        p.consumeOptionalWhitespace();
        try {
            p.consumeUnicodeString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "missing '\"'");
            assert.equal(error.index, 2 + 1);
        }
        assert.equal(p.index, 2 + 1);
      });

      it('missing }', function () {
        let p = new textobj.Parser('\n "}"');
        p.consumeOptionalWhitespace();
        try {
            p.consumeUnicodeString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "missing '}'");
            assert.equal(error.index, 2 + 2);
        }
        assert.equal(p.index, 2 + 2);
      });

      it('missing {', function () {
        let p = new textobj.Parser('\n "{"');
        p.consumeOptionalWhitespace();
        try {
            p.consumeUnicodeString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "missing '{' or code point as integer number");
            assert.equal(error.index, 2 + 2);
        }
        assert.equal(p.index, 2 + 2);
      });

      it('non-integer codepoint', function () {
        let p = new textobj.Parser('\n "{1.23}"');
        p.consumeOptionalWhitespace();
        try {
            p.consumeUnicodeString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "invalid in integer number: '.'");
            assert.equal(error.index, 2 + 3);
        }
        assert.equal(p.index, 2 + 2);
      });

      it('invalid codepoint: surrogate', function () {
        let p = new textobj.Parser('\n "{16#D800}"');
        p.consumeOptionalWhitespace();
        try {
            p.consumeUnicodeString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "number invalid as Unicode code point");
            assert.equal(error.index, 2 + 2);
        }
        assert.equal(p.index, 2 + 2);
      });

      it('invalid codepoint: negative', function () {
        let p = new textobj.Parser('\n "{-42}"');
        p.consumeOptionalWhitespace();
        try {
            p.consumeUnicodeString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "number invalid as Unicode code point");
            assert.equal(error.index, 2 + 2);
        }
        assert.equal(p.index, 2 + 2);
      });

      it('control character', function () {
        let p = new textobj.Parser('\n "a\n"');
        p.consumeOptionalWhitespace();
        try {
            p.consumeUnicodeString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "invalid raw control character - use '{16#A}' instead");
            assert.equal(error.index, 2 + 2);
        }
        assert.equal(p.index, 2 + 2);
      });


    });

  });

  describe('consumeByteString()', function () {

    describe('valid', function () {
      it('empty', function () {
        let p = new textobj.Parser('<>');
        let s = p.consumeByteString();
        assert.instanceOf(s, textobj.ByteString);
        assert.deepEqual(s.value, new Uint8Array());
        assert.equal(p.index, 2);
      });

      it('non-empty', function () {
        const input = '<\n  2#1111_0101,0 \0, \t 16#FF >';
        let p = new textobj.Parser(input);
        let s = p.consumeByteString();
        assert.deepEqual(s.value, new Uint8Array([0xF5, 0x00, 0xFF]));
        assert.equal(p.index, input.length);
      });
    });

    describe('invalid', function () {
      it('missing >', function () {
        let p = new textobj.Parser('\n <123');
        p.consumeOptionalWhitespace();
        try {
            p.consumeByteString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "missing '>'");
            assert.equal(error.index, 2 + 4);
        }
        assert.equal(p.index, 2 + 4);
      });

      it('missing >', function () {
        let p = new textobj.Parser('\n <123 <');
        p.consumeOptionalWhitespace();
        try {
            p.consumeByteString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "missing ','");
            assert.equal(error.index, 2 + 5);
        }
        assert.equal(p.index, 2 + 5);
      });

      it('missing number', function () {
        let p = new textobj.Parser('\n <\n');
        p.consumeOptionalWhitespace();
        try {
            p.consumeByteString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, 'missing number');
            assert.equal(error.index, 2 + 2);
        }
        assert.equal(p.index, 2 + 2);

        p = new textobj.Parser('\n <123 , >');
        p.consumeOptionalWhitespace();
        try {
            p.consumeByteString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, 'missing number');
            assert.equal(error.index, 2 + 7);
        }
        assert.equal(p.index, 2 + 7);
      });

      it('number out of range', function () {
        let p = new textobj.Parser('\n <123, -1>');
        p.consumeOptionalWhitespace();
        try {
            p.consumeByteString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, 'number outside range 0 .. 255');
            assert.equal(error.index, 2 + 6);
        }
        assert.equal(p.index, 2 + 6);

        p = new textobj.Parser('\n <123, 256>');
        p.consumeOptionalWhitespace();
        try {
            p.consumeByteString()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, 'number outside range 0 .. 255');
            assert.equal(error.index, 2 + 6);
        }
        assert.equal(p.index, 2 + 6);
      });

    });

  });

  describe('consumeSequence()', function () {

    describe('valid', function () {
      it('empty', function () {
        let p = new textobj.Parser('[]');
        let s = p.consumeSequence();
        assert.instanceOf(s, textobj.Sequence);
        let po = s.parsedObjects;
        assert.deepEqual(po, []);
        assert.equal(p.index, 2);
      });

      it('non-empty, flat', function () {
        let p = new textobj.Parser('[ 1, None  , <0>,"abc"  ]');
        let s = p.consumeSequence();

        assert.instanceOf(s, textobj.Sequence);
        let po = s.parsedObjects;

        assert.equal(po.length, 4);
        assert.deepEqual(po[0], new textobj.InputRange(2, 1, new textobj.IntegerWithExpFactor(1n, null, 0n, false)));
        assert.deepEqual(po[1], new textobj.InputRange(5, 4, new textobj.SpecialLiteral('None')));
        assert.deepEqual(po[2], new textobj.InputRange(13, 3, new textobj.ByteString([0])));
        assert.deepEqual(po[3], new textobj.InputRange(17, 5, new textobj.UnicodeString('abc')));

        assert.equal(p.index, 25);
      });

      it('non-empty, nested', function () {
        let p = new textobj.Parser('["1", ["2", [[], "3"]]]]');
        let s = p.consumeSequence();

        assert.instanceOf(s, textobj.Sequence);

        assert.equal(s.parsedObjects.length, 2);
        assert.deepEqual(s.parsedObjects[0].object, new textobj.UnicodeString('1'));
        s = s.parsedObjects[1].object;
        assert.instanceOf(s, textobj.Sequence);

        assert.equal(s.parsedObjects.length, 2);
        assert.deepEqual(s.parsedObjects[0].object, new textobj.UnicodeString('2'));
        s = s.parsedObjects[1].object;
        assert.instanceOf(s, textobj.Sequence);

        assert.equal(s.parsedObjects.length, 2);
        assert.deepEqual(s.parsedObjects[1].object, new textobj.UnicodeString('3'));
        s = s.parsedObjects[0].object;
        assert.instanceOf(s, textobj.Sequence);
        assert.deepEqual(s.parsedObjects, []);

        assert.equal(p.index, 23);
      });

    });

    describe('invalid', function () {
      it('missing ]', function () {
        let p = new textobj.Parser('\n [123');
        p.consumeOptionalWhitespace();
        try {
            p.consumeSequence()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "missing ']'");
            assert.equal(error.index, 2 + 4);
        }
        assert.equal(p.index, 2 + 4);
      });

      it('missing object', function () {
        let p = new textobj.Parser('\n [\n');
        p.consumeOptionalWhitespace();
        try {
            p.consumeSequence()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, 'missing object');
            assert.equal(error.index, 2 + 2);
        }
        assert.equal(p.index, 2 + 2);

        p = new textobj.Parser('\n [123 , ]');
        p.consumeOptionalWhitespace();
        try {
            p.consumeSequence()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, 'missing object');
            assert.equal(error.index, 2 + 7);
        }
        assert.equal(p.index, 2 + 7);
      });
    });

  });

  describe('consumeDictionary()', function () {

    describe('valid', function () {
      it('empty', function () {
        let p = new textobj.Parser('{}');
        let s = p.consumeDictionary();
        assert.instanceOf(s, textobj.Dictionary);
        let po = s.parsedObjectPairs;
        assert.deepEqual(po, []);
        assert.equal(p.index, 2);
      });
    });

    it('non-empty, flat', function () {
      let p = new textobj.Parser('{ 3:None  , 1:<0>  }');
      let s = p.consumeDictionary();

      assert.instanceOf(s, textobj.Dictionary);
      let po = s.parsedObjectPairs;

      assert.equal(po.length, 2);
      assert.deepEqual(po[0], [
        new textobj.InputRange(2, 1, new textobj.IntegerWithExpFactor(3n, null, 0n, false)),
        new textobj.InputRange(4, 4, new textobj.SpecialLiteral('None'))
      ]);
      assert.deepEqual(po[1], [
        new textobj.InputRange(12, 1, new textobj.IntegerWithExpFactor(1n, null, 0n, false)),
        new textobj.InputRange(14, 3, new textobj.ByteString([0]))
      ]);

      assert.equal(p.index, 20);
    });

    describe('invalid', function () {
      it('missing :', function () {
        let p = new textobj.Parser('\n {123');
        p.consumeOptionalWhitespace();
        try {
            p.consumeDictionary()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "missing ':'");
            assert.equal(error.index, 2 + 4);
        }
        assert.equal(p.index, 2 + 4);
      });

      it('missing }', function () {
        let p = new textobj.Parser('\n {123:4');
        p.consumeOptionalWhitespace();
        try {
            p.consumeDictionary()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "missing '}'");
            assert.equal(error.index, 2 + 6);
        }
        assert.equal(p.index, 2 + 6);
      });

      it('missing object', function () {
        let p = new textobj.Parser('\n {\n');
        p.consumeOptionalWhitespace();
        try {
            p.consumeDictionary()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, 'missing object');
            assert.equal(error.index, 2 + 2);
        }
        assert.equal(p.index, 2 + 2);

        p = new textobj.Parser('\n {123: 4, }');
        p.consumeOptionalWhitespace();
        try {
            p.consumeDictionary()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, 'missing object');
            assert.equal(error.index, 2 + 9);
        }
        assert.equal(p.index, 2 + 9);
      });
    });
  });

  describe('consumeAllocator()', function () {

    describe('valid', function () {
      it('typical', function () {
        let p = new textobj.Parser('( [1, 2, 3] )&45');
        let a = p.consumeAllocator();
        assert.instanceOf(a, textobj.Allocator);
        let co = a.containedObject;
        assert.instanceOf(co.object, textobj.Sequence);
        assert.equal(a.maxContainedSize, 45);
        assert.equal(a.sizeInputIndex, 14);
        assert.equal(p.index, 16);
      });
    });

    describe('invalid', function () {

      it('missing object', function () {
        let p = new textobj.Parser('\n (\n');
        p.consumeOptionalWhitespace();
        try {
            p.consumeAllocator()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, 'missing object');
            assert.equal(error.index, 2 + 2);
        }
        assert.equal(p.index, 2 + 2);

        p = new textobj.Parser('\n ()&1\n');
        p.consumeOptionalWhitespace();
        try {
            p.consumeAllocator()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, 'missing object');
            assert.equal(error.index, 2 + 1);
        }
        assert.equal(p.index, 2 + 1);
      });

      it('missing )', function () {
        let p = new textobj.Parser('\n (1, 2)&3');
        p.consumeOptionalWhitespace();
        try {
            p.consumeAllocator()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "missing ')'");
            assert.equal(error.index, 2 + 2);
        }
        assert.equal(p.index, 2 + 2);
      });

      it('missing &', function () {
        let p = new textobj.Parser('\n (1)2');
        p.consumeOptionalWhitespace();
        try {
            p.consumeAllocator()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, "missing '&'");
            assert.equal(error.index, 2 + 3);
        }
        assert.equal(p.index, 2 + 3);
      });

      it('non-positive size', function () {
        let p = new textobj.Parser('\n (1)&0');
        p.consumeOptionalWhitespace();
        try {
            p.consumeAllocator()
        } catch (error) {
            assert.instanceOf(error, textobj.InputError);
            assert.equal(error.message, 'invalid as maximum size');
            assert.equal(error.index, 2 + 4);
        }
        assert.equal(p.index, 2 + 4);
      });

    });

  });

});

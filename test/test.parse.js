// SPDX-License-Identifier: LGPL-3.0-or-later
// dbor-js - ECMAScript 2020 implementation of DBOR encoder
// Copyright (C) 2020 Daniel Lutz <dlu-ch@users.noreply.github.com>

// https://www.ecma-international.org/ecma-262/11.0/

// https://mochajs.org/
// https://www.chaijs.com/api/assert/

var assert = chai.assert;

describe('parser helpers', function () {

  describe('IntegerWithPowerFactor', function () {
    it('positive integer', function () {
      let n = new IntegerWithPowerFactor(123);
      assert.isTrue(n.mant == 123n);
      assert.isTrue(n.exp == 0n);
      assert.isTrue(n.base == 10n);
      assert.isFalse(n.isNeg);
    });

    it('negative integer', function () {
      let n = new IntegerWithPowerFactor(-123);
      assert.isTrue(n.mant == -123n);
      assert.isTrue(n.exp == 0n);
      assert.isTrue(n.base == 10n);
      assert.isTrue(n.isNeg);
    });

    it('zero', function () {
      let n = new IntegerWithPowerFactor();
      assert.isTrue(n.mant == 0n);
      assert.isTrue(n.exp == 0n);
      assert.isTrue(n.base == 10n);
      assert.isFalse(n.isNeg);
    });

    it('negative integer by power of 2', function () {
      let n = new IntegerWithPowerFactor(-123, 2, -45, false);
      assert.isTrue(n.mant == -123n);
      assert.isTrue(n.exp == -45n);
      assert.isTrue(n.base == 2n);
      assert.isTrue(n.isNeg);
    });
  });

  describe('parseSimpleNumber()', function () {

    describe('valid', function () {

      it('decimal integer', function () {
        const [isNeg, value, base, decimalPlaces, dotPos, parsedLength] =
            parseSimpleNumber('-1_23_');
        assert.isTrue(isNeg);
        assert.isTrue(value == -123n);
        assert.isTrue(base == 10n);
        assert.isNull(decimalPlaces);
        assert.equal(dotPos, null);
        assert.equal(parsedLength, 5);
      });

      it('decimal non-integer', function () {
        const [isNeg, value, base, decimalPlaces, dotPos, parsedLength] =
            parseSimpleNumber('1_2.34_5_');
        assert.isFalse(isNeg);
        assert.isTrue(value == 12345n);
        assert.isTrue(base == 10n);
        assert.isTrue(decimalPlaces == 3n);
        assert.equal(dotPos, 3);
        assert.equal(parsedLength, 8);
      });

      it('binary non-integer', function () {
        const [isNeg, value, base, decimalPlaces, dotPos, parsedLength] =
            parseSimpleNumber('-2#10.001_011');
        assert.isTrue(isNeg);
        assert.isTrue(value == -0b10001011n);
        assert.isTrue(base == 2n);
        assert.isTrue(decimalPlaces == 6n);
        assert.equal(dotPos, 5);
        assert.equal(parsedLength, 13);
      });

      it('base 36 non-integer', function () {
        const [isNeg, value, base, decimalPlaces, dotPos, parsedLength] =
            parseSimpleNumber('36#Z.Z');
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
          parseSimpleNumber('');
        } catch (error) {
          assert.instanceOf(error, InputTypeError);
          assert.equal(error.message, 'not a number');
          assert.equal(error.columnIndex, 0);
        }
      });

      it('only sign', function () {
        try {
          parseSimpleNumber('-');
        } catch (error) {
          assert.instanceOf(error, InputTypeError);
          assert.equal(error.message, 'not a number');
          assert.equal(error.columnIndex, 0);
        }
      });

      it('starts with non-decimal digit', function () {
        try {
          parseSimpleNumber('A');
        } catch (error) {
          assert.instanceOf(error, InputTypeError);
          assert.equal(error.message, 'not a number');
          assert.equal(error.columnIndex, 0);
        }
      });

      it('starts with _', function () {
        try {
          parseSimpleNumber('_');
        } catch (error) {
          assert.instanceOf(error, InputTypeError);
          assert.equal(error.message, 'not a number');
          assert.equal(error.columnIndex, 0);
        }
      });

      it('starts with .', function () {
        try {
          parseSimpleNumber('.');
        } catch (error) {
          assert.instanceOf(error, InputTypeError);
          assert.equal(error.message, 'not a number');
          assert.equal(error.columnIndex, 0);
        }
      });

      it('non-decimal digit', function () {
        try {
          parseSimpleNumber('123A3');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message, 'invalid digit for base 10 number');
          assert.equal(error.columnIndex, 3);
        }
      });

      it('consecutive _', function () {
        try {
          parseSimpleNumber('1_2__3');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message, "surplus '_'");
          assert.equal(error.columnIndex, 4);
        }
      });

      it('_ after .', function () {
        try {
          parseSimpleNumber('1_2._3');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message, "missing digit after '.'");
          assert.equal(error.columnIndex, 4);
        }
      });

      it('multiple .', function () {
        try {
          parseSimpleNumber('1_2.4.5');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message, "surplus '.'")
          assert.equal(error.columnIndex, 5);
        }
      });

      it('. in base', function () {
        try {
          parseSimpleNumber('-1.2#');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message, "invalid in number base: '.'")
          assert.equal(error.columnIndex, 2);
        }
      });

      it('_ in base', function () {
        try {
          parseSimpleNumber('-1_2#');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message, "invalid in number base: '_'")
          assert.equal(error.columnIndex, 2);
        }
      });

      it('base too small', function () {
        try {
          parseSimpleNumber('1#0');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message, "number base must be 2 .. 36, not 1");
          assert.equal(error.columnIndex, 0);
        }
      });

      it('base too great', function () {
        try {
          parseSimpleNumber('-37#0');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message, "number base must be 2 .. 36, not 37");
          assert.equal(error.columnIndex, 1);
        }
      });

      it('base much too great', function () {
        try {
          parseSimpleNumber('999999999999999999999999999999999999#0');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message,
                       "number base must be 2 .. 36, not 999999999999999999999999999999999999");
          assert.equal(error.columnIndex, 0);
        }
      });

      it('invalid digit', function () {
        try {
          parseSimpleNumber('16#ABCDEFGH');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message, 'invalid digit for base 16 number');
          assert.equal(error.columnIndex, 9);
        }
      });

      it('ends with .', function () {
        try {
          parseSimpleNumber('1_2.');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message, "missing digit after '.'");
          assert.equal(error.columnIndex, 4);
        }
      });

      it('ends with #', function () {
        try {
          parseSimpleNumber('12#');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message, "missing digit after '#'");
          assert.equal(error.columnIndex, 3);
        }
      });

      it('multiple #', function () {
        try {
          parseSimpleNumber('8#777#');
        } catch (error) {
          assert.instanceOf(error, InputError);
          assert.equal(error.message, "surplus '#'");
          assert.equal(error.columnIndex, 5);
        }
      });

    });

  });

});


describe('Parser', function () {
  describe('construction', function () {
    it('line separators', function () {
      let p = new Parser('a\r\nb\rc\n\r\n');
      assert.equal(p.unparsed, 'a\nb\nc\n\n')
    });

    it('indices are 0', function () {
      let p = new Parser('');
      assert.equal(p.lineIndex, 0);
      assert.equal(p.columnIndex, 0);
    });
  });

  describe('consumeOptionalWhitespace()', function () {
    it('empty', function () {
      let p = new Parser('');
      assert.equal(p.unparsed, '')
      assert.equal(p.lineIndex, 0);
      assert.equal(p.columnIndex, 0);

      p.consumeOptionalWhitespace();
      assert.equal(p.unparsed, '')
      assert.equal(p.lineIndex, 0);
      assert.equal(p.columnIndex, 0);
    });

    it('non-empty', function () {
      let p = new Parser('\n\t  \n \b x');
      p.consumeOptionalWhitespace();
      assert.equal(p.unparsed, 'x')
      assert.equal(p.lineIndex, 2);
      assert.equal(p.columnIndex, 3);
    });

  });

  describe('consumeNumber()', function () {

    describe('valid', function () {

      it('negative decimal integer', function () {
        let p = new Parser('-10232');
        const n = p.consumeNumber();

        assert.isTrue(n.isNeg);
        assert.isTrue(n.mant == -10232n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == 0n);

        assert.equal(p.unparsed, '');
        assert.equal(p.columnIndex, 6);
        assert.equal(p.lineIndex, 0);
      });

      it('negative hexdecimal integer', function () {
        let p = new Parser('-16#DEAD_BEEF');
        const n = p.consumeNumber();

        assert.isTrue(n.isNeg);
        assert.isTrue(n.mant == -0xDEADBEEFn);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == 0n);

        assert.equal(p.unparsed, '')
        assert.equal(p.columnIndex, 13);
        assert.equal(p.lineIndex, 0);
      });

      it('positive power of ten', function () {
        let p = new Parser('10^-10232');
        const n = p.consumeNumber();

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 1n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == -10232n);

        assert.equal(p.unparsed, '');
        assert.equal(p.columnIndex, 9);
        assert.equal(p.lineIndex, 0);
      });

      it('negative power of ten', function () {
        let p = new Parser('-10^10232');
        const n = p.consumeNumber();

        assert.isTrue(n.isNeg);
        assert.isTrue(n.mant == -1n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == 10232n);

        assert.equal(p.unparsed, '');
        assert.equal(p.columnIndex, 9);
        assert.equal(p.lineIndex, 0);
      });

      it('non-integer decimal mantissa (gets normalized)', function () {
        let p = new Parser('12.340_000_*_10^5');
        const n = p.consumeNumber();

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 1234n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == 3n);

        assert.equal(p.unparsed, '');
        assert.equal(p.columnIndex, 17);
        assert.equal(p.lineIndex, 0);
      });

      it('non-integer decimal mantissa (*)', function () {
        let p = new Parser('123400_*_10^1');
        const n = p.consumeNumber();

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 123400n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == 1n);

        assert.equal(p.unparsed, '');
        assert.equal(p.columnIndex, 13);
        assert.equal(p.lineIndex, 0);
      });

      it('non-integer decimal mantissa (/)', function () {
        let p = new Parser('123400_/_10^-5');
        const n = p.consumeNumber();

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 123400n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == 5n);

        assert.equal(p.unparsed, '');
        assert.equal(p.columnIndex, 14);
        assert.equal(p.lineIndex, 0);
      });

      it('integer base 3 mantissa', function () {
        let p = new Parser('3#12.00_*_10^1');
        const n = p.consumeNumber();

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 5n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == 1n);

        assert.equal(p.unparsed, '');
        assert.equal(p.columnIndex, 14);
        assert.equal(p.lineIndex, 0);
      });

      it('non-integer base 5 mantissa', function () {
        let p = new Parser('5#12.34_*_10^1');
        const n = p.consumeNumber();
        // 194 / 5^2 * 10^1 = 194 * 2^2 / 10^2 * 10^1 = 776 * 10^-1

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 776n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == -1n);

        assert.equal(p.unparsed, '');
        assert.equal(p.columnIndex, 14);
        assert.equal(p.lineIndex, 0);
      });

      it('non-integer base 8 mantissa', function () {
        let p = new Parser('8#12.34_*_10^1');
        const n = p.consumeNumber();
        // 668 / 8^2 * 10^1 = 668 * 5^6 / 10^6 * 10^1 = 10437500 * 10^-5

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 10437500n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == -5n);

        assert.equal(p.unparsed, '');
        assert.equal(p.columnIndex, 14);
        assert.equal(p.lineIndex, 0);
      });

      it('non-integer base 20 mantissa', function () {
        let p = new Parser('20#12.34_*_10^1');
        const n = p.consumeNumber();
        // 8864 / 20^2 * 10^1 = 8864 * 5^2 / 10^4 * 10^1 = 8864 * 5^2 * 10^-3

        assert.isFalse(n.isNeg);
        assert.isTrue(n.mant == 221600n);
        assert.isTrue(n.base == 10n);
        assert.isTrue(n.exp == -3n);

        assert.equal(p.unparsed, '');
        assert.equal(p.columnIndex, 15);
        assert.equal(p.lineIndex, 0);
      });

    });

  });

  describe('invalid', function () {

    it('empty', function () {
      let p = new Parser('\n ');
      p.consumeOptionalWhitespace();
      try {
          p.consumeNumber()
      } catch (error) {
          assert.instanceOf(error, InputTypeError);
          assert.equal(error.columnIndex, 1);
          assert.equal(error.lineIndex, 1);
      }
      assert.equal(p.columnIndex, 1);
      assert.equal(p.lineIndex, 1);
    });

    it('non-integer base 3 mantissa', function () {
      let p = new Parser('\n -3#12.01_*_10^1');
      p.consumeOptionalWhitespace();
      try {
        p.consumeNumber();
      } catch (error) {
        assert.instanceOf(error, InputError);
        assert.equal(error.message,
                    "non-integer mantissa in base 3 cannot be represented exactly in base 10");
        assert.equal(error.columnIndex, 1 + 5);
        assert.equal(error.lineIndex, 1);
      }
      assert.equal(p.columnIndex, 1);
      assert.equal(p.lineIndex, 1);
    });

    it('syntax error in mantissa', function () {
      let p = new Parser('\n +2#12.3*10^3');
      p.consumeOptionalWhitespace();
      try {
        p.consumeNumber();
      } catch (error) {
        assert.instanceOf(error, InputError);
        assert.equal(error.message, 'invalid digit for base 2 number');
        assert.equal(error.columnIndex, 1 + 4);
        assert.equal(error.lineIndex, 1);
      }
      assert.equal(p.columnIndex, 1);
      assert.equal(p.lineIndex, 1);
    });

    it('syntax error in exponent', function () {
      let p = new Parser('\n -1.23_*_10^+2#123');
      p.consumeOptionalWhitespace();
      try {
        p.consumeNumber();
      } catch (error) {
        assert.instanceOf(error, InputError);
        assert.equal(error.message, 'invalid digit for base 2 number');
        assert.equal(error.columnIndex, 1 + 15);
        assert.equal(error.lineIndex, 1);
      }
      assert.equal(p.columnIndex, 1);
      assert.equal(p.lineIndex, 1);
    });

    it('syntax error in exponent (without mantissa)', function () {
      let p = new Parser('\n +10^2#123');
      p.consumeOptionalWhitespace();
      try {
        p.consumeNumber();
      } catch (error) {
        assert.instanceOf(error, InputError);
        assert.equal(error.message, 'invalid digit for base 2 number');
        assert.equal(error.columnIndex, 1 + 7);
        assert.equal(error.lineIndex, 1);
      }
      assert.equal(p.columnIndex, 1);
      assert.equal(p.lineIndex, 1);
    });

    it('syntax error between mantissa and exponent', function () {
      let p = new Parser('\n 1.23_*/10^2#123');
      p.consumeOptionalWhitespace();
      try {
        p.consumeNumber();
      } catch (error) {
        assert.instanceOf(error, InputError);
        assert.equal(error.message, 'unexpected in number');
        assert.equal(error.columnIndex, 1 + 4);
        assert.equal(error.lineIndex, 1);
      }
      assert.equal(p.columnIndex, 1);
      assert.equal(p.lineIndex, 1);
    });

  });

});

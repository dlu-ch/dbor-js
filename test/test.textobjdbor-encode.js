// SPDX-License-Identifier: LGPL-3.0-or-later
// dbor-js - ECMAScript 2020 implementation of DBOR encoder
// Copyright (C) 2020 Daniel Lutz <dlu-ch@users.noreply.github.com>

// https://www.ecma-international.org/ecma-262/11.0/

// https://mochajs.org/
// https://www.chaijs.com/api/assert/

var assert = chai.assert;

describe('textobjdbor.encode()', function () {

  describe('valid', function () {

    it('all classes', function () {
      let rs = textobjdbor.encode('None, 123, -0.1, 2^-3, -Inf, Inf, <0, 1>, "hoi", [], {}');
      assert.deepEqual(rs.length, 10);

      let r = rs[0];
      assert.instanceOf(r, textobj.InputRange);
      assert.deepEqual([r.index, r.length], [0, 4]);
      assert.deepEqual(r.object, [[0xFF], 'None']);

      r = rs[1];
      assert.deepEqual([r.index, r.length], [6, 3]);
      assert.deepEqual(r.object, [[0x18, 0x63], 'Integer']);

      r = rs[2];
      assert.deepEqual([r.index, r.length], [11, 4]);
      assert.deepEqual(r.object, [[0xE8, 0x20], 'DecimalRational']);

      r = rs[3];
      assert.deepEqual([r.index, r.length], [17, 4]);
      assert.deepEqual(r.object, [[0xC8, 0x00], 'BinaryRational']);

      r = rs[4];
      assert.deepEqual([r.index, r.length], [23, 4]);
      assert.deepEqual(r.object, [[0xFD], 'MinusInfinity']);

      r = rs[5];
      assert.deepEqual([r.index, r.length], [29, 3]);
      assert.deepEqual(r.object, [[0xFE], 'Infinity']);

      r = rs[6];
      assert.deepEqual([r.index, r.length], [34, 6]);
      assert.deepEqual(r.object, [[0x42, 0x00, 0x01], 'ByteString']);

      r = rs[7];
      assert.deepEqual([r.index, r.length], [42, 5]);
      assert.deepEqual(r.object, [[0x63, 0x68, 0x6F, 0x69], 'Utf8String']);

      r = rs[8];
      assert.deepEqual([r.index, r.length], [49, 2]);
      assert.deepEqual(r.object, [[0x80], 'Sequence']);

      r = rs[9];
      assert.deepEqual([r.index, r.length], [53, 2]);
      assert.deepEqual(r.object, [[0xA0], 'Dictionary']);
    });
  });

  describe('dictionary', function () {

    it('keys are sorted', function () {
      let rs = textobjdbor.encode('{-22: 0, 24: 0, -23: 0, 23: 0, -24: 0, 22: 0}');
      assert.deepEqual(rs.length, 1 + 2 * 6);

      assert.equal(rs[1 + 2 * 0].index, 39);  // 22
      assert.equal(rs[1 + 2 * 1].index, 24);  // 23
      assert.equal(rs[1 + 2 * 2].index, 9);  // 24
      assert.equal(rs[1 + 2 * 3].index, 1);  // -22
      assert.equal(rs[1 + 2 * 4].index, 16);  // -23
      assert.equal(rs[1 + 2 * 5].index, 31);  // -24
    });

  });

  describe('invalid', function () {

    it('empty', function () {
      try {
        textobjdbor.encode('');
      } catch (error) {
        assert.instanceOf(error, textobj.InputError);
        assert.equal(error.message, 'missing object');
        assert.equal(error.index, 0);
      }
    });

    describe('dictionary key', function () {

      it('duplicate key', function () {
        try {
          textobjdbor.encode('{1: 0, 2: 0, 3: 0, 2.0: 4}');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'duplicate dictionary key');
          assert.equal(error.index, 19);
        }
      });

      it('None', function () {
        try {
          textobjdbor.encode('{1: 0, None: 0}');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'dictionary key must be elementary (no container or None)');
          assert.equal(error.index, 7);
        }
      });

      it('Sequence', function () {
        try {
          textobjdbor.encode('{1: 0, []: 0}');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'dictionary key must be elementary (no container or None)');
          assert.equal(error.index, 7);
        }
      });

      it('Dictionary', function () {
        try {
          textobjdbor.encode('{1: 0, {}: 0}');
        } catch (error) {
          assert.instanceOf(error, textobj.InputError);
          assert.equal(error.message, 'dictionary key must be elementary (no container or None)');
          assert.equal(error.index, 7);
        }
      });

    });

  });

});

// SPDX-License-Identifier: LGPL-3.0-or-later
// dbor-js - ECMAScript 2020 implementation of DBOR encoder
// Copyright (C) 2020 Daniel Lutz <dlu-ch@users.noreply.github.com>

// https://www.ecma-international.org/ecma-262/11.0/

"use strict";

let textobjdbor = {};  // name space


textobjdbor.encodeSingle = function (inputRangeWithObject /* textobj.InputRange(..., textobj.Object(...)) */) {
  const object = inputRangeWithObject.object;
  let inputRangesWithDborValues = [];  // [textobj.InputRange(), ...]
  let totalSize = 0n;  // size of DBOR-encoded values in inputRangesWithDborValues

  try {
    let encoder = new dbor.Encoder();
    let dborClass = null;  // null or String (e.g. 'Integer')

    if (object instanceof textobj.IntegerWithExpFactor) {
      if (object.mant === 0n && object.isNeg) {
        encoder.appendMinusZero();
        dborClass = 'MinusZero';
      } else if (!object.base) {
        encoder.appendInteger(object.mant);
        dborClass = 'Integer';
      } else if (object.base === 10n) {
        if (object.exp != 0n) {
          encoder.appendDecimalRational(object.mant, object.exp)
          dborClass = 'DecimalRational';
        } else {
          encoder.appendInteger(object.mant)
          dborClass = 'Integer';
        }
      } else {
        encoder.appendBinaryRational(object.mant, object.exp);
        dborClass = 'BinaryRational';
      }
    } else if (object instanceof textobj.SpecialLiteral) {
      switch (object.literal) {
        case 'None':
          encoder.appendNone();
          break;
        case 'Infinity':
          encoder.appendInfinity();
          break;
        case 'MinusInfinity':
          encoder.appendMinusInfinity();
          break;
      }
      if (encoder.bytes.length)
        dborClass = object.literal;
    } else if (object instanceof textobj.UnicodeString) {
      dborClass = 'Utf8String';
      encoder.appendUtf8String(object.value);
    } else if (object instanceof textobj.ByteString) {
      dborClass = 'ByteString';
      encoder.appendByteString(object.value);
    } else if (object instanceof textobj.Sequence) {
      dborClass = 'Sequence';
      for (let o of object.parsedObjects) {
        const [size, eos] = textobjdbor.encodeSingle(o);
        totalSize += size;
        inputRangesWithDborValues = inputRangesWithDborValues.concat(eos);
      }
      encoder.appendSequenceHeader(totalSize);
    } else if (object instanceof textobj.Dictionary) {
      dborClass = 'Dictionary';

      let encodedPairs = [];
        // [[InputRange(), [InputRange(), ...]], ...]; r.object is [dborClass, bytes]
        // for all InputRange instances r where bytes is an Uin8Array

      for (let [k, v] of object.parsedObjectPairs) {
        const [ksize, keos] = textobjdbor.encodeSingle(k);
        if (keos.length != 1 || k.object instanceof textobj.Container
            || (k.object instanceof textobj.SpecialLiteral && k.object.literal == 'None'))
          throw new textobj.InputError('dictionary key must be elementary (no container or None)', k.index);
        const [vsize, veos] = textobjdbor.encodeSingle(v);
        encodedPairs.push([keos[0], veos]);
        totalSize += ksize;
        totalSize += vsize;
      }

      // sort by key (as byte sequence)
      encodedPairs.sort((a, b) => dbor.compareByteSequences(a[0].object[0], b[0].object[0]));
      let lastKeoBytes = null;
      for (let [keo, veos] of encodedPairs) {
        if (lastKeoBytes && dbor.compareByteSequences(lastKeoBytes, keo.object[0]) == 0)
          throw new textobj.InputError('duplicate dictionary key', keo.index);
        inputRangesWithDborValues.push(keo);
        inputRangesWithDborValues = inputRangesWithDborValues.concat(veos);
        lastKeoBytes = keo.object[0];
      }

      encoder.appendDictionaryHeader(totalSize);
    }

    if (!dborClass)
      throw new TypeError('unsupported type');

    totalSize += BigInt(encoder.bytes.length);
    let eos = new textobj.InputRange(
      inputRangeWithObject.index, inputRangeWithObject.length,
      [encoder.bytes, dborClass]);
    inputRangesWithDborValues.unshift(eos);
  } catch (error) {
    if (error instanceof textobj.InputError)
      throw error;
    throw new textobj.InputError(error.message, inputRangeWithObject.index);
  }

  return [totalSize, inputRangesWithDborValues];
}


// Parses the string 'input' with textobj.Parser as and DBOR-encodes the objects.
//
// Returns an array of textobj.InputRange instances r in ascending order by r.index.
//
// All r satisfy the following properties:
// - input.substr(r.index, r.length) is the textobj representation of r.object.
// - r.object is an array [bytes, dborClass] where 'bytes' is an Uint8Array containing the a well-formed DBOR value
//   and 'dborClass' is a String the names the DBOR value class (e.g. 'MinusInfinity').
//   If dborClass is 'Sequence' or 'Dictionary', bytes is only the header - the key-value pairs
//   follow in separate as textobj.InputRange instances.
//
// Throws a textobj.InputError(errorMessage, erroneousIndexInput) if and only if 'input' is not the textobj representation
// of a list of objects or one of the object cannot be represented as a well-formed DBOR value.
// 'errorMessage' is a non-empty string (one line) and 'erroneousIndexInput' the 0-based index of the UTF-16 code unit
// in 'input' that caused the error.

textobjdbor.encode = function (input /* String */) {
    let inputRangesWithDborValues = [];
    for (let inputRangeWithObject of new textobj.Parser(input).parse()) {
        const [totalSize, os] = textobjdbor.encodeSingle(inputRangeWithObject);
        inputRangesWithDborValues = inputRangesWithDborValues.concat(os);
    }
    return inputRangesWithDborValues;
}


textobjdbor.loaded = true;

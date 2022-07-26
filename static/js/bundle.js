(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

const base64 = require('base64-js')
const ieee754 = require('ieee754')
const customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

const K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    const arr = new Uint8Array(1)
    const proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  const buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayView(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  const valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  const b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpreted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  const length = byteLength(string, encoding) | 0
  let buf = createBuffer(length)

  const actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  const length = array.length < 0 ? 0 : checked(array.length) | 0
  const buf = createBuffer(length)
  for (let i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayView (arrayView) {
  if (isInstance(arrayView, Uint8Array)) {
    const copy = new Uint8Array(arrayView)
    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
  }
  return fromArrayLike(arrayView)
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  let buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    const len = checked(obj.length) | 0
    const buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  let x = a.length
  let y = b.length

  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  let i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  const buffer = Buffer.allocUnsafe(length)
  let pos = 0
  for (i = 0; i < list.length; ++i) {
    let buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      if (pos + buf.length > buffer.length) {
        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf)
        buf.copy(buffer, pos)
      } else {
        Uint8Array.prototype.set.call(
          buffer,
          buf,
          pos
        )
      }
    } else if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    } else {
      buf.copy(buffer, pos)
    }
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  const len = string.length
  const mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  let loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  let loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  const i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  const len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (let i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  const len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (let i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  const len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (let i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  const length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  let str = ''
  const max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  let x = thisEnd - thisStart
  let y = end - start
  const len = Math.min(x, y)

  const thisCopy = this.slice(thisStart, thisEnd)
  const targetCopy = target.slice(start, end)

  for (let i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  let indexSize = 1
  let arrLength = arr.length
  let valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  let i
  if (dir) {
    let foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      let found = true
      for (let j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  const remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  const strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  let i
  for (i = 0; i < length; ++i) {
    const parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  const remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  let loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
      case 'latin1':
      case 'binary':
        return asciiWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  const res = []

  let i = start
  while (i < end) {
    const firstByte = buf[i]
    let codePoint = null
    let bytesPerSequence = (firstByte > 0xEF)
      ? 4
      : (firstByte > 0xDF)
          ? 3
          : (firstByte > 0xBF)
              ? 2
              : 1

    if (i + bytesPerSequence <= end) {
      let secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
const MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  const len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  let res = ''
  let i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  let ret = ''
  end = Math.min(buf.length, end)

  for (let i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  let ret = ''
  end = Math.min(buf.length, end)

  for (let i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  const len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  let out = ''
  for (let i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  const bytes = buf.slice(start, end)
  let res = ''
  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
  for (let i = 0; i < bytes.length - 1; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  const len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  const newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUintLE =
Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  let val = this[offset]
  let mul = 1
  let i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUintBE =
Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  let val = this[offset + --byteLength]
  let mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUint8 =
Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUint16LE =
Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUint16BE =
Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUint32LE =
Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUint32BE =
Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const lo = first +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 24

  const hi = this[++offset] +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    last * 2 ** 24

  return BigInt(lo) + (BigInt(hi) << BigInt(32))
})

Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const hi = first * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    this[++offset]

  const lo = this[++offset] * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    last

  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
})

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  let val = this[offset]
  let mul = 1
  let i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  let i = byteLength
  let mul = 1
  let val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  const val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  const val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const val = this[offset + 4] +
    this[offset + 5] * 2 ** 8 +
    this[offset + 6] * 2 ** 16 +
    (last << 24) // Overflow

  return (BigInt(val) << BigInt(32)) +
    BigInt(first +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 24)
})

Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const val = (first << 24) + // Overflow
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    this[++offset]

  return (BigInt(val) << BigInt(32)) +
    BigInt(this[++offset] * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    last)
})

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUintLE =
Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  let mul = 1
  let i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUintBE =
Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  let i = byteLength - 1
  let mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUint8 =
Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUint16LE =
Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUint16BE =
Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUint32LE =
Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUint32BE =
Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function wrtBigUInt64LE (buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7)

  let lo = Number(value & BigInt(0xffffffff))
  buf[offset++] = lo
  lo = lo >> 8
  buf[offset++] = lo
  lo = lo >> 8
  buf[offset++] = lo
  lo = lo >> 8
  buf[offset++] = lo
  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff))
  buf[offset++] = hi
  hi = hi >> 8
  buf[offset++] = hi
  hi = hi >> 8
  buf[offset++] = hi
  hi = hi >> 8
  buf[offset++] = hi
  return offset
}

function wrtBigUInt64BE (buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7)

  let lo = Number(value & BigInt(0xffffffff))
  buf[offset + 7] = lo
  lo = lo >> 8
  buf[offset + 6] = lo
  lo = lo >> 8
  buf[offset + 5] = lo
  lo = lo >> 8
  buf[offset + 4] = lo
  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff))
  buf[offset + 3] = hi
  hi = hi >> 8
  buf[offset + 2] = hi
  hi = hi >> 8
  buf[offset + 1] = hi
  hi = hi >> 8
  buf[offset] = hi
  return offset + 8
}

Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
})

Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
})

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    const limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  let i = 0
  let mul = 1
  let sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    const limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  let i = byteLength - 1
  let mul = 1
  let sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
})

Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
})

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  const len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      const code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  let i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    const bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    const len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// CUSTOM ERRORS
// =============

// Simplified versions from Node, changed for Buffer-only usage
const errors = {}
function E (sym, getMessage, Base) {
  errors[sym] = class NodeError extends Base {
    constructor () {
      super()

      Object.defineProperty(this, 'message', {
        value: getMessage.apply(this, arguments),
        writable: true,
        configurable: true
      })

      // Add the error code to the name to include it in the stack trace.
      this.name = `${this.name} [${sym}]`
      // Access the stack to generate the error message including the error code
      // from the name.
      this.stack // eslint-disable-line no-unused-expressions
      // Reset the name to the actual name.
      delete this.name
    }

    get code () {
      return sym
    }

    set code (value) {
      Object.defineProperty(this, 'code', {
        configurable: true,
        enumerable: true,
        value,
        writable: true
      })
    }

    toString () {
      return `${this.name} [${sym}]: ${this.message}`
    }
  }
}

E('ERR_BUFFER_OUT_OF_BOUNDS',
  function (name) {
    if (name) {
      return `${name} is outside of buffer bounds`
    }

    return 'Attempt to access memory outside buffer bounds'
  }, RangeError)
E('ERR_INVALID_ARG_TYPE',
  function (name, actual) {
    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
  }, TypeError)
E('ERR_OUT_OF_RANGE',
  function (str, range, input) {
    let msg = `The value of "${str}" is out of range.`
    let received = input
    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
      received = addNumericalSeparator(String(input))
    } else if (typeof input === 'bigint') {
      received = String(input)
      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
        received = addNumericalSeparator(received)
      }
      received += 'n'
    }
    msg += ` It must be ${range}. Received ${received}`
    return msg
  }, RangeError)

function addNumericalSeparator (val) {
  let res = ''
  let i = val.length
  const start = val[0] === '-' ? 1 : 0
  for (; i >= start + 4; i -= 3) {
    res = `_${val.slice(i - 3, i)}${res}`
  }
  return `${val.slice(0, i)}${res}`
}

// CHECK FUNCTIONS
// ===============

function checkBounds (buf, offset, byteLength) {
  validateNumber(offset, 'offset')
  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
    boundsError(offset, buf.length - (byteLength + 1))
  }
}

function checkIntBI (value, min, max, buf, offset, byteLength) {
  if (value > max || value < min) {
    const n = typeof min === 'bigint' ? 'n' : ''
    let range
    if (byteLength > 3) {
      if (min === 0 || min === BigInt(0)) {
        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`
      } else {
        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
                `${(byteLength + 1) * 8 - 1}${n}`
      }
    } else {
      range = `>= ${min}${n} and <= ${max}${n}`
    }
    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
  }
  checkBounds(buf, offset, byteLength)
}

function validateNumber (value, name) {
  if (typeof value !== 'number') {
    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
  }
}

function boundsError (value, length, type) {
  if (Math.floor(value) !== value) {
    validateNumber(value, type)
    throw new errors.ERR_OUT_OF_RANGE(type || 'offset', 'an integer', value)
  }

  if (length < 0) {
    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
  }

  throw new errors.ERR_OUT_OF_RANGE(type || 'offset',
                                    `>= ${type ? 1 : 0} and <= ${length}`,
                                    value)
}

// HELPER FUNCTIONS
// ================

const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  let codePoint
  const length = string.length
  let leadSurrogate = null
  const bytes = []

  for (let i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  const byteArray = []
  for (let i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  let c, hi, lo
  const byteArray = []
  for (let i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  let i
  for (i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
const hexSliceLookupTable = (function () {
  const alphabet = '0123456789abcdef'
  const table = new Array(256)
  for (let i = 0; i < 16; ++i) {
    const i16 = i * 16
    for (let j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

// Return not function with Error if BigInt not supported
function defineBigIntMethod (fn) {
  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
}

function BufferBigIntNotDefined () {
  throw new Error('BigInt not supported')
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":6,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
/**!
 * PolyParser.js - Parser for Poly Bridge 2 .layout and .slot files
 * Adapted for browser support.
 *
 * Copyright (c) 2022 Ashton Fairchild (ashduino101). All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software
 * is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall
 * be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 * FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

const Buffer = require('buffer/').Buffer;

const MAX_LAYOUT_VERSION = 26;
const MAX_BRIDGE_VERSION = 10;
const MAX_SLOT_VERSION = 3;
const MAX_PHYSICS_VERSION = 1;


function cSharpify(key) {
	// format the key unless it's 1 character (e.g. "x", "y", "z")
	return key.length > 1 ? "m_" + key.charAt(0).toUpperCase() + key.slice(1) : key;
}

// Adapted from https://stackoverflow.com/questions/19752516/renaming-object-keys-recursively
function cSharpifyKeys(o) {
	let build, key, destKey, value;

	// Only handle non-null objects
	if (o === null || typeof o !== "object") {
		return o;
	}

	// Handle array just by handling their contents
	if (Array.isArray(o)) {
		return o.map(cSharpifyKeys);
	}

	build = {};
	for (key in o) {
		// Get the destination key
		destKey = cSharpify(key);

		// Get the value
		value = o[key];

		// If this is an object, recurse
		if (typeof value === "object") {
			value = cSharpifyKeys(value);
		}

		// Set it on the result using the destination key
		build[destKey] = value;
	}
	return build;
}

function unCSharpify(key) {
	// remove the m_ prefix if the key is longer than 1 character, and shitf it all to lowercase
	let newStr = key.length > 1 ? key.slice(2) : key;
	return newStr.charAt(0).toLowerCase() + newStr.slice(1);
}

function unCSharpifyKeys(o) {
	let build, key, destKey, value;

	// Only handle non-null objects
	if (o === null || typeof o !== "object") {
		return o;
	}

	// Handle array just by handling their contents
	if (Array.isArray(o)) {
		return o.map(unCSharpifyKeys);
	}

	build = {};
	for (key in o) {
		// Get the destination key
		destKey = unCSharpify(key);

		// Get the value
		value = o[key];

		// If this is an object, recurse
		if (typeof value === "object") {
			value = unCSharpifyKeys(value);
		}

		// Set it on the result using the destination key
		build[destKey] = value;
	}
	return build;
}


class Deserializer {
	constructor(data) {
		/**
		 * Initializes a new Deserializer.
		 *
		 * data: Uint8Array - The data to deserialize.
		 */
		this.data = data;
		this.offset = 0;
		this.warnings = [];
		// Make sure objects exist for things that need them (and not arrays, strings, etc. which we can create on the fly)
		this.layout = {
			bridge: {
				version: MAX_BRIDGE_VERSION,
				anchors: [],
				joints: [],
				edges: [],
				pistons: [],
				phases: [],
				springs: []
			},
			budget: {},
			settings: {},
			workshop: {},
			modData: {},
		}
	}
	readByte() {
		const byte = this.data[this.offset];
		this.offset++;
		return byte;
	}
	readBytes(count) {
		const bytes = this.data.slice(this.offset, this.offset + count);
		this.offset += count;
		return bytes;
	}
	readBool() {
		return this.readByte() !== 0;
	}
	readInt16() {
		const value = this.readBytes(2);
		return new Uint16Array(value)[0];
	}
	readInt32() {
		const value = this.readBytes(4);
		let buf = new ArrayBuffer(4);
		let view = new DataView(buf);

		for (let i = 0; i < 4; i++) {
			view.setUint8(i, value[3 - i]);
		}

		return view.getInt32(0)
	}
	readFloat() {
		// This is a bit of a weird IEEE 754 float implementation, but it works
		let buf = new ArrayBuffer(4);
		let view = new DataView(buf);
		let bytes = this.readBytes(4);
		// reverse the bytes
		for (let i = 0; i < 4; i++) {
			view.setUint8(i, bytes[3 - i]);
		}
		return view.getFloat32(0);
	}
	readString() {
		const length = this.readInt16();
		const value = this.readBytes(length);
		return value.toString();
	}
	readByteArray() {
		const length = this.readInt32();
		return this.readBytes(length);
	}
	readVec3() {
		const x = this.readFloat();
		const y = this.readFloat();
		const z = this.readFloat();
		return {
			'x': x,
			'y': y,
			'z': z
		};
	}
	readVec2() {
		const x = this.readFloat();
		const y = this.readFloat();
		return {
			'x': x,
			'y': y
		};
	}
	readColor() {
		const r = this.readByte();
		const g = this.readByte();
		const b = this.readByte();
		return {
			'r': r / 255,
			'g': g / 255,
			'b': b / 255,
			'a': 1.0
		};
	}
	readQuaternion() {
		const x = this.readFloat();
		const y = this.readFloat();
		const z = this.readFloat();
		const w = this.readFloat();
		return {
			'x': x,
			'y': y,
			'z': z,
			'w': w
		};
	}

	static clamp01(value) {
		if (value < 0.0) {
			return 0.0;
		} else if (value > 1.0) {
			return 1.0;
		} else {
			return value;
		}
	}
	static lerp(a, b, t) {
		return a + (b - a) * t;
	}
	static fixPistonNormalizedValue(value) {
		let out;
		if (value < 0.25) {
			out = Deserializer.lerp(1.0, 0.5, Deserializer.clamp01(value / 0.25));
			return out;
		}
		if (value > 0.75) {
			out = Deserializer.lerp(0.5, 1.0, Deserializer.clamp01((value - 0.75) / 0.25));
			return out;
		}
		out = Deserializer.lerp(0.0, 0.5, Deserializer.clamp01(Math.abs(value - 0.5) / 0.25));
		return out;
	}

	deserializeBridge() {
		// Version
		let bridge_version = this.readInt32();
		if (bridge_version > MAX_BRIDGE_VERSION) {
			this.warnings.push(`Bridge version ${bridge_version} is newer than the latest supported version ${MAX_BRIDGE_VERSION}.`);
		}
		this.layout.bridge.version = bridge_version;

		// if the bridge version is less than 2, then we don't have any bridge data
		if (bridge_version < 2) {
			return;
		}

		// Joints
		let count = this.readInt32();
		this.layout.bridge.joints = [];
		for (let i = 0; i < count; i++) {
			let joint = {};
			joint.pos = this.readVec3();
			joint.isAnchor = this.readBool();
			joint.isSplit = this.readBool();
			joint.guid = this.readString();
			this.layout.bridge.joints.push(joint);
		}

		// Edges
		count = this.readInt32();
		this.layout.bridge.edges = [];
		for (let i = 0; i < count; i++) {
			let edge = {};
			edge.materialType = this.readInt32();
			edge.nodeAGuid = this.readString();
			edge.nodeBGuid = this.readString();
			edge.jointAPart = this.readInt32();
			edge.jointBPart = this.readInt32();
			this.layout.bridge.edges.push(edge);
		}

		// Springs
		this.layout.bridge.springs = [];
		if (bridge_version >= 7) {
			count = this.readInt32();
			for (let i = 0; i < count; i++) {
				let spring = {};
				spring.normalizedValue = this.readFloat();
				spring.nodeAGuid = this.readString();
				spring.nodeBGuid = this.readString();
				spring.guid = this.readString();
				this.layout.bridge.springs.push(spring);
			}
		}

		// Pistons
		this.layout.bridge.pistons = [];
		count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let piston = {};
			piston.normalizedValue = this.readFloat();
			piston.nodeAGuid = this.readString();
			piston.nodeBGuid = this.readString();
			piston.guid = this.readString();

			if (this.layout.version < 8) {
				// Fix the normalized value for the piston if the bridge version is less than 8
				piston.normalizedValue = Deserializer.fixPistonNormalizedValue(piston.normalizedValue);
			}
			this.layout.bridge.pistons.push(piston);
		}

		// Hydraulic phases
		this.layout.bridge.phases = [];
		count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let phase = {};
			phase.hydraulicPhaseGuid = this.readString();

			let count2 = this.readInt32();
			phase.pistonGuids = [];
			for (let j = 0; j < count2; j++) {
				phase.pistonGuids.push(this.readString());
			}

			if (bridge_version > 2) {
				// Bridge split joints
				count2 = this.readInt32();
				phase.splitJoints = [];
				for (let j = 0; j < count2; j++) {
					let split_joint = {};
					split_joint.guid = this.readString();
					split_joint.state = this.readInt32();
					phase.splitJoints.push(split_joint);
				}
			} else {
				// garbage data
				count2 = this.readInt32();
				for (let j = 0; j < count2; j++) {
					this.readString();
				}
			}

			// Disable new additions
			if (bridge_version > 9) {
				phase.disableNewAdditions = this.readBool();
			}

			this.layout.bridge.phases.push(phase);
		}

		// Garbage data in v5
		if (bridge_version === 5) {
			count = this.readInt32();
			for (let i = 0; i < count; i++) {
				this.readString();
			}
		}

		// Anchors in v6+
		if (bridge_version >= 6) {
			count = this.readInt32();
			this.layout.bridge.anchors = [];
			for (let i = 0; i < count; i++) {
				let anchor = {};
				anchor.pos = this.readVec3();
				anchor.isAnchor = this.readBool();
				anchor.isSplit = this.readBool();
				anchor.guid = this.readString();
				this.layout.bridge.anchors.push(anchor);
			}
		}

		// Random bool at end in v4-v8
		if (bridge_version >= 4 && bridge_version < 9) {
			this.readBool();
		}
	}
	deserializeLayout() {
		// Version
		let version = this.readInt32();
		this.layout.isModded = false;
		if (version < 0) {
			// Modded layout
			version = -version;
			this.layout.isModded = true;
		}
		this.layout.version = version;
		if (version > MAX_LAYOUT_VERSION) {
			this.warnings.push(`Layout version ${version} is newer than the latest supported version ${MAX_LAYOUT_VERSION}.`);
		}

		// Stub key
		this.layout.themeStubKey = this.readString();

		this.layout.anchors = [];
		if (version >= 19) {
			// Anchors
			let count = this.readInt32();
			for (let i = 0; i < count; i++) {
				let pos = this.readVec3();
				let isAnchor = this.readBool();
				let isSplit = this.readBool();
				let guid = this.readString();
				this.layout.anchors.push({
					'pos': pos,
					'isAnchor': isAnchor,
					'isSplit': isSplit,
					'guid': guid
				});
			}
		}

		this.layout.phases = [];
		if (version >= 5) {
			// Hydraulic phases
			let count = this.readInt32();
			for (let i = 0; i < count; i++) {
				let time_delay = this.readFloat();
				let guid = this.readString();
				this.layout.phases.push({
					'timeDelay': time_delay,
					'guid': guid
				});
			}
		}

		if (version > 4) {
			// Bridge
			this.deserializeBridge();
		} else {
			// Different way
			this.layout.bridge = {};
			// Joints
			let count = this.readInt32();
			this.layout.bridge.joints = [];
			for (let i = 0; i < count; i++) {
				let joint = {};
				joint.pos = this.readVec3();
				joint.isAnchor = this.readBool();
				joint.isSplit = this.readBool();
				joint.guid = this.readString();
				this.layout.bridge.joints.push(joint);
			}

			// Edges
			count = this.readInt32();
			this.layout.bridge.edges = [];
			for (let i = 0; i < count; i++) {
				let edge = {};
				edge.materialType = this.readInt32();
				edge.nodeAGuid = this.readString();
				edge.nodeBGuid = this.readString();
				edge.jointAPart = this.readInt32();
				edge.jointBPart = this.readInt32();
				this.layout.bridge.edges.push(edge);
			}

			// Pistons
			count = this.readInt32();
			this.layout.bridge.pistons = [];
			for (let i = 0; i < count; i++) {
				let piston = {};

				piston.normalizedValue = this.readFloat();
				piston.nodeAGuid = this.readString();
				piston.nodeBGuid = this.readString();
				piston.guid = this.readString();

				// since the version is definitely less than 8, we have to fix the normalized value
				piston.normalizedValue = Deserializer.fixPistonNormalizedValue(piston.normalizedValue);

				this.layout.bridge.pistons.push(piston);
			}
		}

		// Z-Axis Vehicles
		this.layout.zedAxisVehicles = [];
		if (version >= 7) {
			let count = this.readInt32();
			for (let i = 0; i < count; i++) {
				let vehicle = {};
				vehicle.pos = this.readVec2();
				vehicle.prefabName = this.readString();
				vehicle.guid = this.readString();
				vehicle.timeDelay = this.readFloat();
				if (version >= 8) {
					vehicle.speed = this.readFloat();
				}
				if (version >= 26) {
					vehicle.rot = this.readQuaternion();
					vehicle.rotationDegrees = this.readFloat();
				}

				this.layout.zedAxisVehicles.push(vehicle);
			}
		}

		// Vehicles
		this.layout.vehicles = [];
		let count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let vehicle = {};
			vehicle.displayName = this.readString();
			vehicle.pos = this.readVec2();
			vehicle.rot = this.readQuaternion();
			vehicle.prefabName = this.readString();
			vehicle.targetSpeed = this.readFloat();
			vehicle.mass = this.readFloat();
			vehicle.brakingForceMultiplier = this.readFloat();
			vehicle.strengthMethod = this.readInt32();
			vehicle.acceleration = this.readFloat();
			vehicle.maxSlope = this.readFloat();
			vehicle.desiredAccleration = this.readFloat();
			vehicle.shocksMultiplier = this.readFloat();
			vehicle.rotationDegrees = this.readFloat();
			vehicle.timeDelay = this.readFloat();
			vehicle.idleOnDownhill = this.readBool();
			vehicle.flipped = this.readBool();
			vehicle.orderedCheckpoints = this.readBool();
			vehicle.guid = this.readString();

			// Checkpoint GUIDs
			vehicle.checkpointGuids = [];
			let checkpointCount = this.readInt32();
			for (let j = 0; j < checkpointCount; j++) {
				vehicle.checkpointGuids.push(this.readString());
			}

			this.layout.vehicles.push(vehicle);
		}

		// Vehicle stop triggers
		this.layout.vehicleStopTriggers = [];
		count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let trigger = {};
			trigger.pos = this.readVec2();
			trigger.rot = this.readQuaternion();
			trigger.height = this.readFloat();
			trigger.rotationDegrees = this.readFloat();
			trigger.flipped = this.readBool();
			trigger.prefabName = this.readString();
			trigger.stopVehicleGuid = this.readString();

			this.layout.vehicleStopTriggers.push(trigger);
		}

		// Theme objects before v20
		if (version < 20) {
			this.layout.themeObjectsObsolete = [];
			count = this.readInt32();
			for (let i = 0; i < count; i++) {
				let themeObject = {};
				themeObject.pos = this.readVec2();
				themeObject.prefabName = this.readString();
				themeObject.unknownValue = this.readBool();
				this.layout.themeObjectsObsolete.push(themeObject);
			}
		}

		// Event timelines
		this.layout.eventTimelines = [];
		count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let timeline = {};
			timeline.checkpointGuid = this.readString();

			let count2 = this.readInt32();
			timeline.stages = [];
			for (let j = 0; j < count2; j++) {
				let stage = {};

				let count3 = this.readInt32();
				stage.units = [];
				for (let k = 0; k < count3; k++) {
					let unit = {};

					if (version >= 7) {
						unit.guid = this.readString();
						stage.units.push(unit);
						continue;
					}

					// looks like somebody forgot to remove old serialization code
					let text = this.readString();
					if (text.length > 0) {
						unit.guid = text;
					}

					text = this.readString();
					if (text.length > 0) {
						unit.guid = text;
					}

					text = this.readString();
					if (text.length > 0) {
						unit.guid = text;
					}

					stage.units.push(unit);
				}

				timeline.stages.push(stage);
			}

			this.layout.eventTimelines.push(timeline);
		}

		// Checkpoints
		this.layout.checkpoints = [];
		count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let checkpoint = {};
			checkpoint.pos = this.readVec2();
			checkpoint.prefabName = this.readString();
			checkpoint.vehicleGuid = this.readString();
			checkpoint.vehicleRestartPhaseGuid = this.readString();
			checkpoint.triggerTimeline = this.readBool();
			checkpoint.stopVehicle = this.readBool();
			checkpoint.reverseVehicleOnRestart = this.readBool();
			checkpoint.guid = this.readString();

			this.layout.checkpoints.push(checkpoint);
		}

		// Terrain stretches
		this.layout.terrainStretches = [];
		count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let island = {};
			island.pos = this.readVec3();
			island.prefabName = this.readString();
			island.heightAdded = this.readFloat();
			island.rightEdgeWaterHeight = this.readFloat();
			island.terrainIslandType = this.readInt32();
			island.variantIndex = this.readInt32();
			island.flipped = this.readBool();
			if (version >= 6) {
				island.lockPosition = this.readBool();
			}

			this.layout.terrainStretches.push(island);
		}

		// Platforms
		this.layout.platforms = [];
		count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let platform = {};
			platform.pos = this.readVec2();
			platform.width = this.readFloat();
			platform.height = this.readFloat();
			platform.flipped = this.readBool();
			if (version >= 22) {
				platform.solid = this.readBool();
			} else {
				// random int at end of earlier versions
				this.readInt32();
			}

			this.layout.platforms.push(platform);
		}

		// Ramps
		this.layout.ramps = []
		count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let ramp = {};
			ramp.pos = this.readVec2();

			// control points
			let count2 = this.readInt32();
			ramp.controlPoints = [];
			for (let j = 0; j < count2; j++) {
				ramp.controlPoints.push(this.readVec2());
			}

			ramp.height = Math.abs(this.readFloat());
			ramp.numSegments = this.readInt32();
			ramp.splineType = this.readInt32();
			ramp.flippedVertical = this.readBool();
			ramp.flippedHorizontal = this.readBool();
			ramp.hideLegs = (version >= 23 && this.readBool());

			if (version >= 25) {
				ramp.flippedLegs = this.readBool();
			} else if (version >= 22) {
				this.readBool();
			} else {
				this.readInt32();
			}

			ramp.linePoints = [];
			if (version >= 13) {
				count2 = this.readInt32();
				for (let j = 0; j < count2; j++) {
					ramp.linePoints.push(this.readVec2());
				}
			}

			this.layout.ramps.push(ramp);
		}

		// In versions below v5, we have hydraulic phases here
		if (version < 5) {
			let count = this.readInt32();
			for (let i = 0; i < count; i++) {
				let time_delay = this.readFloat();
				let guid = this.readString();
				this.layout.phases.push({
					timeDelay: time_delay,
					'guid': guid
				});
			}
		}

		// Vehicle restart phases
		this.layout.vehicleRestartPhases = [];
		count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let phase = {}
			phase.timeDelay = this.readFloat();
			phase.guid = this.readString();
			phase.vehicleGuid = this.readString();

			this.layout.vehicleRestartPhases.push(phase);
		}

		// Flying objects
		this.layout.flyingObjects = [];
		count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let object = {};
			object.pos = this.readVec3();
			object.scale = this.readVec3();
			object.prefabName = this.readString();

			this.layout.flyingObjects.push(object);
		}

		// Rocks
		this.layout.rocks = [];
		count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let rock = {};
			rock.pos = this.readVec3();
			rock.scale = this.readVec3();
			rock.prefabName = this.readString();
			rock.flipped = this.readBool();

			this.layout.rocks.push(rock);
		}

		// Water blocks
		this.layout.waterBlocks = [];
		count = this.readInt32();
		for (let i = 0; i < count; i++) {
			let water = {};
			water.pos = this.readVec3();
			water.width = this.readFloat();
			water.height = this.readFloat();

			if (version >= 12) {
				water.lockPosition = this.readBool();
			}

			this.layout.waterBlocks.push(water);
		}

		// Garbage data in v5-
		if (version < 5) {
			count = this.readInt32();
			let count2;
			for (let i = 0; i < count; i++) {
				this.readString();
				count2 = this.readInt32();
				for (let j = 0; j < count2; j++) {
					this.readString();
				}
			}
		}

		// Budget
		this.layout.budget.cash = this.readInt32();
		this.layout.budget.road = this.readInt32();
		this.layout.budget.wood = this.readInt32();
		this.layout.budget.steel = this.readInt32();
		this.layout.budget.hydraulics = this.readInt32();
		this.layout.budget.rope = this.readInt32();
		this.layout.budget.cable = this.readInt32();
		this.layout.budget.spring = this.readInt32();
		this.layout.budget.bungeeRope = this.readInt32();

		this.layout.budget.allowWood = this.readBool();
		this.layout.budget.allowSteel = this.readBool();
		this.layout.budget.allowHydraulics = this.readBool();
		this.layout.budget.allowRope = this.readBool();
		this.layout.budget.allowCable = this.readBool();
		this.layout.budget.allowSpring = this.readBool();
		this.layout.budget.allowReinforcedRoad = this.readBool();

		// Settings
		this.layout.settings.hydraulicsControllerEnabled = this.readBool();
		this.layout.settings.unbreakable = this.readBool();

		// Custom shapes in v9+
		if (version > 9) {
			count = this.readInt32();
			this.layout.customShapes = [];
			for (let i = 0; i < count; i++) {
				let s = {};
				s.pos = this.readVec3();
				s.rot = this.readQuaternion();
				s.scale = this.readVec3();
				s.flipped = this.readBool();
				s.dynamic = this.readBool();
				s.collidesWithRoad = this.readBool();
				s.collidesWithNodes = this.readBool();
				if (version >= 25) {
					s.collidesWithSplitNodes = this.readBool()
				}
				s.rotationDegrees = this.readFloat();
				if (version >= 10) {
					s.color = this.readColor();
				} else {
					this.readInt32();
				}
				if (version >= 11) {
					s.mass = this.readFloat();
				} else {
					this.readFloat();
					s.mass = 40.0;
				}
				if (version >= 14) {
					s.bounciness = this.readFloat();
				} else {
					s.bounciness = 0.5;
				}
				if (version >= 24) {
					s.pinMotorStrength = this.readFloat();
					s.pinTargetVelocity = this.readFloat();
				} else {
					s.pinMotorStrength = 0.0;
					s.pinTargetVelocity = 0.0;
				}

				// Points
				let count2 = this.readInt32();
				s.pointsLocalSpace = [];
				for (let j = 0; j < count2; j++) {
					s.pointsLocalSpace.push(this.readVec2());
				}

				// Static pins
				count2 = this.readInt32();
				s.staticPins = [];
				for (let j = 0; j < count2; j++) {
					let pos = this.readVec3();
					pos.z = -1.348;
					s.staticPins.push(pos);
				}

				// Dynamic anchors
				count2 = this.readInt32();
				s.dynamicAnchorGuids = [];
				for (let j = 0; j < count2; j++) {
					s.dynamicAnchorGuids.push(this.readString());
				}

				this.layout.customShapes.push(s);
			}
		}

		// Workshop in v15+
		if (version >= 15) {
			this.layout.workshop.id = this.readString();
			if (version >= 16) {
				this.layout.workshop.leaderboardId = this.readString();
			}
			this.layout.workshop.title = this.readString();
			this.layout.workshop.description = this.readString();
			this.layout.workshop.autoplay = this.readBool();
			count = this.readInt32();
			this.layout.workshop.tags = [];
			for (let i = 0; i < count; i++) {
				this.layout.workshop.tags.push(this.readString());
			}
		}

		// Support pillars in v17+
		if (version >= 17) {
			count = this.readInt32();
			this.layout.supportPillars = [];
			for (let i = 0; i < count; i++) {
				let pillar = {};
				pillar.pos = this.readVec3();
				pillar.scale = this.readVec3();
				pillar.prefabName = this.readString();

				this.layout.supportPillars.push(pillar);
			}
		}

		// Pillars in v18+
		if (version >= 18) {
			count = this.readInt32();
			this.layout.pillars = [];
			for (let i = 0; i < count; i++) {
				let pillar = {};
				pillar.pos = this.readVec3();
				pillar.height = this.readFloat();
				pillar.prefabName = this.readString();

				this.layout.pillars.push(pillar);
			}
		}

		// PTF support
		if (!this.layout.isModded) return;

		// Mod metadata
		count = this.readInt16();
		this.layout.modData.mods = [];
		for (let i = 0; i < count; i++) {
			let string = this.readString();
			let partsOfMod = string.split("\u058D");

			let name = !(partsOfMod.length === 0) ? partsOfMod[0] : "";
			let version = (partsOfMod.length >= 2) ? partsOfMod[1] : "";
			let settings = (partsOfMod.length >= 3) ? partsOfMod[2] : "";

			this.layout.modData.mods.push({
				'name': name,
				'version': version,
				'settings': settings.split('|')
			});
		}

		// Mod save data
		count = this.readInt32();
		if (count === 0) return;
		this.layout.modData.modSaveData = []
		for (let i = 0; i < count; i++) {
			let modIdentifier = this.readString();
			let partsOfMod = modIdentifier.split("\u058D");
			let name = !(partsOfMod.length === 0) ? partsOfMod[0] : "";
			// if there's no version, find the version in the mod metadata
			let version = !(partsOfMod.length >= 2) ? partsOfMod[1] : this.layout.modData.mods.find(mod => mod.name === name).version;

			if (name === "") {
				continue;
			}

			let saveData = this.readByteArray();
			// base64 encode the save data
			let base64 = btoa(String.fromCharCode.apply(null, saveData));

			this.layout.modData.modSaveData.push({
				'name': name,
				'version': version,
				'data': base64
			});
		}
	}

	dumpJSON(indent = 2) {
		// Dumps PolyConverter-compatible JSON.

		let layout = cSharpifyKeys(this.layout);

		// dump JSON
		return JSON.stringify(layout, null, indent);
	}
}


class Serializer {
	constructor(layout) {
		if (typeof layout === 'object') {
			this.layout = layout;
		} else if (typeof layout === 'string') {
			this.layout = this.fromJSON(layout);
		}
		this.offset = 0;

		// Generate an estimate of the byte size of the layout.
		// This is used to allocate a buffer for the serialized data.
		let size = this.estimateSize();
		console.log("Allocating " + size + " bytes for serialized data.");

		this.buffer = new Buffer.alloc(size);
	}

	estimateSize() {
		/**
		 * Gets a value higher than the size of the layout for the buffer allocation.
		 */
		let size = 0;
		// A lot of these will be more than the actual size, but that's just to be safe; it gets trimmed at the end anyway.
		// Mainly why we're doing this is because each GUID is 36 bytes, which, in the long run, is quite large.

		// Pre bridge ---------------------------------------------------------------------------------
		size += 4; // version
		size += 16; // more than enough for the stub key
		// 64 bytes per anchor
		size += this.layout.anchors.length * 64;
		// 64 bytes per hydraulic phase
		size += this.layout.phases.length * 64;

		// Bridge -------------------------------------------------------------------------------------
		size += 4; // version
		// 128 bytes per joint
		size += this.layout.bridge.joints.length * 128;
		// 128 bytes per edge
		size += this.layout.bridge.edges.length * 128;
		// 128 bytes per spring
		size += this.layout.bridge.springs.length * 128;
		// 128 bytes per piston
		size += this.layout.bridge.pistons.length * 128;
		// Hydraulic phases have some arrays, so let's check over them.
		// 36 bytes per phase GUID
		size += this.layout.bridge.phases.length * 36;
		// 36 bytes per piston GUID and up to 64 bytes per split joint
		for (let i = 0; i < this.layout.bridge.phases.length; i++) {
			size += this.layout.bridge.phases[i].pistonGuids.length * 36;
			size += this.layout.bridge.phases[i].splitJoints.length * 64;
		}
		// 1 byte boolean for disableNewAdditions
		size += this.layout.bridge.phases.length;
		// 64 bytes per anchor
		size += this.layout.bridge.anchors.length * 64;

		// Post bridge ---------------------------------------------------------------------------------
		// 96 bytes per Z-axis vehicle
		size += this.layout.zedAxisVehicles.length * 96;
		// 256 bytes per vehicle, excluding checkpoint GUIDs
		size += this.layout.vehicles.length * 256;
		// 36 bytes per checkpoint GUID
		for (let i = 0; i < this.layout.vehicles.length; i++) {
			size += this.layout.vehicles[i].checkpointGuids.length * 36;
		}
		// 96 bytes per vehicle stop trigger
		size += this.layout.vehicleStopTriggers.length * 96;
		// We're just going to assume nobody will use over 1 kB of data per timelines
		size += this.layout.eventTimelines.length * 1024;
		// 192 bytes per checkpoint
		size += this.layout.checkpoints.length * 192;
		// 64 or so bytes per terrain stretch
		size += this.layout.terrainStretches.length * 64;
		// 24 bytes per platform
		size += this.layout.platforms.length * 24;
		// We'll just assume no more than 1 kB per ramp
		size += this.layout.ramps.length * 1024;
		// 96 per vehicle restart phase
		size += this.layout.vehicleRestartPhases.length * 96;
		// 48 bytes per flying object
		size += this.layout.flyingObjects.length * 48;
		// 48 bytes per rock
		size += this.layout.rocks.length * 48;
		// 24 bytes per water block
		size += this.layout.waterBlocks.length * 24;
		// 64 bytes for budget
		size += 64;
		// 4 bytes for settings
		size += 4;
		// 84 bytes for 1st-dimension custom shape params to be safe
		size += this.layout.customShapes.length * 84;
		// Points, pins, and anchors
		for (let i = 0; i < this.layout.customShapes.length; i++) {
			// 8 bytes per point
			size += this.layout.customShapes[i].pointsLocalSpace.length * 8;
			// 12 bytes per static pin
			size += this.layout.customShapes[i].staticPins.length * 12;
			// 36 bytes per dynamic anchor GUID
			size += this.layout.customShapes[i].dynamicAnchorGuids.length * 36;
		}
		// 8 bytes for workshop ID, another for leaderboard ID, 64 for title, figure out description, 16 bytes per tag
		size += 80;
		size += this.layout.workshop.description.length;
		size += this.layout.workshop.tags.length * 16;
		// 48 bytes per support pillar
		size += this.layout.supportPillars.length * 48;
		// 32 bytes per pillar
		size += this.layout.pillars.length * 32;

		return size;

	}

	writeByte(value) {
		this.buffer.writeUInt8(value, this.offset);
		this.offset++;
	}
	writeBytes(value, count) {
		for (let i = 0; i < count; i++) {
			this.writeByte(value[i]);
		}
	}
	writeBool(value) {
		this.writeByte(value ? 1 : 0);
	}
	writeInt16(value) {
		this.buffer.writeInt16LE(value, this.offset);
		this.offset += 2;
	}
	writeInt32(value) {
		this.buffer.writeInt32LE(value, this.offset);
		this.offset += 4;
	}
	writeFloat(value) {
		this.buffer.writeFloatLE(value, this.offset);
		this.offset += 4;
	}
	writeString(value) {
		this.writeInt16(value.length);
		this.buffer.write(value, this.offset);
		this.offset += value.length;
	}
	writeByteArray(value) {
		this.writeInt32(value.length);
		this.writeBytes(value, value.length);
	}
	writeVec3(value) {
		this.writeFloat(value.x);
		this.writeFloat(value.y);
		this.writeFloat(value.z);
	}
	writeVec2(value) {
		this.writeFloat(value.x);
		this.writeFloat(value.y);
	}
	writeColor(value) {
		this.writeByte(value.r * 255);
		this.writeByte(value.g * 255);
		this.writeByte(value.b * 255);
	}
	writeQuaternion(value) {
		this.writeFloat(value.x);
		this.writeFloat(value.y);
		this.writeFloat(value.z);
		this.writeFloat(value.w);
	}

	findVehicleByGuid(guid) {
		for (let i = 0; i < this.layout.vehicles.length; i++) {
			if (this.layout.vehicles[i].guid === guid) {
				return this.layout.vehicles[i];
			}
		}
		return null;
	}

	serializeAnchorsBinary() {
		this.writeInt32(this.layout.anchors.length);
		for (let i = 0; i < this.layout.anchors.length; i++) {
			let anchor = this.layout.anchors[i];
			this.writeVec3(anchor.pos);
			this.writeBool(anchor.isAnchor);
			this.writeBool(anchor.isSplit);
			this.writeString(anchor.guid);
		}
	}
	serializeHydraulicPhasesBinary() {
		this.writeInt32(this.layout.phases.length);
		for (let i = 0; i < this.layout.phases.length; i++) {
			let phase = this.layout.phases[i];
			this.writeFloat(phase.timeDelay);
			this.writeString(phase.guid);
		}
	}
	serializePreBridgeBinary() {
		// Version
		// if the layout is modded, the version will be negative
		let version = MAX_LAYOUT_VERSION;
		if (this.layout.isModded) {
			version *= -1;
		}
		this.writeInt32(version);
		this.writeString(this.layout.themeStubKey);
		this.serializeAnchorsBinary();
		this.serializeHydraulicPhasesBinary();
	}
	serializeBridgeBinary(bridgeOnly) {
		let b = this.layout.bridge;
		this.writeInt32(MAX_BRIDGE_VERSION);
		// Joints
		this.writeInt32(b.joints.length);
		for (let i = 0; i < b.joints.length; i++) {
			let j = b.joints[i];
			this.writeVec3(j.pos);
			this.writeBool(j.isAnchor);
			this.writeBool(j.isSplit);
			this.writeString(j.guid);
		}
		// Edges
		this.writeInt32(b.edges.length);
		for (let i = 0; i < b.edges.length; i++) {
			let e = b.edges[i];
			this.writeInt32(e.materialType);
			this.writeString(e.nodeAGuid);
			this.writeString(e.nodeBGuid);
			this.writeInt32(e.jointAPart);
			this.writeInt32(e.jointBPart);
		}
		// Springs
		this.writeInt32(b.springs.length);
		for (let i = 0; i < b.springs.length; i++) {
			let s = b.springs[i];
			this.writeFloat(s.normalizedValue);
			this.writeString(s.nodeAGuid);
			this.writeString(s.nodeBGuid);
			this.writeString(s.guid);
		}
		// Pistons
		this.writeInt32(b.pistons.length);
		for (let i = 0; i < b.pistons.length; i++) {
			let p = b.pistons[i];
			this.writeFloat(p.normalizedValue);
			this.writeString(p.nodeAGuid);
			this.writeString(p.nodeBGuid);
			this.writeString(p.guid);
		}
		// Phases
		this.writeInt32(b.phases.length);
		for (let i = 0; i < b.phases.length; i++) {
			let p = b.phases[i];
			this.writeString(p.hydraulicPhaseGuid);

			this.writeInt32(p.pistonGuids.length);
			for (let j = 0; j < p.pistonGuids.length; j++) {
				this.writeString(p.pistonGuids[j]);
			}

			this.writeInt32(p.splitJoints.length);
			for (let j = 0; j < p.splitJoints.length; j++) {
				let sj = p.splitJoints[j];
				this.writeString(sj.guid);
				this.writeInt32(sj.state);
			}

			this.writeBool(p.disableNewAdditions);
		}
		// Anchors
		this.writeInt32(b.anchors.length);
		for (let i = 0; i < b.anchors.length; i++) {
			let a = b.anchors[i];
			this.writeVec3(a.pos);
			this.writeBool(a.isAnchor);
			this.writeBool(a.isSplit);
			this.writeString(a.guid);
		}

		// Trim the buffer if only the bridge is deserialized
		if (bridgeOnly) {
			this.buffer = this.buffer.slice(0, this.offset);
		}
	}
	serializePostBridgeBinary() {
		// Z Axis Vehicles
		this.writeInt32(this.layout.zedAxisVehicles.length);
		for (let i = 0; i < this.layout.zedAxisVehicles.length; i++) {
			let v = this.layout.zedAxisVehicles[i];
			this.writeVec2(v.pos);
			this.writeString(v.prefabName);
			this.writeString(v.guid);
			this.writeFloat(v.timeDelay);
			this.writeFloat(v.speed);
			this.writeQuaternion(v.rot);
			this.writeFloat(v.rotationDegrees);
		}

		// Vehicles
		this.writeInt32(this.layout.vehicles.length);
		for (let i = 0; i < this.layout.vehicles.length; i++) {
			let v = this.layout.vehicles[i];
			this.writeString(v.displayName);
			this.writeVec2(v.pos);
			this.writeQuaternion(v.rot);
			this.writeString(v.prefabName);
			this.writeFloat(v.targetSpeed);
			this.writeFloat(v.mass);
			this.writeFloat(v.brakingForceMultiplier);
			this.writeInt32(v.strengthMethod);
			this.writeFloat(v.acceleration);
			this.writeFloat(v.maxSlope);
			this.writeFloat(v.desiredAccleration);
			this.writeFloat(v.shocksMultiplier);
			this.writeFloat(v.rotationDegrees);
			this.writeFloat(v.timeDelay);
			this.writeBool(v.idleOnDownhill);
			this.writeBool(v.flipped);
			this.writeBool(v.orderedCheckpoints);
			this.writeString(v.guid);

			this.writeInt32(v.checkpointGuids.length);
			for (let j = 0; j < v.checkpointGuids.length; j++) {
				this.writeString(v.checkpointGuids[j]);
			}
		}

		// Vehicle stop triggers
		this.writeInt32(this.layout.vehicleStopTriggers.length);
		for (let i = 0; i < this.layout.vehicleStopTriggers.length; i++) {
			let t = this.layout.vehicleStopTriggers[i];
			this.writeVec2(t.pos);
			this.writeQuaternion(t.rot);
			this.writeFloat(t.height);
			this.writeFloat(t.rotationDegrees);
			this.writeBool(t.flipped);
			this.writeString(t.prefabName);
			this.writeString(t.stopVehicleGuid);
		}

		// Timelines
		this.writeInt32(this.layout.eventTimelines.length);
		for (let i = 0; i < this.layout.eventTimelines.length; i++) {
			let t = this.layout.eventTimelines[i];
			this.writeString(t.checkpointGuid);

			this.writeInt32(t.stages.length);
			for (let j = 0; j < t.stages.length; j++) {
				let s = t.stages[j];
				this.writeInt32(s.units.length);
				for (let k = 0; k < s.units.length; k++) {
					let u = s.units[k];
					this.writeString(u.guid);
				}
			}
		}

		// Checkpoints
		this.writeInt32(this.layout.checkpoints.length);
		for (let i = 0; i < this.layout.checkpoints.length; i++) {
			let c = this.layout.checkpoints[i];
			this.writeVec2(c.pos);
			this.writeString(c.prefabName);
			this.writeString(c.vehicleGuid);
			this.writeString(c.vehicleRestartPhaseGuid);
			this.writeBool(c.triggerTimeline);
			this.writeBool(c.stopVehicle);
			this.writeBool(c.reverseVehicleOnRestart);
			this.writeString(c.guid);
		}

		// Terrain stretches
		this.writeInt32(this.layout.terrainStretches.length);
		for (let i = 0; i < this.layout.terrainStretches.length; i++) {
			let s = this.layout.terrainStretches[i];
			this.writeVec3(s.pos);
			this.writeString(s.prefabName);
			this.writeFloat(s.heightAdded);
			this.writeFloat(s.rightEdgeWaterHeight);
			this.writeInt32(s.terrainIslandType);
			this.writeInt32(s.variantIndex);
			this.writeBool(s.flipped);
			this.writeBool(s.lockPosition);
		}

		// Platforms
		this.writeInt32(this.layout.platforms.length);
		for (let i = 0; i < this.layout.platforms.length; i++) {
			let p = this.layout.platforms[i];
			this.writeVec2(p.pos);
			this.writeFloat(p.width);
			this.writeFloat(p.height);
			this.writeBool(p.flipped);
			this.writeBool(p.solid);
		}

		// Ramps
		this.writeInt32(this.layout.ramps.length);
		for (let i = 0; i < this.layout.ramps.length; i++) {
			let r = this.layout.ramps[i];
			this.writeVec2(r.pos);

			this.writeInt32(r.controlPoints.length);
			for (let j = 0; j < r.controlPoints.length; j++) {
				this.writeVec2(r.controlPoints[j]);
			}

			this.writeFloat(r.height);
			this.writeInt32(r.numSegments);
			this.writeInt32(r.splineType);
			this.writeBool(r.flippedVertical);
			this.writeBool(r.flippedHorizontal);
			this.writeBool(r.hideLegs);
			this.writeBool(r.flippedLegs);

			this.writeInt32(r.linePoints.length);
			for (let j = 0; j < r.linePoints.length; j++) {
				this.writeVec2(r.linePoints[j]);
			}
		}

		// Vehicle restart phases
		this.writeInt32(this.layout.vehicleRestartPhases.length);
		for (let i = 0; i < this.layout.vehicleRestartPhases.length; i++) {
			let p = this.layout.vehicleRestartPhases[i];
			this.writeFloat(p.timeDelay);
			this.writeString(p.guid);
			this.writeString(p.vehicleGuid);
		}

		// Flying objects
		this.writeInt32(this.layout.flyingObjects.length);
		for (let i = 0; i < this.layout.flyingObjects.length; i++) {
			let f = this.layout.flyingObjects[i];
			this.writeVec3(f.pos);
			this.writeVec3(f.scale);
			this.writeString(f.prefabName);
		}

		// Rocks
		this.writeInt32(this.layout.rocks.length);
		for (let i = 0; i < this.layout.rocks.length; i++) {
			let r = this.layout.rocks[i];
			this.writeVec3(r.pos);
			this.writeVec3(r.scale);
			this.writeString(r.prefabName);
			this.writeBool(r.flipped);
		}

		// Water blocks
		this.writeInt32(this.layout.waterBlocks.length);
		for (let i = 0; i < this.layout.waterBlocks.length; i++) {
			let w = this.layout.waterBlocks[i];
			this.writeVec3(w.pos);
			this.writeFloat(w.width);
			this.writeFloat(w.height);
			this.writeBool(w.lockPosition);
		}

		// Budget
		this.writeInt32(this.layout.budget.cash); // Cash
		this.writeInt32(this.layout.budget.road); // Road
		this.writeInt32(this.layout.budget.wood); // Wood
		this.writeInt32(this.layout.budget.steel); // Steel
		this.writeInt32(this.layout.budget.hydraulics); // Hydraulics
		this.writeInt32(this.layout.budget.rope); // Rope
		this.writeInt32(this.layout.budget.cable); // Cable
		this.writeInt32(this.layout.budget.spring); // Spring
		this.writeInt32(this.layout.budget.bungeeRope); // Bungee rope
		this.writeBool(this.layout.budget.allowWood); // Allow wood
		this.writeBool(this.layout.budget.allowSteel); // Allow steel
		this.writeBool(this.layout.budget.allowHydraulics); // Allow hydraulics
		this.writeBool(this.layout.budget.allowRope); // Allow rope
		this.writeBool(this.layout.budget.allowCable); // Allow cable
		this.writeBool(this.layout.budget.allowSpring); // Allow spring
		this.writeBool(this.layout.budget.allowReinforcedRoad); // Allow reinforced road

		// Settings
		this.writeBool(this.layout.settings.hydraulicsControllerEnabled); // Hydraulics controller enabled
		this.writeBool(this.layout.settings.unbreakable); // Unbreakable

		// Custom shapes
		this.writeInt32(this.layout.customShapes.length);
		for (let i = 0; i < this.layout.customShapes.length; i++) {
			let c = this.layout.customShapes[i];
			this.writeVec3(c.pos);
			this.writeQuaternion(c.rot);
			this.writeVec3(c.scale);
			this.writeBool(c.flipped);
			this.writeBool(c.dynamic);
			this.writeBool(c.collidesWithRoad);
			this.writeBool(c.collidesWithNodes);
			this.writeBool(c.collidesWithSplitNodes);
			this.writeFloat(c.rotationDegrees);
			this.writeColor(c.color);
			this.writeFloat(c.mass);
			this.writeFloat(c.bounciness);
			this.writeFloat(c.pinMotorStrength);
			this.writeFloat(c.pinTargetVelocity);

			this.writeInt32(c.pointsLocalSpace.length);  // Points
			for (let j = 0; j < c.pointsLocalSpace.length; j++) {
				this.writeVec2(c.pointsLocalSpace[j]);
			}

			this.writeInt32(c.staticPins.length); // Static pins
			for (let j = 0; j < c.staticPins.length; j++) {
				this.writeVec3(c.staticPins[j]);
			}

			this.writeInt32(c.dynamicAnchorGuids.length); // Dynamic anchors
			for (let j = 0; j < c.dynamicAnchorGuids.length; j++) {
				this.writeString(c.dynamicAnchorGuids[j]);
			}

		}

		// Workshop
		this.writeString(this.layout.workshop.id);
		this.writeString(this.layout.workshop.leaderboardId);
		this.writeString(this.layout.workshop.title);
		this.writeString(this.layout.workshop.description);
		this.writeBool(this.layout.workshop.autoplay);

		this.writeInt32(this.layout.workshop.tags.length);
		for (let i = 0; i < this.layout.workshop.tags.length; i++) {
			this.writeString(this.layout.workshop.tags[i]);
		}

		// Support pillars
		this.writeInt32(this.layout.supportPillars.length);
		for (let i = 0; i < this.layout.supportPillars.length; i++) {
			let p = this.layout.supportPillars[i];
			this.writeVec3(p.pos);
			this.writeVec3(p.scale);
			this.writeString(p.prefabName);
		}

		// Pillars
		this.writeInt32(this.layout.pillars.length);
		for (let i = 0; i < this.layout.pillars.length; i++) {
			let p = this.layout.pillars[i];
			this.writeVec3(p.pos);
			this.writeFloat(p.height);
			this.writeString(p.prefabName);
		}
	}
	// PTF support
	serializeModDataBinary() {
		// Mod metadata
		this.writeInt16(this.layout.modData.mods.length);
		for (let i = 0; i < this.layout.modData.mods.length; i++) {
			let m = this.layout.modData.mods[i];
			// Format as a string (PTF uses ByteSerializer.SerializeStrings)
			let str = `${m.name}\u058D${m.version}\u058D${m.settings.join("|")}`;
			this.writeString(str);
		}

		// Mod save data
		this.writeInt32(this.layout.modData.modSaveData.length);
		for (let i = 0; i < this.layout.modData.modSaveData.length; i++) {
			let m = this.layout.modData.modSaveData[i];
			this.writeString(`${m.name}\u058D${m.version}`);
			this.writeByteArray(
				// base64 decode
				atob(m.data).split("").map(c => c.charCodeAt(0))
			)
		}
	}

	serializeLayout() {
		this.serializePreBridgeBinary();
		this.serializeBridgeBinary(false);
		this.serializePostBridgeBinary();

		if (this.layout.isModded) {
			this.serializeModDataBinary();
		}

		// Make sure to trim the buffer to the actual size
		this.buffer = this.buffer.slice(0, this.offset);
	}

	fromJSON(json) {
		let j = JSON.parse(json);
		return unCSharpifyKeys(j);
	}
}


class SlotDeserializer {
	constructor(buffer) {
		this.data = buffer;
		this.offset = 0;
		this.errors = [];
		this.slot = {
			version: MAX_SLOT_VERSION
		};
	}

	readByte() {
		const byte = this.data[this.offset];
		this.offset++;
		return byte;
	}
	readBytes(count) {
		const bytes = this.data.slice(this.offset, this.offset + count);
		this.offset += count;
		return bytes;
	}
	readBool() {
		return this.readByte() !== 0;
	}
	readInt16() {
		const value = this.readBytes(2);
		return new Uint16Array(value)[0];
	}
	readInt32() {
		const value = this.readBytes(4);
		let buf = new ArrayBuffer(4);
		let view = new DataView(buf);

		for (let i = 0; i < 4; i++) {
			view.setUint8(i, value[3 - i]);
		}

		return view.getInt32(0)
	}
	readLong() {
		let val = this.data.readBigInt64LE(this.offset);
		this.offset += 8;
		return val;
	}
	readFloat() {
		// This is a bit of a weird IEEE 754 float implementation, but it works
		let buf = new ArrayBuffer(4);
		let view = new DataView(buf);
		let bytes = this.readBytes(4);
		// reverse the bytes
		for (let i = 0; i < 4; i++) {
			view.setUint8(i, bytes[3 - i]);
		}
		return view.getFloat32(0);
	}
	readString() {
		// I don't know how this works, I just ported it from the original code
		let num = this.readByte();
		if (num < 0) {
			return "";
		}
		if (num === 0x00) {
			let num2 = this.readInt32();
			return this.readBytes(num2).toString();
		}
		if (num === 0x01) {
			let num3 = this.readInt32();
			let num4 = num3 * 2;
			return this.readBytes(num4).toString();
		}
	}
	readByteArray() {
		const length = this.readInt32();
		return this.readBytes(length);
	}
	readVec3() {
		const x = this.readFloat();
		const y = this.readFloat();
		const z = this.readFloat();
		return {
			'x': x,
			'y': y,
			'z': z
		};
	}
	readVec2() {
		const x = this.readFloat();
		const y = this.readFloat();
		return {
			'x': x,
			'y': y
		};
	}
	readColor() {
		const r = this.readByte();
		const g = this.readByte();
		const b = this.readByte();
		return {
			'r': r / 255,
			'g': g / 255,
			'b': b / 255,
			'a': 1.0
		};
	}
	readQuaternion() {
		const x = this.readFloat();
		const y = this.readFloat();
		const z = this.readFloat();
		const w = this.readFloat();
		return {
			'x': x,
			'y': y,
			'z': z,
			'w': w
		};
	}

	assert(condition, message) {
		if (!condition) {
			this.errors.push(message);
		}
	}

	readTypeEntry() {
		let num = this.readByte();
		if (num < 0) {
			return {
				'typeName': null,
				'assemblyName': null
			};
		}
		if (num === 0x2F) {
			// Type name
			let key = this.readInt32();
			let typeAndAssembly = this.readString().split(", ");
			let typeName = typeAndAssembly[0];
			let assemblyName = typeAndAssembly[1];

			return {
				'typeName': typeName,
				'assemblyName': assemblyName
			}
		} else if (num === 0x30) {
			// Type ID
			// Assume the deserializer has an override and continue
		} else {
			this.errors.push("Unknown type entry: " + num);
			return {
				'typeName': null,
				'assemblyName': null
			}
		}
	}

	deserializeSlot() {
		// A bit on how this works:
		//   Save slots are serialized using Odin Serializer. Unfortunately, this is JavaScript, so we can't use the
		//   serializer directly. Instead, we have to use a very static implementation that only reads and writes the
		//   exact bytes we know should be read and written.

		this.assert(this.readByte() === 0x02, "Expected unnamed start of reference node");
		let typeEntry = this.readTypeEntry();
		this.assert(typeEntry.typeName === "BridgeSaveSlotData", "Expected typename to be BridgeSaveSlotData");
		this.assert(typeEntry.assemblyName === "Assembly-CSharp", "Expected assembly to be Assembly-CSharp");
		this.assert(this.readInt32() === 0, "Expected node ID to be 0");

		// Version
		let type = this.readByte();
		this.assert(type === 0x17, "Expected type to be NamedInt");
		let name = this.readString();
		this.assert(name === "m_Version", "Expected name to be m_Version");
		this.slot.version = this.readInt32();
		if (this.slot.version > MAX_SLOT_VERSION) {
			this.errors.push("Warning: Slot version is higher than supported version");
		}

		// Physics version
		type = this.readByte();
		this.assert(type === 0x17, "Expected type to be NamedInt");
		name = this.readString();
		this.assert(name === "m_PhysicsVersion", "Expected name to be m_PhysicsVersion");
		this.slot.physicsVersion = this.readInt32();
		if (this.slot.physicsVersion > MAX_PHYSICS_VERSION) {
			this.errors.push("Warning: Physics version is higher than supported version");
		}

		// Slot ID
		type = this.readByte();
		this.assert(type === 0x17, "Expected type to be NamedInt");
		name = this.readString();
		this.assert(name === "m_SlotID", "Expected name to be m_SlotID");
		this.slot.slotID = this.readInt32();

		// Slot display name
		type = this.readByte();
		this.assert(type === 0x27, "Expected type to be NamedString");
		name = this.readString();
		this.assert(name === "m_DisplayName", "Expected name to be m_DisplayName");
		this.slot.displayName = this.readString();

		// Slot filename
		type = this.readByte();
		this.assert(type === 0x27, "Expected type to be NamedString");
		name = this.readString();
		this.assert(name === "m_SlotFilename", "Expected name to be m_SlotFilename");
		this.slot.slotFilename = this.readString();

		// Budget
		type = this.readByte();
		this.assert(type === 0x17, "Expected type to be NamedInt");
		name = this.readString();
		this.assert(name === "m_Budget", "Expected name to be m_Budget");
		this.slot.budget = this.readInt32();

		// Last write time in C# ticks
		type = this.readByte();
		this.assert(type === 0x1B, "Expected type to be NamedLong");
		name = this.readString();
		this.assert(name === "m_LastWriteTimeTicks", "Expected name to be m_LastWriteTimeTicks");
		this.slot.lastWriteTimeTicks = this.readLong();

		// Bridge
		type = this.readByte();
		this.assert(type === 0x01, "Expected named start of reference node");
		name = this.readString();
		this.assert(name === "m_Bridge", "Expected name to be m_Bridge");
		let te = this.readTypeEntry();
		this.assert(te.typeName === "System.Byte[]", "Expected type to be System.Byte[]");
		this.assert(te.assemblyName === "mscorlib", "Expected assembly to be mscorlib");
		this.assert(this.readInt32() === 1, "Expected node ID to be 1");

		this.assert(this.readByte() === 0x08, "Expected primitive array entry");
		let num = this.readInt32();
		let num2 = this.readInt32();
		let num3 = num * num2;
		let bridgeData = this.readBytes(num3);

		this.assert(this.readByte() === 0x05, "Expected end of reference node");

		// Thumbnail
		type = this.readByte();
		if (type === 0x2D) {
			// Named null, no thumbnail
			this.assert(this.readString() === "m_Thumb", "Expected name to be m_Thumb");
			this.slot.thumbnail = null;
		} else if (type === 0x01) {
			name = this.readString();
			this.assert(name === "m_Thumb", "Expected name to be m_Thumb");
			this.readByte();  // Type ID entry
			this.readInt32();  // Type ID
			this.readInt32();  // Node ID, we don't care about this since it's with a type ID

			this.assert(this.readByte() === 0x08, "Expected primitive array entry");
			num = this.readInt32();
			num2 = this.readInt32();
			num3 = num * num2;
			this.slot.thumbnail = this.readBytes(num3);

			this.assert(this.readByte() === 0x05, "Expected end of reference node");
		}

		// If the layout uses unlimited materials
		type = this.readByte();
		this.assert(type === 0x2B, "Expected type to be NamedBoolean");
		name = this.readString();
		this.assert(name === "m_UsingUnlimitedMaterials", "Expected name to be m_UsingUnlimitedMaterials");
		this.slot.usingUnlimitedMaterials = this.readBool();

		// If the layout uses unlimited budget
		type = this.readByte();
		this.assert(type === 0x2B, "Expected type to be NamedBoolean");
		name = this.readString();
		this.assert(name === "m_UsingUnlimitedBudget", "Expected name to be m_UsingUnlimitedBudget");
		this.slot.usingUnlimitedBudget = this.readBool();

		// End of node
		this.assert(this.readByte() === 0x05, "Expected end of node");

		// Now, let's parse the bridge data
		// We can use the same code as the layout parser, but just call the deserializeBridge() method
		let d = new Deserializer(bridgeData);
		d.deserializeBridge();
		this.slot.bridge = d.layout.bridge;
	}

	dumpJSON() {
		let copySlot = JSON.parse(JSON.stringify(this.slot, (_, v) => typeof v === 'bigint' ? Number(v) : v));
		// base64 encode the thumbnail
		if (this.slot.thumbnail) {
			copySlot.thumbnail = Buffer.from(copySlot.thumbnail).toString('base64');
		} else {
			copySlot.thumbnail = null;
		}

		copySlot = cSharpifyKeys(copySlot);
		return JSON.stringify(copySlot, (_, v) => typeof v === 'bigint' ? Number(v) : v, 2);
	}
}


class SlotSerializer {
	constructor(slot) {
		if (typeof slot === 'object') {
			this.slot = slot;
		} else if (typeof slot === 'string') {
			this.slot = this.fromJSON(slot);
		}

		let size = this.estimateSize();
		console.log("Allocating " + size + " bytes");
		this.buffer = Buffer.alloc(size);
		this.offset = 0;
	}

	estimateSize() {
		let size = 0;
		size += 4;  // Version
		size += 4;  // Physics version
		size += 4;  // Slot ID
		size += this.slot.displayName.length + 4;  // Slot display name
		size += this.slot.slotFilename.length + 4;  // Slot filename
		size += 4;  // Budget
		size += 8;  // Last write time in C# ticks
		size += this.slot.thumbnail ? this.slot.thumbnail.length + 4 : 4;  // Thumbnail
		size += 1;  // Using unlimited materials
		size += 1;  // Using unlimited budget

		// Bridge
		size += 4;  // Bridge version
		size += this.slot.bridge.anchors.length * 128;  // Anchors
		size += this.slot.bridge.joints.length * 128;  // Joints
		size += this.slot.bridge.edges.length * 128;  // Edges
		size += this.slot.bridge.pistons.length * 128;  // Pistons
		size += this.slot.bridge.springs.length * 128;  // Springs
		// Phases
		size += this.slot.bridge.phases.length * 128;
		for (let i = 0; i < this.slot.bridge.phases.length; i++) {
			let phase = this.slot.bridge.phases[i];
			size += phase.pistonGuids.length * 128;
			size += phase.splitJoints.length * 128;
		}

		// We'll add a kB for entries, names, etc
		size += 1024;

		return size;
	}

	writeByte(value) {
		this.buffer.writeUInt8(value, this.offset);
		this.offset++;
	}
	writeBytes(value, count) {
		for (let i = 0; i < count; i++) {
			this.writeByte(value[i]);
		}
	}
	writeBool(value) {
		this.writeByte(value ? 1 : 0);
	}
	writeInt16(value) {
		this.buffer.writeInt16LE(value, this.offset);
		this.offset += 2;
	}
	writeInt32(value) {
		this.buffer.writeInt32LE(value, this.offset);
		this.offset += 4;
	}
	writeFloat(value) {
		this.buffer.writeFloatLE(value, this.offset);
		this.offset += 4;
	}
	writeString(value) {
		this.writeByte(0x00);
		this.writeInt32(value.length);
		this.buffer.write(value, this.offset);
		this.offset += value.length;
	}
	writeByteArray(value) {
		this.writeInt32(value.length);
		this.writeBytes(value, value.length);
	}
	writeVec3(value) {
		this.writeFloat(value.x);
		this.writeFloat(value.y);
		this.writeFloat(value.z);
	}
	writeVec2(value) {
		this.writeFloat(value.x);
		this.writeFloat(value.y);
	}
	writeColor(value) {
		this.writeByte(value.r * 255);
		this.writeByte(value.g * 255);
		this.writeByte(value.b * 255);
	}
	writeQuaternion(value) {
		this.writeFloat(value.x);
		this.writeFloat(value.y);
		this.writeFloat(value.z);
		this.writeFloat(value.w);
	}
	writeLong(value) {
		this.buffer.writeBigUInt64LE(value, this.offset);
		this.offset += 8;
	}

	serializeSlot() {
		this.writeByte(0x02);  // Start of node
		this.writeByte(0x2F);  // Type name
		this.writeInt32(0);    // Node ID
		this.writeString("BridgeSaveSlotData, Assembly-CSharp");  // Type name and assembly name
		this.writeInt32(0);    // Idk

		// Version
		this.writeByte(0x17);  // Named int
		this.writeString("m_Version");
		this.writeInt32(MAX_SLOT_VERSION);

		// Physics version
		this.writeByte(0x17);  // Named int
		this.writeString("m_PhysicsVersion");
		this.writeInt32(MAX_PHYSICS_VERSION);

		// Slot ID
		this.writeByte(0x17);  // Named int
		this.writeString("m_SlotID");
		this.writeInt32(this.slot.slotID);

		// Display name
		this.writeByte(0x27);  // Named string
		this.writeString("m_DisplayName");
		this.writeString(this.slot.displayName);

		// Slot filename
		this.writeByte(0x27);  // Named string
		this.writeString("m_SlotFilename");
		this.writeString(this.slot.slotFilename);

		// Budget
		this.writeByte(0x17);  // Named int
		this.writeString("m_Budget");
		this.writeInt32(this.slot.budget);

		// Last write time
		this.writeByte(0x1B);  // Named long
		this.writeString("m_LastWriteTimeTicks");
		this.writeLong(BigInt(this.slot.lastWriteTimeTicks));

		// Bridge
		this.writeByte(0x01);  // Named start of reference node
		this.writeString("m_Bridge");
		this.writeByte(0x2F);  // Type name
		this.writeInt32(1);    // Node ID
		this.writeString("System.Byte[], mscorlib");  // Type name and assembly name
		this.writeInt32(1);    // Also node ID
		this.writeByte(0x08);  // Primitive array
		// Let's prepare the bridge binary
		let layout = {'bridge': this.slot.bridge}
		// these things don't matter
		layout.anchors = [];
		layout.phases = [];
		layout.zedAxisVehicles = [];
		layout.vehicles = [];
		layout.vehicleStopTriggers = [];
		layout.eventTimelines = [];
		layout.checkpoints = [];
		layout.terrainStretches = [];
		layout.platforms = [];
		layout.ramps = [];
		layout.vehicleRestartPhases = [];
		layout.flyingObjects = [];
		layout.rocks = [];
		layout.waterBlocks = [];
		layout.customShapes = [];
		layout.supportPillars = [];
		layout.pillars = [];
		layout.workshop = {
			id: "", title: "", description: "", leaderboardId: "", tags: []
		}
		let d = new Serializer(layout);
		d.serializeBridgeBinary(true);
		this.writeInt32(d.buffer.length);  // Array length
		this.writeInt32(1);          // Array height
		this.writeBytes(d.buffer, d.buffer.length);  // Array data

		this.writeByte(0x05);  // End of node

		// Thumbnail
		if (this.slot.thumbnail === null) {
			this.writeByte(0x2D);  // Named null
			this.writeString("m_Thumb");  // Name
		} else {
			this.writeByte(0x01);  // Named start of reference node
			this.writeString("m_Thumb");  // Name
			this.writeByte(0x30);  // Type ID entry
			this.writeInt32(1);  // Type ID
			this.writeInt32(2);  // Node ID

			this.writeByte(0x08);  // Primitive array
			this.writeInt32(1);  // Array height
			this.writeInt32(this.slot.thumbnail.length);  // Array length
			this.writeBytes(this.slot.thumbnail, this.slot.thumbnail.length);

			this.writeByte(0x05);  // End of node
		}

		// Using unlimited materials
		this.writeByte(0x2B);  // Named boolean
		this.writeString("m_UsingUnlimitedMaterials");  // Name
		this.writeBool(this.slot.usingUnlimitedMaterials);

		// Using unlimited budget
		this.writeByte(0x2B);  // Named boolean
		this.writeString("m_UsingUnlimitedBudget");  // Name
		this.writeBool(this.slot.usingUnlimitedBudget);

		// End of node
		this.writeByte(0x05);


		// Make sure to resize the buffer to the correct size
		this.buffer = this.buffer.slice(0, this.offset);
	}

	fromJSON(json) {
		let j = JSON.parse(json);
		j = unCSharpifyKeys(j);
		if (j.thumbnail) {
			j.thumbnail = Buffer.from(j.thumbnail, "base64");
		}
		return j;
	}
}


module.exports = {
	Deserializer,
	Serializer,
	SlotDeserializer,
	SlotSerializer,
	MAX_LAYOUT_VERSION,
	MAX_BRIDGE_VERSION,
	MAX_SLOT_VERSION,
	MAX_PHYSICS_VERSION
}

},{"buffer/":2}],5:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],6:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":5,"buffer":6,"ieee754":7}],7:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}]},{},[4]);

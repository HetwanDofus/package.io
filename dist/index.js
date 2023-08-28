// src/binary/big-endian.reader.ts
var BigEndianReader = class _BigEndianReader {
  static INT_SIZE = 32;
  static SHORT_SIZE = 16;
  static SHORT_MIN_VALUE = -32768;
  static SHORT_MAX_VALUE = 32767;
  static USHORT_MAX_VALUE = 65536;
  static CHUNCK_BIT_SIZE = 7;
  static MASK_10000000 = 128;
  static MASK_01111111 = 127;
  buffer;
  length;
  pointer = 0;
  constructor(buffer) {
    this.buffer = buffer;
    this.length = buffer.byteLength;
  }
  static from(buffer) {
    const copiedBuffer = Buffer.allocUnsafe(buffer.byteLength);
    buffer.copy(copiedBuffer);
    return new _BigEndianReader(copiedBuffer);
  }
  readVarInt() {
    let value = 0;
    let size = 0;
    while (size < _BigEndianReader.INT_SIZE) {
      const byte = this.readByte();
      const bit = (byte & _BigEndianReader.MASK_10000000) == _BigEndianReader.MASK_10000000;
      if (size > 0) {
        value |= (byte & _BigEndianReader.MASK_01111111) << size;
      } else {
        value |= byte & _BigEndianReader.MASK_01111111;
      }
      size += _BigEndianReader.CHUNCK_BIT_SIZE;
      if (bit === false) {
        return value;
      }
    }
    throw "Overflow varint : too much data";
  }
  readVarUInt() {
    return this.readVarInt() >>> 0;
  }
  readVarShort() {
    let value = 0;
    let offset = 0;
    while (offset < _BigEndianReader.SHORT_SIZE) {
      const byte = this.readByte();
      const bit = (byte & _BigEndianReader.MASK_10000000) == _BigEndianReader.MASK_10000000;
      if (offset > 0) {
        value |= (byte & _BigEndianReader.MASK_01111111) << offset;
      } else {
        value |= byte & _BigEndianReader.MASK_01111111;
      }
      offset += _BigEndianReader.CHUNCK_BIT_SIZE;
      if (!bit) {
        if (value > _BigEndianReader.SHORT_MAX_VALUE) {
          value -= _BigEndianReader.USHORT_MAX_VALUE;
        }
        return value;
      }
    }
    throw "Overflow var short : too much data";
  }
  readVarUShort() {
    return this.readVarShort() >>> 0;
  }
  readVarLong() {
    let low = 0;
    let high = 0;
    let size = 0;
    let lastByte = 0;
    while (size < 28) {
      lastByte = this.readByte();
      if ((lastByte & _BigEndianReader.MASK_10000000) == _BigEndianReader.MASK_10000000) {
        low |= (lastByte & _BigEndianReader.MASK_01111111) << size;
        size += 7;
      } else {
        low |= lastByte << size;
        return low;
      }
    }
    lastByte = this.readByte();
    if ((lastByte & _BigEndianReader.MASK_10000000) == _BigEndianReader.MASK_10000000) {
      low |= (lastByte & _BigEndianReader.MASK_01111111) << size;
      high = (lastByte & _BigEndianReader.MASK_01111111) >> 4;
      size = 3;
      while (size < 32) {
        lastByte = this.readByte();
        if ((lastByte & _BigEndianReader.MASK_10000000) == _BigEndianReader.MASK_10000000) {
          high |= (lastByte & _BigEndianReader.MASK_01111111) << size;
        } else {
          break;
        }
        size += 7;
      }
      high |= lastByte << size;
      return low & 4294967295 | high << 32;
    }
    low |= lastByte << size;
    high = lastByte >> 4;
    return low & 4294967295 | high << 32;
  }
  readVarULong() {
    let array = new Uint32Array([this.readVarLong()]);
    return array[0];
  }
  readByte() {
    const value = this.buffer.readUInt8(this.pointer);
    this.pointer += 1;
    return value;
  }
  readChar() {
    return String.fromCharCode(this.readByte());
  }
  readBoolean() {
    const value = this.buffer.readUInt8(this.pointer) === 1;
    this.pointer += 1;
    return value;
  }
  readShort() {
    const value = this.buffer.readInt16BE(this.pointer);
    this.pointer += 2;
    return value;
  }
  readUShort() {
    const value = this.buffer.readUInt16BE(this.pointer);
    this.pointer += 2;
    return value;
  }
  readInt() {
    const value = this.buffer.readInt32BE(this.pointer);
    this.pointer += 4;
    return value;
  }
  readUInt() {
    const value = this.buffer.readUInt32BE(this.pointer);
    this.pointer += 4;
    return value;
  }
  readLong() {
    const value = this.buffer.readInt32BE(this.pointer);
    this.pointer += 8;
    return value;
  }
  readULong() {
    const value = this.buffer.readUInt32BE(this.pointer);
    this.pointer += 4;
    return value;
  }
  readFloat() {
    const value = this.buffer.readFloatBE(this.pointer);
    this.pointer += 4;
    return value;
  }
  readDouble() {
    const value = this.buffer.readDoubleBE(this.pointer);
    this.pointer += 8;
    return value;
  }
  readUTF() {
    const length = this.readUShort();
    const prevPointer = this.pointer;
    this.pointer += length;
    return this.buffer.subarray(prevPointer, prevPointer + length).toString("utf8");
  }
  readUTFBytes(length) {
    const prevPointer = this.pointer;
    this.pointer += length;
    return this.buffer.subarray(prevPointer, prevPointer + length).toString("utf8");
  }
  getBuffer() {
    return this.buffer.subarray(this.pointer);
  }
  getPointer() {
    return this.pointer;
  }
  getRemaining() {
    return this.length - this.pointer;
  }
  setPointer(pointer) {
    if (pointer < 0) {
      throw "Invalid pointer";
    }
    this.pointer = pointer < 0 ? 0 : pointer;
    return this;
  }
};

// src/binary/big-endian.writer.ts
var BigEndianWriter = class _BigEndianWriter {
  static INT_SIZE = 32;
  static SHORT_SIZE = 16;
  static SHORT_MIN_VALUE = -32768;
  static SHORT_MAX_VALUE = 32767;
  static USHORT_MAX_VALUE = 65535;
  static CHUNCK_BIT_SIZE = 7;
  static MASK_10000000 = 128;
  static MASK_01111111 = 127;
  static DEFAULT_SIZE = 4 * 1024;
  expandSize;
  buffer;
  length;
  pointer = 0;
  constructor(buffer, expandSize = _BigEndianWriter.DEFAULT_SIZE) {
    this.buffer = buffer || Buffer.allocUnsafe(_BigEndianWriter.DEFAULT_SIZE);
    this.length = this.buffer.byteLength;
    this.expandSize = expandSize;
  }
  static from(size, expandSize = _BigEndianWriter.DEFAULT_SIZE) {
    return new _BigEndianWriter(Buffer.allocUnsafe(size), expandSize);
  }
  expandIfNeeded(size) {
    if (this.pointer + size <= this.length) {
      return;
    }
    const newBuffer = Buffer.allocUnsafe(
      this.buffer.byteLength + this.expandSize
    );
    this.buffer.copy(newBuffer);
    this.length = newBuffer.byteLength;
    this.buffer = newBuffer;
    Bun.gc(true);
  }
  writeVarInt(data) {
    if (data <= _BigEndianWriter.MASK_01111111) {
      return this.writeByte(data);
    }
    let i2 = 0;
    while (data !== 0) {
      let byte = data & _BigEndianWriter.MASK_01111111;
      i2++;
      data >>= _BigEndianWriter.CHUNCK_BIT_SIZE;
      if (data > 0) {
        byte |= _BigEndianWriter.MASK_10000000;
      }
      this.writeByte(byte);
    }
    return this;
  }
  writeVarUInt(data) {
    return this.writeVarInt(data);
  }
  writeVarShort(data) {
    if (data <= _BigEndianWriter.MASK_01111111) {
      return this.writeByte(data);
    }
    let i2 = 0;
    while (data !== 0) {
      let byte = data & _BigEndianWriter.MASK_01111111;
      i2++;
      data >>= _BigEndianWriter.CHUNCK_BIT_SIZE;
      if (data > 0) {
        byte |= _BigEndianWriter.MASK_10000000;
      }
      this.writeByte(byte);
    }
    return this;
  }
  writeVarUShort(data) {
    return this.writeVarShort(data);
  }
  writeVarLong(data) {
    if (data >> 32 === 0) {
      return this.writeVarInt(Number(data));
    }
    let low = data & 4294967295;
    let high = data >> 32;
    for (let i2 = 0; i2 < 4; i2++) {
      this.writeByte(
        Number(
          low & _BigEndianWriter.MASK_01111111 | _BigEndianWriter.MASK_10000000
        )
      );
      low >>= 7;
    }
    if ((high & 4294967288) === 0) {
      this.writeByte(Number(high << 4 | low));
    } else {
      this.writeByte(
        Number(
          (high << 4 | low) & _BigEndianWriter.MASK_01111111 | _BigEndianWriter.MASK_10000000
        )
      );
      high >>= 3;
      while (high >= 128) {
        this.writeByte(
          Number(
            high & _BigEndianWriter.MASK_01111111 | _BigEndianWriter.MASK_10000000
          )
        );
        high >>= 7;
      }
      this.writeByte(Number(high));
    }
    return this;
  }
  writeVarULong(data) {
    return this.writeVarLong(data);
  }
  writeByte(data) {
    const size = 1;
    this.expandIfNeeded(size);
    this.buffer.writeUInt8(data, this.pointer);
    this.pointer += size;
    return this;
  }
  writeBytes(data) {
    const size = data.byteLength;
    this.expandIfNeeded(size);
    this.buffer.set(data, this.pointer);
    this.pointer += size;
    return this;
  }
  writeBuffer(data) {
    const size = data.byteLength;
    this.expandIfNeeded(size);
    data.copy(this.buffer, this.pointer, 0);
    this.pointer += size;
    return this;
  }
  writeChar(data) {
    if (data.length !== 1) {
      throw new Error("Char must be a single character");
    }
    this.writeByte(data.charCodeAt(0));
    return this;
  }
  writeBoolean(data) {
    const size = 1;
    this.expandIfNeeded(size);
    this.buffer.writeUInt8(Number(data), this.pointer);
    this.pointer += size;
    return this;
  }
  writeShort(data) {
    const size = 2;
    this.expandIfNeeded(size);
    this.buffer.writeInt16BE(data, this.pointer);
    this.pointer += size;
    return this;
  }
  writeUShort(data) {
    const size = 2;
    this.expandIfNeeded(size);
    this.buffer.writeUInt16BE(data, this.pointer);
    this.pointer += size;
    return this;
  }
  writeInt(data) {
    const size = 4;
    this.expandIfNeeded(size);
    this.buffer.writeInt32BE(data, this.pointer);
    this.pointer += size;
    return this;
  }
  writeUInt(data) {
    const size = 4;
    this.expandIfNeeded(size);
    this.buffer.writeUInt32BE(data, this.pointer);
    this.pointer += size;
    return this;
  }
  writeLong(data) {
    const size = 4;
    this.expandIfNeeded(size);
    this.buffer.writeInt32BE(data, this.pointer);
    this.pointer += size;
    return this;
  }
  writeULong(data) {
    const size = 4;
    this.expandIfNeeded(size);
    this.buffer.writeUInt32BE(data, this.pointer);
    this.pointer += size;
    return this;
  }
  writeFloat(data) {
    const size = 4;
    this.expandIfNeeded(size);
    this.buffer.writeFloatBE(data, this.pointer);
    this.pointer += size;
    return this;
  }
  writeDouble(data) {
    const size = 8;
    this.expandIfNeeded(size);
    this.buffer.writeDoubleBE(data, this.pointer);
    this.pointer += size;
    return this;
  }
  writeUTF(data) {
    this.writeUShort(data.length);
    const encodingBytelength = Buffer.byteLength(data, "utf-8");
    this.expandIfNeeded(encodingBytelength);
    this.buffer.write(data, this.pointer, "utf-8");
    this.pointer += encodingBytelength;
    return this;
  }
  writeUTFBytes(data) {
    const encodingBytelength = Buffer.byteLength(data, "utf-8");
    this.expandIfNeeded(encodingBytelength);
    this.buffer.write(data, this.pointer, "utf-8");
    this.pointer += encodingBytelength;
    return this;
  }
  getData() {
    return this.buffer.buffer;
  }
  getBuffer() {
    return this.buffer.subarray(0, this.pointer);
  }
  getPointer() {
    return this.pointer;
  }
  getRemaining() {
    return this.length - this.pointer;
  }
  setPointer(pointer) {
    this.pointer = pointer;
    return this;
  }
};

// src/binary/big-endian-boolean-byte-wrapper.ts
var setFlag = (flag, offset, value) => {
  if (offset >= 8) {
    throw "offset must be lesser than 8";
  }
  return value ? flag | 1 << offset : flag & 255 - (1 << offset);
};
var getFlag = (flag, offset) => {
  if (offset >= 8) {
    throw "offset must be lesser than 8";
  }
  return (flag & 1 << offset) !== 0;
};

// src/d2o/context.ts
var D2oContext = class {
  indexes = /* @__PURE__ */ new Map();
  classesDataIndexes = /* @__PURE__ */ new Map();
  classesDefinitions = /* @__PURE__ */ new Map();
  classesDefinitionsIndexes = /* @__PURE__ */ new Map();
  dataProcessor;
};

// ../../node_modules/ts-pattern/dist/index.js
var t = Symbol.for("@ts-pattern/matcher");
var e = Symbol.for("@ts-pattern/isVariadic");
var n = "@ts-pattern/anonymous-select-key";
var r = (t2) => Boolean(t2 && "object" == typeof t2);
var i = (e2) => e2 && !!e2[t];
var s = (n2, o2, c2) => {
  if (i(n2)) {
    const e2 = n2[t](), { matched: r2, selections: i2 } = e2.match(o2);
    return r2 && i2 && Object.keys(i2).forEach((t2) => c2(t2, i2[t2])), r2;
  }
  if (r(n2)) {
    if (!r(o2))
      return false;
    if (Array.isArray(n2)) {
      if (!Array.isArray(o2))
        return false;
      let t2 = [], r2 = [], a = [];
      for (const s2 of n2.keys()) {
        const o3 = n2[s2];
        i(o3) && o3[e] ? a.push(o3) : a.length ? r2.push(o3) : t2.push(o3);
      }
      if (a.length) {
        if (a.length > 1)
          throw new Error("Pattern error: Using `...P.array(...)` several times in a single pattern is not allowed.");
        if (o2.length < t2.length + r2.length)
          return false;
        const e2 = o2.slice(0, t2.length), n3 = 0 === r2.length ? [] : o2.slice(-r2.length), i2 = o2.slice(t2.length, 0 === r2.length ? Infinity : -r2.length);
        return t2.every((t3, n4) => s(t3, e2[n4], c2)) && r2.every((t3, e3) => s(t3, n3[e3], c2)) && (0 === a.length || s(a[0], i2, c2));
      }
      return n2.length === o2.length && n2.every((t3, e2) => s(t3, o2[e2], c2));
    }
    return Object.keys(n2).every((e2) => {
      const r2 = n2[e2];
      return (e2 in o2 || i(a = r2) && "optional" === a[t]().matcherType) && s(r2, o2[e2], c2);
      var a;
    });
  }
  return Object.is(o2, n2);
};
var o = (e2) => {
  var n2, s2, a;
  return r(e2) ? i(e2) ? null != (n2 = null == (s2 = (a = e2[t]()).getSelectionKeys) ? void 0 : s2.call(a)) ? n2 : [] : Array.isArray(e2) ? c(e2, o) : c(Object.values(e2), o) : [];
};
var c = (t2, e2) => t2.reduce((t3, n2) => t3.concat(e2(n2)), []);
function u(t2) {
  return Object.assign(t2, { optional: () => l(t2), and: (e2) => m(t2, e2), or: (e2) => y(t2, e2), select: (e2) => void 0 === e2 ? p(t2) : p(e2, t2) });
}
function l(e2) {
  return u({ [t]: () => ({ match: (t2) => {
    let n2 = {};
    const r2 = (t3, e3) => {
      n2[t3] = e3;
    };
    return void 0 === t2 ? (o(e2).forEach((t3) => r2(t3, void 0)), { matched: true, selections: n2 }) : { matched: s(e2, t2, r2), selections: n2 };
  }, getSelectionKeys: () => o(e2), matcherType: "optional" }) });
}
function m(...e2) {
  return u({ [t]: () => ({ match: (t2) => {
    let n2 = {};
    const r2 = (t3, e3) => {
      n2[t3] = e3;
    };
    return { matched: e2.every((e3) => s(e3, t2, r2)), selections: n2 };
  }, getSelectionKeys: () => c(e2, o), matcherType: "and" }) });
}
function y(...e2) {
  return u({ [t]: () => ({ match: (t2) => {
    let n2 = {};
    const r2 = (t3, e3) => {
      n2[t3] = e3;
    };
    return c(e2, o).forEach((t3) => r2(t3, void 0)), { matched: e2.some((e3) => s(e3, t2, r2)), selections: n2 };
  }, getSelectionKeys: () => c(e2, o), matcherType: "or" }) });
}
function d(e2) {
  return { [t]: () => ({ match: (t2) => ({ matched: Boolean(e2(t2)) }) }) };
}
function p(...e2) {
  const r2 = "string" == typeof e2[0] ? e2[0] : void 0, i2 = 2 === e2.length ? e2[1] : "string" == typeof e2[0] ? void 0 : e2[0];
  return u({ [t]: () => ({ match: (t2) => {
    let e3 = { [null != r2 ? r2 : n]: t2 };
    return { matched: void 0 === i2 || s(i2, t2, (t3, n2) => {
      e3[t3] = n2;
    }), selections: e3 };
  }, getSelectionKeys: () => [null != r2 ? r2 : n].concat(void 0 === i2 ? [] : o(i2)) }) });
}
function v(t2) {
  return "number" == typeof t2;
}
function b(t2) {
  return "string" == typeof t2;
}
function w(t2) {
  return "bigint" == typeof t2;
}
var S = u(d(function(t2) {
  return true;
}));
var j = (t2) => Object.assign(u(t2), { startsWith: (e2) => {
  return j(m(t2, (n2 = e2, d((t3) => b(t3) && t3.startsWith(n2)))));
  var n2;
}, endsWith: (e2) => {
  return j(m(t2, (n2 = e2, d((t3) => b(t3) && t3.endsWith(n2)))));
  var n2;
}, minLength: (e2) => j(m(t2, ((t3) => d((e3) => b(e3) && e3.length >= t3))(e2))), maxLength: (e2) => j(m(t2, ((t3) => d((e3) => b(e3) && e3.length <= t3))(e2))), includes: (e2) => {
  return j(m(t2, (n2 = e2, d((t3) => b(t3) && t3.includes(n2)))));
  var n2;
}, regex: (e2) => {
  return j(m(t2, (n2 = e2, d((t3) => b(t3) && Boolean(t3.match(n2))))));
  var n2;
} });
var E = j(d(b));
var K = (t2) => Object.assign(u(t2), { between: (e2, n2) => K(m(t2, ((t3, e3) => d((n3) => v(n3) && t3 <= n3 && e3 >= n3))(e2, n2))), lt: (e2) => K(m(t2, ((t3) => d((e3) => v(e3) && e3 < t3))(e2))), gt: (e2) => K(m(t2, ((t3) => d((e3) => v(e3) && e3 > t3))(e2))), lte: (e2) => K(m(t2, ((t3) => d((e3) => v(e3) && e3 <= t3))(e2))), gte: (e2) => K(m(t2, ((t3) => d((e3) => v(e3) && e3 >= t3))(e2))), int: () => K(m(t2, d((t3) => v(t3) && Number.isInteger(t3)))), finite: () => K(m(t2, d((t3) => v(t3) && Number.isFinite(t3)))), positive: () => K(m(t2, d((t3) => v(t3) && t3 > 0))), negative: () => K(m(t2, d((t3) => v(t3) && t3 < 0))) });
var A = K(d(v));
var x = (t2) => Object.assign(u(t2), { between: (e2, n2) => x(m(t2, ((t3, e3) => d((n3) => w(n3) && t3 <= n3 && e3 >= n3))(e2, n2))), lt: (e2) => x(m(t2, ((t3) => d((e3) => w(e3) && e3 < t3))(e2))), gt: (e2) => x(m(t2, ((t3) => d((e3) => w(e3) && e3 > t3))(e2))), lte: (e2) => x(m(t2, ((t3) => d((e3) => w(e3) && e3 <= t3))(e2))), gte: (e2) => x(m(t2, ((t3) => d((e3) => w(e3) && e3 >= t3))(e2))), positive: () => x(m(t2, d((t3) => w(t3) && t3 > 0))), negative: () => x(m(t2, d((t3) => w(t3) && t3 < 0))) });
var P = x(d(w));
var T = u(d(function(t2) {
  return "boolean" == typeof t2;
}));
var k = u(d(function(t2) {
  return "symbol" == typeof t2;
}));
var B = u(d(function(t2) {
  return null == t2;
}));
var W = { matched: false, value: void 0 };
function N(t2) {
  return new $(t2, W);
}
var $ = class _$ {
  constructor(t2, e2) {
    this.input = void 0, this.state = void 0, this.input = t2, this.state = e2;
  }
  with(...t2) {
    if (this.state.matched)
      return this;
    const e2 = t2[t2.length - 1], r2 = [t2[0]];
    let i2;
    3 === t2.length && "function" == typeof t2[1] ? (r2.push(t2[0]), i2 = t2[1]) : t2.length > 2 && r2.push(...t2.slice(1, t2.length - 1));
    let o2 = false, c2 = {};
    const a = (t3, e3) => {
      o2 = true, c2[t3] = e3;
    }, u2 = !r2.some((t3) => s(t3, this.input, a)) || i2 && !Boolean(i2(this.input)) ? W : { matched: true, value: e2(o2 ? n in c2 ? c2[n] : c2 : this.input, this.input) };
    return new _$(this.input, u2);
  }
  when(t2, e2) {
    if (this.state.matched)
      return this;
    const n2 = Boolean(t2(this.input));
    return new _$(this.input, n2 ? { matched: true, value: e2(this.input, this.input) } : W);
  }
  otherwise(t2) {
    return this.state.matched ? this.state.value : t2(this.input);
  }
  exhaustive() {
    return this.run();
  }
  run() {
    if (this.state.matched)
      return this.state.value;
    let t2;
    try {
      t2 = JSON.stringify(this.input);
    } catch (e2) {
      t2 = this.input;
    }
    throw new Error(`Pattern matching error: no pattern matches value ${t2}`);
  }
  returnType() {
    return this;
  }
};

// src/d2o/game-data-type.enum.ts
var GameDataType = /* @__PURE__ */ ((GameDataType2) => {
  GameDataType2[GameDataType2["Int"] = -1] = "Int";
  GameDataType2[GameDataType2["Bool"] = -2] = "Bool";
  GameDataType2[GameDataType2["String"] = -3] = "String";
  GameDataType2[GameDataType2["Number"] = -4] = "Number";
  GameDataType2[GameDataType2["I18N"] = -5] = "I18N";
  GameDataType2[GameDataType2["Uint"] = -6] = "Uint";
  GameDataType2[GameDataType2["List"] = -99] = "List";
  return GameDataType2;
})(GameDataType || {});
var game_data_type_enum_default = GameDataType;

// src/d2o/game-data-process.ts
var D2oGameDataProcess = class {
  constructor(reader) {
    this.reader = reader;
    this.parseStream();
  }
  searchFieldsIndexes = {};
  searchFieldsCounts = {};
  searchFieldsTypes = {};
  searchTable = {};
  queryableFields = [];
  parseStream() {
    let fieldListSize = this.reader.readInt();
    const indexSearchOffset = this.reader.getPointer() + fieldListSize + 4;
    while (fieldListSize > 0) {
      const size = this.reader.getRemaining();
      const fieldName = this.reader.readUTF();
      this.queryableFields.push(fieldName);
      this.searchFieldsIndexes[fieldName] = this.reader.readInt() + indexSearchOffset;
      this.searchFieldsTypes[fieldName] = this.reader.readInt();
      this.searchFieldsCounts[fieldName] = this.reader.readInt();
      fieldListSize -= size - this.reader.getRemaining();
    }
  }
  getReadFunction(type) {
    return N(type).with(
      game_data_type_enum_default.Int,
      () => (reader) => reader.readInt()
    ).with(
      game_data_type_enum_default.Bool,
      () => (reader) => reader.readBoolean()
    ).with(
      game_data_type_enum_default.String,
      () => (reader) => reader.readUTF()
    ).with(
      game_data_type_enum_default.Number,
      () => (reader) => reader.readDouble()
    ).with(
      game_data_type_enum_default.I18N,
      () => (reader) => reader.readInt()
    ).with(
      game_data_type_enum_default.Uint,
      () => (reader) => reader.readUInt()
    ).otherwise(() => {
      throw `Unhandled type ${type}`;
    });
  }
  getWriteFunction(type) {
    return N(type).with(
      game_data_type_enum_default.Int,
      () => (writer, value) => writer.writeInt(value)
    ).with(
      game_data_type_enum_default.Bool,
      () => (writer, value) => writer.writeBoolean(value)
    ).with(
      game_data_type_enum_default.String,
      () => (writer, value) => writer.writeUTF(value)
    ).with(
      game_data_type_enum_default.Number,
      () => (writer, value) => writer.writeDouble(value)
    ).with(
      game_data_type_enum_default.I18N,
      () => (writer, value) => writer.writeInt(value)
    ).with(
      game_data_type_enum_default.Uint,
      () => (writer, value) => writer.writeUInt(value)
    ).otherwise(() => {
      throw `Unhandled type ${type}`;
    });
  }
  readSearchTable() {
    this.queryableFields.forEach((queryableField) => {
      const readingMethod = this.getReadFunction(
        this.searchFieldsTypes[queryableField]
      );
      if (readingMethod === null) {
        return;
      }
      const currentTableEntry = {};
      const itemsCount = this.searchFieldsCounts[queryableField];
      this.reader.setPointer(this.searchFieldsIndexes[queryableField]);
      for (let i2 = 0; i2 < itemsCount; i2 += 1) {
        const value = readingMethod(this.reader);
        const indexes = currentTableEntry[value] = [];
        let size = this.reader.readInt() / 4;
        while (size > 0) {
          try {
            indexes.push(this.reader.readInt());
          } catch (err) {
            break;
          }
          size -= 1;
        }
      }
    });
  }
};

// src/d2o/constants.ts
var D2O_HEADER = "D2O";
var NULL_IDENTIFIER = -1431655766;

// src/d2o/structures.ts
var D2oClass = class {
  constructor(context, id, name, packageName) {
    this.context = context;
    this.id = id;
    this.name = name;
    this.packageName = packageName;
    this.context.classesDefinitions.set(this.id, this);
  }
  fields = [];
  write(writer, data) {
    writer.writeInt(this.id);
    this.fields.forEach((field) => {
      field.writeData(writer, data[field.name]);
    });
  }
  read(reader) {
    const data = {
      __typeId: this.id
    };
    this.fields.forEach((field) => {
      data[field.name] = field.readData(reader);
    });
    return data;
  }
  addField(reader, fieldName) {
    const field = new D2oField(this.context, fieldName);
    field.readType(reader);
    this.fields.push(field);
  }
};
var D2oField = class {
  constructor(context, name) {
    this.context = context;
    this.name = name;
  }
  readData = () => null;
  type = 0;
  innerTypesNames = [];
  innerTypes = [];
  innerReadMethods = [];
  readType(reader) {
    this.type = reader.readInt();
    this.readData = this.getReadMethod(reader, this.type).bind(this);
  }
  writeType(writer, type = this.type, innerIndex = 0) {
    writer.writeInt(type);
    if (type === game_data_type_enum_default.List) {
      writer.writeUTF(this.innerTypesNames[innerIndex]);
      const subType = this.innerTypes[innerIndex];
      return this.writeType(writer, subType, innerIndex + 1);
    }
  }
  writeData(writer, data) {
    const writeMethod = this.getWriteMethod(this.type);
    return writeMethod(writer, data);
  }
  getReadMethod = (reader, type) => N(type).with(game_data_type_enum_default.Bool, () => this.readBoolean).with(game_data_type_enum_default.Number, () => this.readNumber).with(game_data_type_enum_default.I18N, () => this.readI18n).with(game_data_type_enum_default.Int, () => this.readInteger).with(game_data_type_enum_default.String, () => this.readString).with(game_data_type_enum_default.Uint, () => this.readUint).with(game_data_type_enum_default.List, () => {
    this.innerTypesNames.push(reader.readUTF());
    const subType = reader.readInt();
    this.innerTypes.push(subType);
    this.innerReadMethods.unshift(this.getReadMethod(reader, subType));
    return this.readVector.bind(this);
  }).otherwise(() => {
    if (type <= 0) {
      throw `Invalid type ${type}`;
    }
    return this.readObject.bind(this);
  });
  getWriteMethod = (type) => N(type).with(game_data_type_enum_default.Bool, () => this.writeBoolean).with(game_data_type_enum_default.Number, () => this.writeNumber).with(game_data_type_enum_default.I18N, () => this.writeI18n).with(game_data_type_enum_default.Int, () => this.writeInteger).with(game_data_type_enum_default.String, () => this.writeString).with(game_data_type_enum_default.Uint, () => this.writeUint).with(game_data_type_enum_default.List, () => this.writeVector.bind(this)).otherwise(() => {
    if (type <= 0) {
      throw `Invalid type ${type}`;
    }
    return this.writeObject.bind(this);
  });
  readInteger(reader) {
    return reader.readInt();
  }
  writeInteger(writer, value) {
    writer.writeInt(value);
  }
  readBoolean(reader) {
    return reader.readBoolean();
  }
  writeBoolean(writer, value) {
    writer.writeBoolean(value);
  }
  readString(reader) {
    const value = reader.readUTF();
    if (value === "null") {
      return null;
    }
    return value;
  }
  writeString(writer, value) {
    if (value === null) {
      writer.writeUTF("null");
      return;
    }
    writer.writeUTF(value);
  }
  readNumber(reader) {
    return reader.readDouble();
  }
  writeNumber(writer, value) {
    writer.writeDouble(value);
  }
  readI18n(reader) {
    return reader.readInt();
  }
  writeI18n(writer, value) {
    writer.writeInt(value);
  }
  readUint(reader) {
    return reader.readUInt();
  }
  writeUint(writer, value) {
    writer.writeUInt(value);
  }
  readVector(reader, innerIndex = 0) {
    const size = reader.readInt();
    const content = [];
    for (let i2 = 0; i2 < size; i2 += 1) {
      content.push(this.innerReadMethods[innerIndex](reader, innerIndex + 1));
    }
    return content;
  }
  writeVector(writer, value, innerIndex = 0) {
    writer.writeInt(value.length);
    const innerWriteMethod = this.getWriteMethod(this.innerTypes[innerIndex]);
    value.forEach((item) => {
      innerWriteMethod(writer, item, innerIndex + 1);
    });
  }
  readObject(reader) {
    const id = reader.readInt();
    if (id === NULL_IDENTIFIER) {
      return null;
    }
    const classDefinition = this.context.classesDefinitions.get(id);
    if (!classDefinition) {
      throw `Class definition not found for id ${id}`;
    }
    return classDefinition.read(reader);
  }
  writeObject(writer, value) {
    if (value === null || value === void 0) {
      writer.writeInt(NULL_IDENTIFIER);
      return;
    }
    const classDefinition = this.context.classesDefinitions.get(
      value.__typeId
    );
    if (!classDefinition) {
      throw `Class definition not found for id ${value.__typeId}`;
    }
    return classDefinition.write(writer, value);
  }
  isVector() {
    return this.type === game_data_type_enum_default.List;
  }
  isVectorOfObject() {
    return this.isVector() && this.innerTypes[0] > 0;
  }
  is2ndLevelVector() {
    return this.type === game_data_type_enum_default.List && this.innerTypes[0] === game_data_type_enum_default.List;
  }
};

// src/d2o/reader.ts
var Reader = class {
  constructor(data) {
    this.data = data;
    this.reader = new BigEndianReader(data);
    if (this.reader.readUTFBytes(3) !== D2O_HEADER) {
      throw "Invalid D2O header";
    }
    this.reader.setPointer(this.reader.readInt());
    const indexTableSize = this.reader.readInt();
    for (let i2 = 0; i2 < indexTableSize; i2 += 8) {
      this.context.indexes.set(this.reader.readInt(), this.reader.readInt());
    }
    const size = this.reader.readInt();
    for (let i2 = 0; i2 < size; i2 += 1) {
      const classId = this.reader.readInt();
      this.context.classesDefinitionsIndexes.set(classId, i2);
      this.readClasseDefinition(classId);
    }
    if (this.reader.getRemaining() > 0) {
      this.context.dataProcessor = new D2oGameDataProcess(this.reader);
    }
  }
  reader;
  context = new D2oContext();
  getData(classesNames = []) {
    const data = [];
    this.context.indexes.forEach((position) => {
      this.reader.setPointer(position);
      const classDefinition = this.context.classesDefinitions.get(
        this.reader.readInt()
      );
      if (!classDefinition || !classesNames.includes(classDefinition.name) && classesNames.length > 0) {
        return;
      }
      this.context.classesDataIndexes.set(classDefinition.id, position);
      data.push(classDefinition.read(this.reader));
    });
    return data;
  }
  readClasseDefinition(classId) {
    const className = this.reader.readUTF();
    const classPackageName = this.reader.readUTF();
    const classDefinition = new D2oClass(
      this.context,
      classId,
      className,
      classPackageName
    );
    const fieldsSize = this.reader.readInt();
    for (let j2 = 0; j2 < fieldsSize; j2 += 1) {
      const fieldName = this.reader.readUTF();
      classDefinition.addField(this.reader, fieldName);
    }
  }
};

// src/d2o/writer.ts
var Writer = class {
  constructor(context) {
    this.context = context;
    this.writer = BigEndianWriter.from(1024 * 1e3 * 10, 1024 * 1e3);
  }
  writer;
  indexTable = /* @__PURE__ */ new Map();
  searchTable = {};
  write(data) {
    this.createSearchTable(data);
    this.writer.writeUTFBytes("D2O");
    const futureIndexTablePosition = this.writer.getPointer();
    this.writer.writeInt(0);
    this.writeData(data);
    this.writeIndexTable(futureIndexTablePosition);
    this.writeClassesDefinitions();
    this.writeSearchTable();
    return this.writer.getBuffer();
  }
  createSearchTable(data, prefix = "") {
    const getPrefixedFieldName = (fieldName) => {
      return prefix === null || prefix.length === 0 ? fieldName : `${prefix}.${fieldName}`;
    };
    const queryableFields = this.context.dataProcessor?.queryableFields ?? [];
    if (Object.keys(this.searchTable).length === 0) {
      queryableFields.forEach((queryableField) => {
        this.searchTable[queryableField] = {};
      });
    }
    this.context.classesDefinitions.forEach((classDefinition) => {
      classDefinition.fields.filter(
        (field) => queryableFields.includes(field.name) && field.is2ndLevelVector()
      ).map((field) => {
        this.searchTable[field.name][0] = /* @__PURE__ */ new Set([]);
      });
    });
    data.forEach((entry, index) => {
      if (entry === null) {
        throw new Error("Entry is null");
      }
      const entryObject = this.context.classesDefinitions.get(
        entry["__typeId"]
      );
      if (!entryObject) {
        throw new Error("Entry object is null");
      }
      entryObject.fields.filter((field) => !field.is2ndLevelVector()).filter(
        (field) => queryableFields.includes(getPrefixedFieldName(field.name)) || field.isVector()
      ).map((field) => {
        const prefixedFieldName = getPrefixedFieldName(field.name);
        if (field.isVector() && field.isVectorOfObject()) {
          const value2 = entry[field.name];
          this.createSearchTable(value2, prefixedFieldName);
          return;
        }
        if (field.isVector()) {
          const value2 = entry[field.name];
          value2.forEach((item) => {
            this.addSearchTableEntry(item, prefixedFieldName, index);
          });
          return;
        }
        const value = entry[field.name];
        this.addSearchTableEntry(value, prefixedFieldName, index);
      });
    });
  }
  addSearchTableEntry(value, fieldName, index) {
    if (value in this.searchTable[fieldName]) {
      this.searchTable[fieldName][value].add(index);
      return;
    }
    this.searchTable[fieldName][value] = /* @__PURE__ */ new Set([index]);
  }
  writeData(data) {
    data.forEach((entry, index) => {
      this.indexTable.set(index, this.writer.getPointer());
      const entryObject = this.context.classesDefinitions.get(
        entry["__typeId"]
      );
      if (!entryObject) {
        return;
      }
      entryObject.write(this.writer, entry);
    });
  }
  writeIndexTable(targetIndexTableIndex) {
    const startPosition = this.writer.getPointer();
    this.writer.setPointer(targetIndexTableIndex);
    this.writer.writeInt(startPosition);
    this.writer.setPointer(startPosition);
    this.writer.writeInt(this.indexTable.size * 8);
    this.indexTable.forEach((position, index) => {
      this.writer.writeInt(index);
      this.writer.writeInt(position);
    });
  }
  writeClassesDefinitions() {
    this.writer.writeInt(this.context.classesDefinitions.size);
    const classesDefinitions = Array.from(
      this.context.classesDefinitionsIndexes.entries()
    ).sort(([, index]) => index).map(([classId]) => {
      return this.context.classesDefinitions.get(classId);
    });
    classesDefinitions.forEach((classDefinition) => {
      this.writer.writeInt(classDefinition.id);
      this.writer.writeUTF(classDefinition.name);
      this.writer.writeUTF(classDefinition.packageName);
      this.writer.writeInt(classDefinition.fields.length);
      classDefinition.fields.forEach((field) => {
        this.writer.writeUTF(field.name);
        field.writeType(this.writer);
      });
    });
  }
  writeSearchTable() {
    if (!this.context.dataProcessor) {
      return;
    }
    const { queryableFields, searchFieldsTypes, getWriteFunction } = this.context.dataProcessor;
    let currentPosition;
    let fieldListSize = 0;
    const searchTableStartPosition = this.writer.getPointer();
    const fieldSearchIndexes = [];
    this.writer.writeInt(0);
    queryableFields.forEach((queryableField) => {
      const queryableFieldStartPosition = this.writer.getPointer();
      this.writer.writeUTF(queryableField);
      fieldSearchIndexes.push(this.writer.getPointer());
      this.writer.writeInt(0);
      this.writer.writeInt(searchFieldsTypes[queryableField]);
      this.writer.writeInt(
        Object.keys(this.searchTable[queryableField]).length
      );
      fieldListSize += this.writer.getPointer() - queryableFieldStartPosition;
    });
    const startSearchTableDataPosition = this.writer.getPointer();
    this.writer.writeInt(0);
    const indexWriteOffset = searchTableStartPosition + fieldListSize + 8;
    queryableFields.forEach((queryableField, i2) => {
      const startQueryableFieldDefinitionPosition = this.writer.getPointer();
      Object.entries(this.searchTable[queryableField]).forEach(
        ([key, value]) => {
          getWriteFunction(searchFieldsTypes[queryableField])(this.writer, key);
          this.writer.writeInt(value.size > 0 ? value.size / 0.25 : 0);
          value.forEach((index) => {
            this.writer.writeInt(index);
          });
        }
      );
      currentPosition = this.writer.getPointer();
      this.writer.setPointer(fieldSearchIndexes[i2]);
      this.writer.writeInt(
        startQueryableFieldDefinitionPosition - indexWriteOffset
      );
      this.writer.setPointer(currentPosition);
    });
    currentPosition = this.writer.getPointer();
    this.writer.setPointer(searchTableStartPosition);
    this.writer.writeInt(fieldListSize);
    this.writer.setPointer(startSearchTableDataPosition);
    this.writer.writeInt(currentPosition - startSearchTableDataPosition);
    this.writer.setPointer(currentPosition);
  }
};
export {
  BigEndianReader,
  BigEndianWriter,
  Reader as D2oReader,
  Writer as D2oWriter,
  getFlag as bigEndianGetFlag,
  setFlag as bigEndianSetFlat
};

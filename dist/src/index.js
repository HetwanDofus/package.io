// src/binary/big-endian.reader.ts
class BigEndianReader {
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
    return new BigEndianReader(copiedBuffer);
  }
  readVarInt() {
    let value = 0;
    let size = 0;
    while (size < BigEndianReader.INT_SIZE) {
      const byte = this.readByte();
      const bit = (byte & BigEndianReader.MASK_10000000) == BigEndianReader.MASK_10000000;
      if (size > 0) {
        value |= (byte & BigEndianReader.MASK_01111111) << size;
      } else {
        value |= byte & BigEndianReader.MASK_01111111;
      }
      size += BigEndianReader.CHUNCK_BIT_SIZE;
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
    while (offset < BigEndianReader.SHORT_SIZE) {
      const byte = this.readByte();
      const bit = (byte & BigEndianReader.MASK_10000000) == BigEndianReader.MASK_10000000;
      if (offset > 0) {
        value |= (byte & BigEndianReader.MASK_01111111) << offset;
      } else {
        value |= byte & BigEndianReader.MASK_01111111;
      }
      offset += BigEndianReader.CHUNCK_BIT_SIZE;
      if (!bit) {
        if (value > BigEndianReader.SHORT_MAX_VALUE) {
          value -= BigEndianReader.USHORT_MAX_VALUE;
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
      if ((lastByte & BigEndianReader.MASK_10000000) == BigEndianReader.MASK_10000000) {
        low |= (lastByte & BigEndianReader.MASK_01111111) << size;
        size += 7;
      } else {
        low |= lastByte << size;
        return low;
      }
    }
    lastByte = this.readByte();
    if ((lastByte & BigEndianReader.MASK_10000000) == BigEndianReader.MASK_10000000) {
      low |= (lastByte & BigEndianReader.MASK_01111111) << size;
      high = (lastByte & BigEndianReader.MASK_01111111) >> 4;
      size = 3;
      while (size < 32) {
        lastByte = this.readByte();
        if ((lastByte & BigEndianReader.MASK_10000000) == BigEndianReader.MASK_10000000) {
          high |= (lastByte & BigEndianReader.MASK_01111111) << size;
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
}
// src/binary/big-endian.writer.ts
class BigEndianWriter {
  static INT_SIZE = 32;
  static SHORT_SIZE = 16;
  static SHORT_MIN_VALUE = -32768;
  static SHORT_MAX_VALUE = 32767;
  static USHORT_MAX_VALUE = 65535;
  static CHUNCK_BIT_SIZE = 7;
  static MASK_10000000 = 128;
  static MASK_01111111 = 127;
  static DEFAULT_SIZE = 4096;
  expandSize;
  buffer;
  length;
  pointer = 0;
  constructor(buffer, expandSize = BigEndianWriter.DEFAULT_SIZE) {
    this.buffer = buffer || Buffer.allocUnsafe(BigEndianWriter.DEFAULT_SIZE);
    this.length = this.buffer.byteLength;
    this.expandSize = expandSize;
  }
  static from(size, expandSize = BigEndianWriter.DEFAULT_SIZE) {
    return new BigEndianWriter(Buffer.allocUnsafe(size), expandSize);
  }
  expandIfNeeded(size) {
    if (this.pointer + size <= this.length) {
      return;
    }
    const newBuffer = Buffer.allocUnsafe(this.buffer.byteLength + this.expandSize);
    this.buffer.copy(newBuffer);
    this.length = newBuffer.byteLength;
    this.buffer = newBuffer;
    Bun.gc(true);
  }
  writeVarInt(data) {
    if (data <= BigEndianWriter.MASK_01111111) {
      return this.writeByte(data);
    }
    let i = 0;
    while (data !== 0) {
      let byte = data & BigEndianWriter.MASK_01111111;
      i++;
      data >>= BigEndianWriter.CHUNCK_BIT_SIZE;
      if (data > 0) {
        byte |= BigEndianWriter.MASK_10000000;
      }
      this.writeByte(byte);
    }
    return this;
  }
  writeVarUInt(data) {
    return this.writeVarInt(data);
  }
  writeVarShort(data) {
    if (data <= BigEndianWriter.MASK_01111111) {
      return this.writeByte(data);
    }
    let i = 0;
    while (data !== 0) {
      let byte = data & BigEndianWriter.MASK_01111111;
      i++;
      data >>= BigEndianWriter.CHUNCK_BIT_SIZE;
      if (data > 0) {
        byte |= BigEndianWriter.MASK_10000000;
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
    for (let i = 0;i < 4; i++) {
      this.writeByte(Number(low & BigEndianWriter.MASK_01111111 | BigEndianWriter.MASK_10000000));
      low >>= 7;
    }
    if ((high & 4294967288) === 0) {
      this.writeByte(Number(high << 4 | low));
    } else {
      this.writeByte(Number((high << 4 | low) & BigEndianWriter.MASK_01111111 | BigEndianWriter.MASK_10000000));
      high >>= 3;
      while (high >= 128) {
        this.writeByte(Number(high & BigEndianWriter.MASK_01111111 | BigEndianWriter.MASK_10000000));
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
}
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
class D2oContext {
  indexes = new Map;
  classesDataIndexes = new Map;
  classesDefinitions = new Map;
  classesDefinitionsIndexes = new Map;
  dataProcessor;
}

// /Users/grandnainconnu/Documents/Travail/Personal/Dofus/Dofus1.29/hetwanmod/node_modules/ts-pattern/dist/index.js
var u = function(t) {
  return Object.assign(t, { optional: () => l(t), and: (e) => m(t, e), or: (e) => y(t, e), select: (e) => e === undefined ? p(t) : p(e, t) });
};
var l = function(e) {
  return u({ [t]: () => ({ match: (t) => {
    let n = {};
    const r = (t2, e2) => {
      n[t2] = e2;
    };
    return t === undefined ? (o(e).forEach((t2) => r(t2, undefined)), { matched: true, selections: n }) : { matched: s(e, t, r), selections: n };
  }, getSelectionKeys: () => o(e), matcherType: "optional" }) });
};
var m = function(...e) {
  return u({ [t]: () => ({ match: (t) => {
    let n = {};
    const r = (t2, e2) => {
      n[t2] = e2;
    };
    return { matched: e.every((e2) => s(e2, t, r)), selections: n };
  }, getSelectionKeys: () => c(e, o), matcherType: "and" }) });
};
var y = function(...e) {
  return u({ [t]: () => ({ match: (t) => {
    let n = {};
    const r = (t2, e2) => {
      n[t2] = e2;
    };
    return c(e, o).forEach((t2) => r(t2, undefined)), { matched: e.some((e2) => s(e2, t, r)), selections: n };
  }, getSelectionKeys: () => c(e, o), matcherType: "or" }) });
};
var d = function(e) {
  return { [t]: () => ({ match: (t) => ({ matched: Boolean(e(t)) }) }) };
};
var p = function(...e) {
  const r = typeof e[0] == "string" ? e[0] : undefined, i = e.length === 2 ? e[1] : typeof e[0] == "string" ? undefined : e[0];
  return u({ [t]: () => ({ match: (t) => {
    let e2 = { [r != null ? r : n]: t };
    return { matched: i === undefined || s(i, t, (t2, n) => {
      e2[t2] = n;
    }), selections: e2 };
  }, getSelectionKeys: () => [r != null ? r : n].concat(i === undefined ? [] : o(i)) }) });
};
var v = function(t) {
  return typeof t == "number";
};
var b = function(t) {
  return typeof t == "string";
};
var w = function(t) {
  return typeof t == "bigint";
};
var N = function(t) {
  return new $(t, W);
};
var t = Symbol.for("@ts-pattern/matcher");
var e = Symbol.for("@ts-pattern/isVariadic");
var n = "@ts-pattern/anonymous-select-key";
var r = (t2) => Boolean(t2 && typeof t2 == "object");
var i = (e2) => e2 && !!e2[t];
var s = (n2, o, c) => {
  if (i(n2)) {
    const e2 = n2[t](), { matched: r2, selections: i2 } = e2.match(o);
    return r2 && i2 && Object.keys(i2).forEach((t2) => c(t2, i2[t2])), r2;
  }
  if (r(n2)) {
    if (!r(o))
      return false;
    if (Array.isArray(n2)) {
      if (!Array.isArray(o))
        return false;
      let t2 = [], r2 = [], a = [];
      for (const s2 of n2.keys()) {
        const o2 = n2[s2];
        i(o2) && o2[e] ? a.push(o2) : a.length ? r2.push(o2) : t2.push(o2);
      }
      if (a.length) {
        if (a.length > 1)
          throw new Error("Pattern error: Using `...P.array(...)` several times in a single pattern is not allowed.");
        if (o.length < t2.length + r2.length)
          return false;
        const e2 = o.slice(0, t2.length), n3 = r2.length === 0 ? [] : o.slice(-r2.length), i2 = o.slice(t2.length, r2.length === 0 ? Infinity : -r2.length);
        return t2.every((t3, n4) => s(t3, e2[n4], c)) && r2.every((t3, e3) => s(t3, n3[e3], c)) && (a.length === 0 || s(a[0], i2, c));
      }
      return n2.length === o.length && n2.every((t3, e2) => s(t3, o[e2], c));
    }
    return Object.keys(n2).every((e2) => {
      const r2 = n2[e2];
      return ((e2 in o) || i(a = r2) && a[t]().matcherType === "optional") && s(r2, o[e2], c);
      var a;
    });
  }
  return Object.is(o, n2);
};
var o = (e2) => {
  var n2, s2, a;
  return r(e2) ? i(e2) ? (n2 = (s2 = (a = e2[t]()).getSelectionKeys) == null ? undefined : s2.call(a)) != null ? n2 : [] : Array.isArray(e2) ? c(e2, o) : c(Object.values(e2), o) : [];
};
var c = (t2, e2) => t2.reduce((t3, n2) => t3.concat(e2(n2)), []);
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
  return typeof t2 == "boolean";
}));
var k = u(d(function(t2) {
  return typeof t2 == "symbol";
}));
var B = u(d(function(t2) {
  return t2 == null;
}));
var W = { matched: false, value: undefined };

class $ {
  constructor(t2, e2) {
    this.input = undefined, this.state = undefined, this.input = t2, this.state = e2;
  }
  with(...t2) {
    if (this.state.matched)
      return this;
    const e2 = t2[t2.length - 1], r2 = [t2[0]];
    let i2;
    t2.length === 3 && typeof t2[1] == "function" ? (r2.push(t2[0]), i2 = t2[1]) : t2.length > 2 && r2.push(...t2.slice(1, t2.length - 1));
    let o2 = false, c2 = {};
    const a = (t3, e3) => {
      o2 = true, c2[t3] = e3;
    }, u2 = !r2.some((t3) => s(t3, this.input, a)) || i2 && !Boolean(i2(this.input)) ? W : { matched: true, value: e2(o2 ? n in c2 ? c2[n] : c2 : this.input, this.input) };
    return new $(this.input, u2);
  }
  when(t2, e2) {
    if (this.state.matched)
      return this;
    const n2 = Boolean(t2(this.input));
    return new $(this.input, n2 ? { matched: true, value: e2(this.input, this.input) } : W);
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
}

// src/d2o/game-data-type.enum.ts
var GameDataType;
(function(GameDataType2) {
  GameDataType2[GameDataType2["Int"] = -1] = "Int";
  GameDataType2[GameDataType2["Bool"] = -2] = "Bool";
  GameDataType2[GameDataType2["String"] = -3] = "String";
  GameDataType2[GameDataType2["Number"] = -4] = "Number";
  GameDataType2[GameDataType2["I18N"] = -5] = "I18N";
  GameDataType2[GameDataType2["Uint"] = -6] = "Uint";
  GameDataType2[GameDataType2["List"] = -99] = "List";
})(GameDataType || (GameDataType = {}));
var game_data_type_enum_default = GameDataType;

// src/d2o/game-data-process.ts
class D2oGameDataProcess {
  reader;
  searchFieldsIndexes = {};
  searchFieldsCounts = {};
  searchFieldsTypes = {};
  searchTable = {};
  queryableFields = [];
  constructor(reader) {
    this.reader = reader;
    this.parseStream();
  }
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
    return N(type).with(game_data_type_enum_default.Int, () => (reader) => reader.readInt()).with(game_data_type_enum_default.Bool, () => (reader) => reader.readBoolean()).with(game_data_type_enum_default.String, () => (reader) => reader.readUTF()).with(game_data_type_enum_default.Number, () => (reader) => reader.readDouble()).with(game_data_type_enum_default.I18N, () => (reader) => reader.readInt()).with(game_data_type_enum_default.Uint, () => (reader) => reader.readUInt()).otherwise(() => {
      throw `Unhandled type ${type}`;
    });
  }
  getWriteFunction(type) {
    return N(type).with(game_data_type_enum_default.Int, () => (writer, value) => writer.writeInt(value)).with(game_data_type_enum_default.Bool, () => (writer, value) => writer.writeBoolean(value)).with(game_data_type_enum_default.String, () => (writer, value) => writer.writeUTF(value)).with(game_data_type_enum_default.Number, () => (writer, value) => writer.writeDouble(value)).with(game_data_type_enum_default.I18N, () => (writer, value) => writer.writeInt(value)).with(game_data_type_enum_default.Uint, () => (writer, value) => writer.writeUInt(value)).otherwise(() => {
      throw `Unhandled type ${type}`;
    });
  }
  readSearchTable() {
    this.queryableFields.forEach((queryableField) => {
      const readingMethod = this.getReadFunction(this.searchFieldsTypes[queryableField]);
      if (readingMethod === null) {
        return;
      }
      const currentTableEntry = {};
      const itemsCount = this.searchFieldsCounts[queryableField];
      this.reader.setPointer(this.searchFieldsIndexes[queryableField]);
      for (let i2 = 0;i2 < itemsCount; i2 += 1) {
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
}

// src/d2o/constants.ts
var D2O_HEADER = "D2O";
var NULL_IDENTIFIER = -1431655766;

// src/d2o/structures.ts
class D2oClass {
  context;
  id;
  name;
  packageName;
  fields = [];
  constructor(context, id, name, packageName) {
    this.context = context;
    this.id = id;
    this.name = name;
    this.packageName = packageName;
    this.context.classesDefinitions.set(this.id, this);
  }
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
}

class D2oField {
  context;
  name;
  readData = () => null;
  type = 0;
  innerTypesNames = [];
  innerTypes = [];
  innerReadMethods = [];
  constructor(context, name) {
    this.context = context;
    this.name = name;
  }
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
    for (let i2 = 0;i2 < size; i2 += 1) {
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
    if (value === null || value === undefined) {
      writer.writeInt(NULL_IDENTIFIER);
      return;
    }
    const classDefinition = this.context.classesDefinitions.get(value.__typeId);
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
}

// src/d2o/reader.ts
class Reader {
  data;
  reader;
  context = new D2oContext;
  constructor(data) {
    this.data = data;
    this.reader = new BigEndianReader(data);
    if (this.reader.readUTFBytes(3) !== D2O_HEADER) {
      throw "Invalid D2O header";
    }
    this.reader.setPointer(this.reader.readInt());
    const indexTableSize = this.reader.readInt();
    for (let i2 = 0;i2 < indexTableSize; i2 += 8) {
      this.context.indexes.set(this.reader.readInt(), this.reader.readInt());
    }
    const size = this.reader.readInt();
    for (let i2 = 0;i2 < size; i2 += 1) {
      const classId = this.reader.readInt();
      this.context.classesDefinitionsIndexes.set(classId, i2);
      this.readClasseDefinition(classId);
    }
    if (this.reader.getRemaining() > 0) {
      this.context.dataProcessor = new D2oGameDataProcess(this.reader);
    }
  }
  getData(classesNames = []) {
    const data = [];
    this.context.indexes.forEach((position) => {
      this.reader.setPointer(position);
      const classDefinition = this.context.classesDefinitions.get(this.reader.readInt());
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
    const classDefinition = new D2oClass(this.context, classId, className, classPackageName);
    const fieldsSize = this.reader.readInt();
    for (let j2 = 0;j2 < fieldsSize; j2 += 1) {
      const fieldName = this.reader.readUTF();
      classDefinition.addField(this.reader, fieldName);
    }
  }
}
// src/d2o/writer.ts
class Writer {
  context2;
  writer;
  indexTable = new Map;
  searchTable = {};
  constructor(context2) {
    this.context = context2;
    this.writer = BigEndianWriter.from(10240000, 1024000);
  }
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
      classDefinition.fields.filter((field) => queryableFields.includes(field.name) && field.is2ndLevelVector()).map((field) => {
        this.searchTable[field.name][0] = new Set([]);
      });
    });
    data.forEach((entry, index) => {
      if (entry === null) {
        throw new Error("Entry is null");
      }
      const entryObject = this.context.classesDefinitions.get(entry["__typeId"]);
      if (!entryObject) {
        throw new Error("Entry object is null");
      }
      entryObject.fields.filter((field) => !field.is2ndLevelVector()).filter((field) => queryableFields.includes(getPrefixedFieldName(field.name)) || field.isVector()).map((field) => {
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
    this.searchTable[fieldName][value] = new Set([index]);
  }
  writeData(data) {
    data.forEach((entry, index) => {
      this.indexTable.set(index, this.writer.getPointer());
      const entryObject = this.context.classesDefinitions.get(entry["__typeId"]);
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
    const classesDefinitions = Array.from(this.context.classesDefinitionsIndexes.entries()).sort(([, index]) => index).map(([classId]) => {
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
      this.writer.writeInt(Object.keys(this.searchTable[queryableField]).length);
      fieldListSize += this.writer.getPointer() - queryableFieldStartPosition;
    });
    const startSearchTableDataPosition = this.writer.getPointer();
    this.writer.writeInt(0);
    const indexWriteOffset = searchTableStartPosition + fieldListSize + 8;
    queryableFields.forEach((queryableField, i2) => {
      const startQueryableFieldDefinitionPosition = this.writer.getPointer();
      Object.entries(this.searchTable[queryableField]).forEach(([key, value]) => {
        getWriteFunction(searchFieldsTypes[queryableField])(this.writer, key);
        this.writer.writeInt(value.size > 0 ? value.size / 0.25 : 0);
        value.forEach((index) => {
          this.writer.writeInt(index);
        });
      });
      currentPosition = this.writer.getPointer();
      this.writer.setPointer(fieldSearchIndexes[i2]);
      this.writer.writeInt(startQueryableFieldDefinitionPosition - indexWriteOffset);
      this.writer.setPointer(currentPosition);
    });
    currentPosition = this.writer.getPointer();
    this.writer.setPointer(searchTableStartPosition);
    this.writer.writeInt(fieldListSize);
    this.writer.setPointer(startSearchTableDataPosition);
    this.writer.writeInt(currentPosition - startSearchTableDataPosition);
    this.writer.setPointer(currentPosition);
  }
}
export {
  setFlag as bigEndianSetFlat,
  getFlag as bigEndianGetFlag,
  Writer as D2oWriter,
  Reader as D2oReader,
  BigEndianWriter,
  BigEndianReader
};

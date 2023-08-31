import type { BinaryDataWriter } from "@hetwan/io/binary/types";

export default class BigEndianWriter implements BinaryDataWriter {
  static readonly INT_SIZE = 32;
  static readonly SHORT_SIZE = 16;
  static readonly SHORT_MIN_VALUE = -0x8000;
  static readonly SHORT_MAX_VALUE = 0x7fff;
  static readonly USHORT_MAX_VALUE = 0xffff;

  static readonly CHUNCK_BIT_SIZE = 7;

  static readonly MASK_10000000 = 0x80;
  static readonly MASK_01111111 = 0x7f;

  static readonly DEFAULT_SIZE = 4 * 1024;

  private expandSize: number;

  private buffer: Buffer;
  private length: number;
  private pointer: number = 0;

  constructor(
    buffer?: Buffer,
    expandSize: number = BigEndianWriter.DEFAULT_SIZE
  ) {
    this.buffer = buffer || Buffer.allocUnsafe(BigEndianWriter.DEFAULT_SIZE);
    this.length = this.buffer.byteLength;
    this.expandSize = expandSize;
  }

  static from(
    size: number,
    expandSize: number = BigEndianWriter.DEFAULT_SIZE
  ): BigEndianWriter {
    return new BigEndianWriter(Buffer.allocUnsafe(size), expandSize);
  }

  private expandIfNeeded(size: number): void {
    if (this.pointer + size <= this.length) {
      return;
    }

    const nextLength = this.length + this.expandSize;

    const newBuffer = Buffer.allocUnsafe(nextLength);

    this.buffer.copy(newBuffer);

    this.length = nextLength;
    this.buffer = newBuffer;

    // Force GC to run in case of expand
    Bun.gc(true);
  }

  writeVarInt(data: number): this {
    if (data <= BigEndianWriter.MASK_01111111) {
      return this.writeByte(data);
    }

    let i: number = 0;

    while (data !== 0) {
      let byte: number = data & BigEndianWriter.MASK_01111111;

      i++;

      data >>= BigEndianWriter.CHUNCK_BIT_SIZE;

      if (data > 0) {
        byte |= BigEndianWriter.MASK_10000000;
      }

      this.writeByte(byte);
    }

    return this;
  }

  writeVarUInt(data: number): this {
    return this.writeVarInt(data);
  }

  writeVarShort(data: number): this {
    if (data <= BigEndianWriter.MASK_01111111) {
      return this.writeByte(data);
    }

    let i: number = 0;

    while (data !== 0) {
      let byte: number = data & BigEndianWriter.MASK_01111111;

      i++;

      data >>= BigEndianWriter.CHUNCK_BIT_SIZE;

      if (data > 0) {
        byte |= BigEndianWriter.MASK_10000000;
      }

      this.writeByte(byte);
    }

    return this;
  }

  writeVarUShort(data: number): this {
    return this.writeVarShort(data);
  }

  writeVarLong(data: number): this {
    if (data >> 32 === 0) {
      return this.writeVarInt(Number(data));
    }

    let low: bigint | number = data & 0xffffffff;
    let high: bigint | number = data >> 32;

    for (let i = 0; i < 4; i++) {
      this.writeByte(
        Number(
          (low & BigEndianWriter.MASK_01111111) | BigEndianWriter.MASK_10000000
        )
      );

      low >>= 7;
    }

    if ((high & 0xfffffff8) === 0) {
      this.writeByte(Number((high << 4) | low));
    } else {
      this.writeByte(
        Number(
          (((high << 4) | low) & BigEndianWriter.MASK_01111111) |
            BigEndianWriter.MASK_10000000
        )
      );

      high >>= 3;

      while (high >= 0x80) {
        this.writeByte(
          Number(
            (high & BigEndianWriter.MASK_01111111) |
              BigEndianWriter.MASK_10000000
          )
        );

        high >>= 7;
      }

      this.writeByte(Number(high));
    }

    return this;
  }

  writeVarULong(data: number): this {
    return this.writeVarLong(data);
  }

  writeByte(data: number): this {
    const size = 1;

    this.expandIfNeeded(size);

    this.buffer.writeUInt8(data, this.pointer);

    this.pointer += size;

    return this;
  }

  writeBytes(data: Int8Array): this {
    const size = data.byteLength;

    this.expandIfNeeded(size);

    this.buffer.set(data, this.pointer);

    this.pointer += size;

    return this;
  }

  writeBuffer(data: Buffer): this {
    const size = data.byteLength;

    this.expandIfNeeded(size);

    data.copy(this.buffer, this.pointer, 0);

    this.pointer += size;

    return this;
  }

  writeChar(data: string): this {
    if (data.length !== 1) {
      throw new Error("Char must be a single character");
    }

    this.writeByte(data.charCodeAt(0));

    return this;
  }

  writeBoolean(data: boolean): this {
    const size = 1;

    this.expandIfNeeded(size);

    this.buffer.writeUInt8(Number(data), this.pointer);

    this.pointer += size;

    return this;
  }

  writeShort(data: number): this {
    const size = 2;

    this.expandIfNeeded(size);

    this.buffer.writeInt16BE(data, this.pointer);

    this.pointer += size;

    return this;
  }

  writeUShort(data: number): this {
    const size = 2;

    this.expandIfNeeded(size);

    this.buffer.writeUInt16BE(data, this.pointer);

    this.pointer += size;

    return this;
  }

  writeInt(data: number): this {
    const size = 4;

    this.expandIfNeeded(size);

    this.buffer.writeInt32BE(data, this.pointer);

    this.pointer += size;

    return this;
  }

  writeUInt(data: number): this {
    const size = 4;

    this.expandIfNeeded(size);

    this.buffer.writeUInt32BE(data, this.pointer);

    this.pointer += size;

    return this;
  }

  writeLong(data: number): this {
    const size = 4;

    this.expandIfNeeded(size);

    this.buffer.writeInt32BE(data, this.pointer);

    this.pointer += size;

    return this;
  }

  writeULong(data: number): this {
    const size = 4;

    this.expandIfNeeded(size);

    this.buffer.writeUInt32BE(data, this.pointer);

    this.pointer += size;

    return this;
  }

  writeFloat(data: number): this {
    const size = 4;

    this.expandIfNeeded(size);

    this.buffer.writeFloatBE(data, this.pointer);

    this.pointer += size;

    return this;
  }

  writeDouble(data: number): this {
    const size = 8;

    this.expandIfNeeded(size);

    this.buffer.writeDoubleBE(data, this.pointer);

    this.pointer += size;

    return this;
  }

  writeUTF(data: string): this {
    const encodingBytelength = Buffer.byteLength(data, "utf8");

    this.writeUShort(encodingBytelength);

    this.expandIfNeeded(encodingBytelength);

    this.buffer.write(data, this.pointer, encodingBytelength, "utf8");

    this.pointer += encodingBytelength;

    return this;
  }

  writeUTFBytes(data: string): this {
    const encodingBytelength = Buffer.byteLength(data, "utf8");

    this.expandIfNeeded(encodingBytelength);

    this.buffer.write(data, this.pointer, "utf8");

    this.pointer += encodingBytelength;

    return this;
  }

  getData(): ArrayBufferLike {
    return this.buffer.buffer;
  }

  getBuffer(): Buffer {
    return this.buffer.subarray(0, this.pointer);
  }

  getPointer(): number {
    return this.pointer;
  }

  getRemaining(): number {
    return this.length - this.pointer;
  }

  setPointer(pointer: number): this {
    this.pointer = pointer;

    return this;
  }
}

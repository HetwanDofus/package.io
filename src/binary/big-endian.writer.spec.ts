import { describe, beforeEach, test, expect } from "bun:test";

import { BigEndianWriter } from ".";

describe("BigEndianWriter", () => {
  let writer: BigEndianWriter;

  beforeEach(() => {
    writer = new BigEndianWriter();
  });

  test("writeVarInt", () => {
    writer.writeVarInt(10);

    expect(writer.getBuffer()).toEqual(Buffer.from([10]));
  });

  test("writeVarUInt", () => {
    writer.writeVarUInt(10);

    expect(writer.getBuffer()).toEqual(Buffer.from([10]));
  });

  test("writeVarShort", () => {
    writer.writeVarShort(10);

    expect(writer.getBuffer()).toEqual(Buffer.from([10]));
  });

  test("writeVarUShort", () => {
    writer.writeVarUShort(10);

    expect(writer.getBuffer()).toEqual(Buffer.from([10]));
  });

  test("writeUShort", () => {
    writer.writeUShort(10);

    expect(writer.getBuffer()).toEqual(Buffer.from([0, 10]));
  });

  test("writeByte", () => {
    writer.writeByte(1);

    expect(writer.getBuffer()).toEqual(Buffer.from([1]));
  });

  test("writeBytes", () => {
    writer.writeBytes(new Int8Array([1, 2, 3]));

    expect(writer.getBuffer()).toEqual(Buffer.from([1, 2, 3]));
  });

  test("writeBuffer", () => {
    writer.writeBuffer(Buffer.from([4, 5, 6]));
    writer.writeBuffer(Buffer.from([1, 2, 3]));

    expect(writer.getBuffer()).toEqual(Buffer.from([4, 5, 6, 1, 2, 3]));
  });

  test("writeChar", () => {
    writer.writeChar("a");

    expect(writer.getBuffer()).toEqual(Buffer.from([97]));
  });

  test("writeVarLong", () => {
    writer.writeVarLong(10);

    expect(writer.getBuffer()).toEqual(
      Buffer.from([138, 128, 128, 128, 160, 1])
    );
  });

  test("writeVarULong", () => {
    writer.writeVarULong(10);

    expect(writer.getBuffer()).toEqual(
      Buffer.from([138, 128, 128, 128, 160, 1])
    );
  });

  test("writeBool", () => {
    writer.writeBoolean(true);

    expect(writer.getBuffer()).toEqual(Buffer.from([1]));
  });

  test("writeUTF", () => {
    writer.writeUTF("test");

    expect(writer.getBuffer()).toEqual(Buffer.from([0, 4, 116, 101, 115, 116]));
  });
});

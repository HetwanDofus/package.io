import { describe, test, expect } from "bun:test";

import { BigEndianWriter, BigEndianReader } from ".";

describe("BigEndianReader", () => {
  test("readVarInt", () => {
    const value = new BigEndianWriter().writeVarInt(10).getBuffer();
    const reader = new BigEndianReader(value);

    expect(reader.readVarInt()).toEqual(10);
  });

  test("readVarUInt", () => {
    const value = new BigEndianWriter().writeVarUInt(10).getBuffer();
    const reader = new BigEndianReader(value);

    expect(reader.readVarUInt()).toEqual(10);
  });

  test("readVarShort", () => {
    const value = new BigEndianWriter().writeVarShort(10).getBuffer();
    const reader = new BigEndianReader(value);

    expect(reader.readVarShort()).toEqual(10);
  });

  test("readVarUShort", () => {
    const value = new BigEndianWriter().writeVarUShort(10).getBuffer();
    const reader = new BigEndianReader(value);

    expect(reader.readVarUShort()).toEqual(10);
  });

  test("readVarLong", () => {
    const value = new BigEndianWriter().writeVarLong(10).getBuffer();
    const reader = new BigEndianReader(value);

    expect(reader.readVarLong()).toEqual(10);
  });

  test("readVarULong", () => {
    const value = new BigEndianWriter().writeVarULong(10).getBuffer();
    const reader = new BigEndianReader(value);

    expect(reader.readVarULong()).toEqual(10);
  });

  test("readUShort", () => {
    const value = new BigEndianWriter().writeUShort(69).getBuffer();

    const reader = new BigEndianReader(value);

    expect(reader.readUShort()).toEqual(69);
  });

  test("readUTF", () => {
    const value = new BigEndianWriter().writeUTF("test").getBuffer();
    const reader = new BigEndianReader(value);

    expect(reader.readUTF()).toEqual("test");
  });
});

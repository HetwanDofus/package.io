export default interface BinaryDataWriter {
  writeVarInt(data: number): this;
  writeVarUInt(data: number): this;
  writeVarShort(data: number): this;
  writeVarUShort(data: number): this;
  writeVarLong(data: number): this;
  writeVarULong(data: number): this;
  writeByte(data: number): this;
  writeBytes(data: Int8Array): this;
  writeBuffer(data: Buffer): this;
  writeChar(data: string): this;
  writeBoolean(data: boolean): this;
  writeShort(data: number): this;
  writeUShort(data: number): this;
  writeInt(data: number): this;
  writeUInt(data: number): this;
  writeLong(data: number): this;
  writeULong(data: number): this;
  writeFloat(data: number): this;
  writeDouble(data: number): this;
  writeUTF(data: string): this;
  writeUTFBytes(data: string): this;

  getBuffer(): Buffer;
  getData(): ArrayBufferLike;
  getPointer(): number;
  getRemaining(): number;

  setPointer(pointer: number): this;
}

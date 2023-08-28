export default interface BinaryDataReader {
  readVarInt(): number;
  readVarUInt(): number;
  readVarShort(): number;
  readVarUShort(): number;
  readVarLong(): number;
  readVarULong(): number;
  readByte(): number;
  readChar(): string;
  readBoolean(): boolean;
  readShort(): number;
  readUShort(): number;
  readInt(): number;
  readUInt(): number;
  readLong(): number;
  readULong(): number;
  readFloat(): number;
  readDouble(): number;
  readUTF(): string;
  readUTFBytes(length: number): string;

  getPointer(): number;
  getRemaining(): number;
  getBuffer(): Buffer;

  setPointer(pointer: number): this;
}

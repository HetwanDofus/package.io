interface BinaryDataReader {
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

interface BinaryDataWriter {
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

declare class BigEndianReader implements BinaryDataReader {
    static readonly INT_SIZE = 32;
    static readonly SHORT_SIZE = 16;
    static readonly SHORT_MIN_VALUE = -32768;
    static readonly SHORT_MAX_VALUE = 32767;
    static readonly USHORT_MAX_VALUE = 65536;
    static readonly CHUNCK_BIT_SIZE = 7;
    static readonly MASK_10000000 = 128;
    static readonly MASK_01111111 = 127;
    private buffer;
    private length;
    private pointer;
    constructor(buffer: Buffer);
    static from(buffer: Buffer): BigEndianReader;
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
    getBuffer(): Buffer;
    getPointer(): number;
    getRemaining(): number;
    setPointer(pointer: number): this;
}

declare class BigEndianWriter implements BinaryDataWriter {
    static readonly INT_SIZE = 32;
    static readonly SHORT_SIZE = 16;
    static readonly SHORT_MIN_VALUE = -32768;
    static readonly SHORT_MAX_VALUE = 32767;
    static readonly USHORT_MAX_VALUE = 65535;
    static readonly CHUNCK_BIT_SIZE = 7;
    static readonly MASK_10000000 = 128;
    static readonly MASK_01111111 = 127;
    static readonly DEFAULT_SIZE: number;
    private expandSize;
    private buffer;
    private length;
    private pointer;
    constructor(buffer?: Buffer, expandSize?: number);
    static from(size: number, expandSize?: number): BigEndianWriter;
    private expandIfNeeded;
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
    getData(): ArrayBufferLike;
    getBuffer(): Buffer;
    getPointer(): number;
    getRemaining(): number;
    setPointer(pointer: number): this;
}

declare const setFlag: (flag: number, offset: number, value: boolean) => number;
declare const getFlag: (flag: number, offset: number) => boolean;

declare class D2oGameDataProcess {
    private readonly reader;
    searchFieldsIndexes: Record<string, number>;
    searchFieldsCounts: Record<string, number>;
    searchFieldsTypes: Record<string, number>;
    searchTable: Record<string, Record<string | number, number[]>>;
    queryableFields: string[];
    constructor(reader: BinaryDataReader);
    private parseStream;
    private getReadFunction;
    getWriteFunction(type: number): Function;
    /**
     * This is for testing purposes only
     */
    private readSearchTable;
}

declare class D2oClass {
    private context;
    readonly id: number;
    readonly name: string;
    readonly packageName: string;
    fields: D2oField[];
    constructor(context: D2oContext, id: number, name: string, packageName: string);
    write(writer: BinaryDataWriter, data: Record<string, unknown>): void;
    read(reader: BinaryDataReader): Record<string, unknown>;
    addField(reader: BinaryDataReader, fieldName: string): void;
}
declare class D2oField {
    private context;
    readonly name: string;
    readData: Function;
    private type;
    private innerTypesNames;
    private innerTypes;
    private innerReadMethods;
    constructor(context: D2oContext, name: string);
    readType(reader: BinaryDataReader): void;
    writeType(writer: BinaryDataWriter, type?: number, innerIndex?: number): void;
    writeData(writer: BinaryDataWriter, data: unknown): void;
    getReadMethod: (reader: BinaryDataReader, type: number) => Function;
    getWriteMethod: (type: number) => Function;
    private readInteger;
    private writeInteger;
    private readBoolean;
    private writeBoolean;
    private readString;
    private writeString;
    private readNumber;
    private writeNumber;
    private readI18n;
    private writeI18n;
    private readUint;
    private writeUint;
    private readVector;
    private writeVector;
    private readObject;
    private writeObject;
    isVector(): boolean;
    isVectorOfObject(): boolean;
    is2ndLevelVector(): boolean;
}

declare class D2oContext {
    indexes: Map<number, number>;
    classesDataIndexes: Map<number, number>;
    classesDefinitions: Map<number, D2oClass>;
    classesDefinitionsIndexes: Map<number, number>;
    dataProcessor?: D2oGameDataProcess;
}

declare class Reader$1 {
    readonly data: Buffer;
    private reader;
    context: D2oContext;
    constructor(data: Buffer);
    getData(classesNames?: string[]): Record<string, unknown>[];
    private readClasseDefinition;
}

declare class Writer$1 {
    private readonly context;
    private writer;
    private indexTable;
    private searchTable;
    constructor(context: D2oContext);
    write(data: Record<string, unknown>[]): Buffer;
    private createSearchTable;
    private addSearchTableEntry;
    private writeData;
    private writeIndexTable;
    private writeClassesDefinitions;
    private writeSearchTable;
}

declare class D2iContext {
    textSortIndexes: number[];
}

declare class D2iEntry {
    readonly key: string | number;
    readonly text: string;
    readonly undiactricalText?: string | undefined;
    constructor(key: string | number, text: string, undiactricalText?: string | undefined);
}

declare class Reader {
    readonly data: Buffer;
    private reader;
    context: D2iContext;
    constructor(data: Buffer);
    getData(): D2iEntry[];
}

declare class Writer {
    private headerWriter;
    private contentWriter;
    private dataDuplicateTextMap;
    private dataDuplicateUndiactricalText;
    constructor();
    write(data: D2iEntry[]): Buffer;
}

export { BigEndianReader, BigEndianWriter, BinaryDataReader, BinaryDataWriter, Reader as D2iReader, Writer as D2iWriter, Reader$1 as D2oReader, Writer$1 as D2oWriter, getFlag as bigEndianGetFlag, setFlag as bigEndianSetFlag };

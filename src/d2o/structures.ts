import { match } from "ts-pattern";

import { BinaryDataReader, BinaryDataWriter } from "@hetwan/io/binary/types";
import D2oFieldType from "@hetwan/io/d2o/game-data-type.enum";
import D2oContext from "@hetwan/io/d2o/context";
import { NULL_IDENTIFIER } from "@hetwan/io/d2o/constants";

export class D2oClass {
  public fields: D2oField[] = [];

  constructor(
    private context: D2oContext,
    public readonly id: number,
    public readonly name: string,
    public readonly packageName: string
  ) {
    this.context.classesDefinitions.set(this.id, this);
  }

  public write(writer: BinaryDataWriter, data: Record<string, unknown>): void {
    writer.writeInt(this.id);

    this.fields.forEach((field) => {
      field.writeData(writer, data[field.name]);
    });
  }

  public read(reader: BinaryDataReader): Record<string, unknown> {
    const data: Record<string, unknown> = {
      __typeId: this.id,
    };

    this.fields.forEach((field) => {
      data[field.name] = field.readData(reader);
    });

    return data;
  }

  public addField(reader: BinaryDataReader, fieldName: string): void {
    const field = new D2oField(this.context, fieldName);
    field.readType(reader);

    this.fields.push(field);
  }
}

export class D2oField {
  public readData: Function = () => null;

  private type: number = 0;

  private innerTypesNames: string[] = [];
  private innerTypes: number[] = [];

  private innerReadMethods: Function[] = [];

  constructor(private context: D2oContext, public readonly name: string) {}

  public readType(reader: BinaryDataReader): void {
    this.type = reader.readInt();

    this.readData = this.getReadMethod(reader, this.type).bind(this);
  }

  public writeType(
    writer: BinaryDataWriter,
    type = this.type,
    innerIndex: number = 0
  ): void {
    writer.writeInt(type);

    if (type === D2oFieldType.List) {
      writer.writeUTF(this.innerTypesNames[innerIndex]);

      const subType = this.innerTypes[innerIndex];

      return this.writeType(writer, subType, innerIndex + 1);
    }
  }

  public writeData(writer: BinaryDataWriter, data: unknown): void {
    const writeMethod = this.getWriteMethod(this.type);

    return writeMethod(writer, data);
  }

  public getReadMethod = (reader: BinaryDataReader, type: number): Function =>
    match(type)
      .with(D2oFieldType.Bool, () => this.readBoolean)
      .with(D2oFieldType.Number, () => this.readNumber)
      .with(D2oFieldType.I18N, () => this.readI18n)
      .with(D2oFieldType.Int, () => this.readInteger)
      .with(D2oFieldType.String, () => this.readString)
      .with(D2oFieldType.Uint, () => this.readUint)
      .with(D2oFieldType.List, () => {
        this.innerTypesNames.push(reader.readUTF());

        const subType = reader.readInt();

        this.innerTypes.push(subType);
        this.innerReadMethods.unshift(this.getReadMethod(reader, subType));

        return this.readVector.bind(this);
      })
      .otherwise(() => {
        if (type <= 0) {
          throw `Invalid type ${type}`;
        }

        return this.readObject.bind(this);
      });

  public getWriteMethod = (type: number): Function =>
    match(type)
      .with(D2oFieldType.Bool, () => this.writeBoolean)
      .with(D2oFieldType.Number, () => this.writeNumber)
      .with(D2oFieldType.I18N, () => this.writeI18n)
      .with(D2oFieldType.Int, () => this.writeInteger)
      .with(D2oFieldType.String, () => this.writeString)
      .with(D2oFieldType.Uint, () => this.writeUint)
      .with(D2oFieldType.List, () => this.writeVector.bind(this))
      .otherwise(() => {
        if (type <= 0) {
          throw `Invalid type ${type}`;
        }

        return this.writeObject.bind(this);
      });

  private readInteger(reader: BinaryDataReader): number {
    return reader.readInt();
  }

  private writeInteger(writer: BinaryDataWriter, value: number): void {
    writer.writeInt(value);
  }

  private readBoolean(reader: BinaryDataReader): boolean {
    return reader.readBoolean();
  }

  private writeBoolean(writer: BinaryDataWriter, value: boolean): void {
    writer.writeBoolean(value);
  }

  private readString(reader: BinaryDataReader): string | null {
    const value = reader.readUTF();

    if (value === "null") {
      return null;
    }

    return value;
  }

  private writeString(writer: BinaryDataWriter, value: string): void {
    if (value === null) {
      writer.writeUTF("null");

      return;
    }

    writer.writeUTF(value);
  }

  private readNumber(reader: BinaryDataReader): number {
    return reader.readDouble();
  }

  private writeNumber(writer: BinaryDataWriter, value: number): void {
    writer.writeDouble(value);
  }

  private readI18n(reader: BinaryDataReader): number {
    return reader.readInt();
  }

  private writeI18n(writer: BinaryDataWriter, value: number): void {
    writer.writeInt(value);
  }

  private readUint(reader: BinaryDataReader): number {
    return reader.readUInt();
  }

  private writeUint(writer: BinaryDataWriter, value: number): void {
    writer.writeUInt(value);
  }

  private readVector(
    reader: BinaryDataReader,
    innerIndex: number = 0
  ): unknown[] {
    const size = reader.readInt();
    const content: ((reader: BinaryDataReader) => unknown)[] = [];

    for (let i = 0; i < size; i += 1) {
      content.push(this.innerReadMethods[innerIndex](reader, innerIndex + 1));
    }

    return content;
  }

  private writeVector(
    writer: BinaryDataWriter,
    value: unknown[],
    innerIndex: number = 0
  ): void {
    writer.writeInt(value.length);

    const innerWriteMethod = this.getWriteMethod(this.innerTypes[innerIndex]);

    value.forEach((item) => {
      innerWriteMethod(writer, item, innerIndex + 1);
    });
  }

  private readObject(reader: BinaryDataReader): unknown {
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

  private writeObject(
    writer: BinaryDataWriter,
    value: Record<string, unknown>
  ): void {
    if (value === null || value === undefined) {
      writer.writeInt(NULL_IDENTIFIER);

      return;
    }

    const classDefinition = this.context.classesDefinitions.get(
      <number>value.__typeId
    );

    if (!classDefinition) {
      throw `Class definition not found for id ${value.__typeId}`;
    }

    return classDefinition.write(writer, value);
  }

  public isVector(): boolean {
    return this.type === D2oFieldType.List;
  }

  public isVectorOfObject(): boolean {
    return this.isVector() && this.innerTypes[0] > 0;
  }

  public is2ndLevelVector(): boolean {
    return (
      this.type === D2oFieldType.List &&
      this.innerTypes[0] === D2oFieldType.List
    );
  }
}

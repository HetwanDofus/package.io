import { match } from "ts-pattern";

import type {
  BinaryDataReader,
  BinaryDataWriter,
} from "@hetwan/io/binary/types";
import GameDataType from "@hetwan/io/d2o/game-data-type.enum";

export default class D2oGameDataProcess {
  public searchFieldsIndexes: Record<string, number> = {};
  public searchFieldsCounts: Record<string, number> = {};
  public searchFieldsTypes: Record<string, number> = {};

  public searchTable: Record<string, Record<string | number, number[]>> = {};

  public queryableFields: string[] = [];

  constructor(private readonly reader: BinaryDataReader) {
    this.parseStream();

    //this.readSearchTable();
  }

  private parseStream(): void {
    let fieldListSize: number = this.reader.readInt();
    const indexSearchOffset: number =
      this.reader.getPointer() + fieldListSize + 4;

    while (fieldListSize > 0) {
      const size: number = this.reader.getRemaining();
      const fieldName = this.reader.readUTF();

      this.queryableFields.push(fieldName);

      this.searchFieldsIndexes[fieldName] =
        this.reader.readInt() + indexSearchOffset;
      this.searchFieldsTypes[fieldName] = this.reader.readInt();
      this.searchFieldsCounts[fieldName] = this.reader.readInt();

      fieldListSize -= size - this.reader.getRemaining();
    }
  }

  private getReadFunction(type: number): Function {
    return match(type)
      .with(
        GameDataType.Int,
        () => (reader: BinaryDataReader) => reader.readInt()
      )
      .with(
        GameDataType.Bool,
        () => (reader: BinaryDataReader) => reader.readBoolean()
      )
      .with(
        GameDataType.String,
        () => (reader: BinaryDataReader) => reader.readUTF()
      )
      .with(
        GameDataType.Number,
        () => (reader: BinaryDataReader) => reader.readDouble()
      )
      .with(
        GameDataType.I18N,
        () => (reader: BinaryDataReader) => reader.readInt()
      )
      .with(
        GameDataType.Uint,
        () => (reader: BinaryDataReader) => reader.readUInt()
      )
      .otherwise(() => {
        throw `Unhandled type ${type}`;
      });
  }

  public getWriteFunction(type: number): Function {
    return match(type)
      .with(
        GameDataType.Int,
        () => (writer: BinaryDataWriter, value: number) =>
          writer.writeInt(value)
      )
      .with(
        GameDataType.Bool,
        () => (writer: BinaryDataWriter, value: boolean) =>
          writer.writeBoolean(value)
      )
      .with(
        GameDataType.String,
        () => (writer: BinaryDataWriter, value: string) =>
          writer.writeUTF(value)
      )
      .with(
        GameDataType.Number,
        () => (writer: BinaryDataWriter, value: number) =>
          writer.writeDouble(value)
      )
      .with(
        GameDataType.I18N,
        () => (writer: BinaryDataWriter, value: number) =>
          writer.writeInt(value)
      )
      .with(
        GameDataType.Uint,
        () => (writer: BinaryDataWriter, value: number) =>
          writer.writeUInt(value)
      )
      .otherwise(() => {
        throw `Unhandled type ${type}`;
      });
  }

  /**
   * This is for testing purposes only
   */
  private readSearchTable(): void {
    this.queryableFields.forEach((queryableField) => {
      const readingMethod = this.getReadFunction(
        this.searchFieldsTypes[queryableField]
      );

      if (readingMethod === null) {
        return;
      }

      const currentTableEntry: Record<string | number, number[]> = {};
      const itemsCount = this.searchFieldsCounts[queryableField];

      this.reader.setPointer(this.searchFieldsIndexes[queryableField]);

      for (let i = 0; i < itemsCount; i += 1) {
        const value = readingMethod(this.reader) as string | number;

        const indexes: number[] = (currentTableEntry[value] = []);
        let size: number = this.reader.readInt() / 4;

        while (size > 0) {
          try {
            indexes.push(this.reader.readInt());
          } catch (err) {
            // In Items.d2o resourcesBySubarea for example is too big for the remaning size of the buffer
            // It comes from the fact that the original writer encodes Vector<Vector<value>> with itemsCount of 1, a size of ?
            // and a value that seems random
            //
            // I still don't know why, but it's not a problem for the game

            break;
          }

          size -= 1;
        }
      }
    });
  }
}

import { BigEndianWriter } from "@hetwan/io/binary";
import type { BinaryDataWriter } from "@hetwan/io/binary/types";
import D2oContext from "@hetwan/io/d2o/context";

export default class Writer {
  private writer: BinaryDataWriter;

  private indexTable: Map<number, number> = new Map();
  private searchTable: Record<string, Record<string | number, Set<number>>> =
    {};

  constructor(private readonly context: D2oContext) {
    // Allocate 20MB of memory, with a step of 1MB
    this.writer = BigEndianWriter.from(1024 * 1000 * 10, 1024 * 1000);
  }

  public write(data: Record<string, unknown>[]): Buffer {
    this.createSearchTable(data);

    this.writer.writeUTFBytes("D2O");

    const futureIndexTablePosition: number = this.writer.getPointer();

    // Future index table index
    this.writer.writeInt(0);

    this.writeData(data);
    this.writeIndexTable(futureIndexTablePosition);
    this.writeClassesDefinitions();
    this.writeSearchTable();

    return this.writer.getBuffer();
  }

  private createSearchTable(
    data: Record<string, unknown>[],
    prefix: string = ""
  ) {
    const getPrefixedFieldName = (fieldName: string): string => {
      return prefix === null || prefix.length === 0
        ? fieldName
        : `${prefix}.${fieldName}`;
    };

    const queryableFields = this.context.dataProcessor?.queryableFields ?? [];

    if (Object.keys(this.searchTable).length === 0) {
      queryableFields.forEach((queryableField) => {
        this.searchTable[queryableField] = {};
      });
    }

    // Create 2nd level vector search table to avoid adding entries to it
    this.context.classesDefinitions.forEach((classDefinition) => {
      classDefinition.fields
        .filter(
          (field) =>
            queryableFields.includes(field.name) && field.is2ndLevelVector()
        )
        .map((field) => {
          this.searchTable[field.name][0] = new Set<number>([]);
        });
    });

    data.forEach((entry, index) => {
      if (entry === null) {
        throw new Error("Entry is null");
      }

      const entryObject = this.context.classesDefinitions.get(
        (<{ __typeId: number }>entry)["__typeId"]
      );

      if (!entryObject) {
        throw new Error("Entry object is null");
      }

      entryObject.fields
        .filter((field) => !field.is2ndLevelVector())
        .filter(
          (field) =>
            queryableFields.includes(getPrefixedFieldName(field.name)) ||
            field.isVector()
        )
        .map((field) => {
          const prefixedFieldName: string = getPrefixedFieldName(field.name);

          if (field.isVector() && field.isVectorOfObject()) {
            const value = entry[field.name] as Record<string, unknown>[];

            this.createSearchTable(value, prefixedFieldName);

            return;
          }

          if (field.isVector()) {
            const value = entry[field.name] as (string | number)[];

            value.forEach((item) => {
              this.addSearchTableEntry(item, prefixedFieldName, index);
            });

            return;
          }

          const value = entry[field.name] as string | number;

          this.addSearchTableEntry(value, prefixedFieldName, index);
        });
    });
  }

  private addSearchTableEntry(
    value: string | number,
    fieldName: string,
    index: number
  ): void {
    if (value in this.searchTable[fieldName]) {
      this.searchTable[fieldName][value].add(index);

      return;
    }

    this.searchTable[fieldName][value] = new Set<number>([index]);
  }

  private writeData(data: Record<string, unknown>[]): void {
    data.forEach((entry, index) => {
      this.indexTable.set(index, this.writer.getPointer());

      const entryObject = this.context.classesDefinitions.get(
        (entry as { __typeId: number })["__typeId"]
      );

      if (!entryObject) {
        return;
      }

      entryObject.write(this.writer, entry);
    });
  }

  private writeIndexTable(targetIndexTableIndex: number): void {
    const startPosition: number = this.writer.getPointer();

    this.writer.setPointer(targetIndexTableIndex);
    this.writer.writeInt(startPosition);
    this.writer.setPointer(startPosition);

    this.writer.writeInt(this.indexTable.size * 8);

    this.indexTable.forEach((position, index) => {
      this.writer.writeInt(index);
      this.writer.writeInt(position);
    });
  }

  private writeClassesDefinitions(): void {
    this.writer.writeInt(this.context.classesDefinitions.size);

    // Sort classes definitions by original index in the file
    const classesDefinitions = Array.from(
      this.context.classesDefinitionsIndexes.entries()
    )
      .sort(([, index]) => index)
      .map(([classId]) => {
        return this.context.classesDefinitions.get(classId)!;
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

  private writeSearchTable(): void {
    if (!this.context.dataProcessor) {
      return;
    }

    const { queryableFields, searchFieldsTypes, getWriteFunction } =
      this.context.dataProcessor;

    let currentPosition: number;
    let fieldListSize = 0;

    const searchTableStartPosition: number = this.writer.getPointer();
    const fieldSearchIndexes: number[] = [];

    // Temporary field list size
    this.writer.writeInt(0);

    queryableFields.forEach((queryableField) => {
      const queryableFieldStartPosition: number = this.writer.getPointer();

      this.writer.writeUTF(queryableField);

      fieldSearchIndexes.push(this.writer.getPointer());

      // Temporary field start index
      this.writer.writeInt(0);
      this.writer.writeInt(searchFieldsTypes[queryableField]);
      this.writer.writeInt(
        Object.keys(this.searchTable[queryableField]).length
      );

      fieldListSize += this.writer.getPointer() - queryableFieldStartPosition;
    });

    const startSearchTableDataPosition: number = this.writer.getPointer();

    // Temporary search table data size
    this.writer.writeInt(0);

    const indexWriteOffset: number =
      searchTableStartPosition + fieldListSize + 8;

    queryableFields.forEach((queryableField, i) => {
      const startQueryableFieldDefinitionPosition: number =
        this.writer.getPointer();

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

      this.writer.setPointer(fieldSearchIndexes[i]);
      this.writer.writeInt(
        startQueryableFieldDefinitionPosition - indexWriteOffset
      );
      this.writer.setPointer(currentPosition);
    });

    currentPosition = this.writer.getPointer();

    // Write field list size
    this.writer.setPointer(searchTableStartPosition);
    this.writer.writeInt(fieldListSize);

    // Write search table data size
    this.writer.setPointer(startSearchTableDataPosition);
    this.writer.writeInt(currentPosition - startSearchTableDataPosition);

    this.writer.setPointer(currentPosition);
  }
}

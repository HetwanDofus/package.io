import type { BinaryDataReader } from "@hetwan/io/binary/types";
import { BigEndianReader } from "@hetwan/io/binary";

import D2oContext from "@hetwan/io/d2o/context";
import D2oGameDataProcess from "@hetwan/io/d2o/game-data-process";
import { D2oClass } from "@hetwan/io/d2o/structures";
import { D2O_HEADER } from "@hetwan/io/d2o/constants";

export default class Reader {
  private reader: BinaryDataReader;

  public context: D2oContext = new D2oContext();

  constructor(readonly data: Buffer) {
    this.reader = new BigEndianReader(data);

    if (this.reader.readUTFBytes(3) !== D2O_HEADER) {
      throw "Invalid D2O header";
    }

    // Index table starting position
    this.reader.setPointer(this.reader.readInt());

    const indexTableSize: number = this.reader.readInt();

    for (let i = 0; i < indexTableSize; i += 8) {
      this.context.indexes.set(this.reader.readInt(), this.reader.readInt());
    }

    // Classes definitions starting position
    const size: number = this.reader.readInt();

    for (let i = 0; i < size; i += 1) {
      const classId: number = this.reader.readInt();

      // Save original position
      this.context.classesDefinitionsIndexes.set(classId, i);

      this.readClasseDefinition(classId);
    }

    if (this.reader.getRemaining() > 0) {
      this.context.dataProcessor = new D2oGameDataProcess(this.reader);
    }
  }

  public getData(classesNames: string[] = []): Record<string, unknown>[] {
    const data: Record<string, unknown>[] = [];

    this.context.indexes.forEach((position) => {
      this.reader.setPointer(position);

      const classDefinition = this.context.classesDefinitions.get(
        this.reader.readInt()
      );

      if (
        !classDefinition ||
        (!classesNames.includes(classDefinition.name) &&
          classesNames.length > 0)
      ) {
        return;
      }

      this.context.classesDataIndexes.set(classDefinition.id, position);

      data.push(classDefinition.read(this.reader));
    });

    return data;
  }

  private readClasseDefinition(classId: number): void {
    const className: string = this.reader.readUTF();
    const classPackageName: string = this.reader.readUTF();

    const classDefinition = new D2oClass(
      this.context,
      classId,
      className,
      classPackageName
    );

    const fieldsSize: number = this.reader.readInt();

    for (let j = 0; j < fieldsSize; j += 1) {
      const fieldName = this.reader.readUTF();

      classDefinition.addField(this.reader, fieldName);
    }
  }
}

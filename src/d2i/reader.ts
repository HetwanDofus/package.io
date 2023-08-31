import { BigEndianReader, type BinaryDataReader } from "@hetwan/io/binary";
import { D2iEntry, D2iContext } from "@hetwan/io/d2i";

export default class Reader {
  private reader: BinaryDataReader;

  public context: D2iContext = new D2iContext();

  constructor(readonly data: Buffer) {
    this.reader = new BigEndianReader(data);
  }

  public getData(): D2iEntry[] {
    const data: D2iEntry[] = [];

    const headerPosition = this.reader.readInt();

    this.reader.setPointer(headerPosition);

    const dataLength = this.reader.readInt();

    for (let i = 0; i < dataLength; i += 9) {
      const key = this.reader.readInt();
      const isUndiacritical = this.reader.readBoolean();

      const dataPosition = this.reader.readInt();

      const currentPosition = this.reader.getPointer();

      this.reader.setPointer(dataPosition);

      const text = this.reader.readUTF();

      this.reader.setPointer(currentPosition);

      if (isUndiacritical) {
        const undiacriticalPosition = this.reader.readInt();

        const currentPosition = this.reader.getPointer();

        this.reader.setPointer(undiacriticalPosition);

        const undiacriticalText = this.reader.readUTF();

        this.reader.setPointer(currentPosition);

        data.push(new D2iEntry(key, text, undiacriticalText));

        i += 4;

        continue;
      }

      data.push(new D2iEntry(key, text));
    }

    let textLength = this.reader.readInt();

    while (textLength > 0) {
      let currentPosition = this.reader.getPointer();

      const key = this.reader.readUTF();

      const dataPosition = this.reader.readInt();

      textLength -= this.reader.getPointer() - currentPosition;
      currentPosition = this.reader.getPointer();

      this.reader.setPointer(dataPosition);

      const text = this.reader.readUTF();

      data.push(new D2iEntry(key, text));

      this.reader.setPointer(currentPosition);
    }

    let indexesLength = this.reader.readInt();

    while (indexesLength > 0) {
      this.context.textSortIndexes.push(this.reader.readInt());

      indexesLength -= 4;
    }

    return data;
  }
}

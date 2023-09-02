import { BigEndianWriter, type BinaryDataWriter } from "@hetwan/io/binary";
import { D2iEntry } from "@hetwan/io/d2i";

export default class Writer {
  private headerWriter: BinaryDataWriter;
  private contentWriter: BinaryDataWriter;

  private dataDuplicateTextMap: Map<string, number> = new Map();
  private dataDuplicateUndiactricalText: Map<string, number> = new Map();

  constructor() {
    // Allocate 10MB of memory, with a step of 1MB
    this.headerWriter = BigEndianWriter.from(1024 * 1000 * 10, 1024 * 1000);
    // Allocate 50MB of memory, with a step of 5MB
    this.contentWriter = BigEndianWriter.from(
      1024 * 1000 * 50,
      1024 * 1000 * 5
    );
  }

  public write(data: D2iEntry[]): Buffer {
    // Set a space for the data position
    this.contentWriter.writeInt(0);

    // Set a space for the data length
    this.headerWriter.writeInt(0);

    data
      .filter((d) => typeof d.key === "number")
      .forEach((entry) => {
        this.headerWriter.writeInt(entry.key as number);
        this.headerWriter.writeBoolean(!!entry.undiactricalText);

        this.headerWriter.writeInt(this.contentWriter.getPointer());

        this.dataDuplicateTextMap.set(
          entry.text,
          this.contentWriter.getPointer()
        );

        this.contentWriter.writeUTF(entry.text);

        if (entry.undiactricalText) {
          this.headerWriter.writeInt(this.contentWriter.getPointer());

          this.dataDuplicateUndiactricalText.set(
            entry.undiactricalText,
            this.contentWriter.getPointer()
          );

          this.contentWriter.writeUTF(entry.undiactricalText);
        }
      });

    const dataLength = this.headerWriter.getPointer() - 4;
    const headerAfterDataPosition = this.headerWriter.getPointer();

    this.headerWriter.setPointer(0);
    this.headerWriter.writeInt(dataLength);
    this.headerWriter.setPointer(headerAfterDataPosition);

    // Set a space for the text length
    this.headerWriter.writeInt(0);

    data
      .filter((d) => typeof d.key === "string")
      .forEach((entry) => {
        this.headerWriter.writeUTF(entry.key as string);

        const text = entry.text;
        const duplicateTextPosition =
          this.dataDuplicateUndiactricalText.get(text) ??
          this.dataDuplicateTextMap.get(text);

        if (duplicateTextPosition) {
          this.headerWriter.writeInt(duplicateTextPosition);
        } else {
          this.headerWriter.writeInt(this.contentWriter.getPointer());

          this.contentWriter.writeUTF(text);
        }
      });
    const textLength =
      this.headerWriter.getPointer() - headerAfterDataPosition - 4;
    const headerAfterTextPosition = this.headerWriter.getPointer();

    this.headerWriter.setPointer(headerAfterDataPosition);
    this.headerWriter.writeInt(textLength);
    this.headerWriter.setPointer(headerAfterTextPosition);

    const indexesLengthPosition = this.headerWriter.getPointer();

    // Set a space for the indexes length
    this.headerWriter.writeInt(0);

    data
      .filter((d) => typeof d.key === "number")
      .sort((a, b) => {
        if (a.text.length === 0) {
          return -1;
        }

        if (b.text.length === 0 && a.text.length > 0) {
          return 1;
        }

        // Can disable to increase perf
        return a.text.localeCompare(b.text, "en-US");
      })
      .forEach((entry) => {
        this.headerWriter.writeInt(entry.key as number);
      });

    const indexesLength =
      this.headerWriter.getPointer() - indexesLengthPosition - 4;
    const headerAfterIndexesPosition = this.headerWriter.getPointer();

    this.headerWriter.setPointer(indexesLengthPosition);
    this.headerWriter.writeInt(indexesLength);
    this.headerWriter.setPointer(headerAfterIndexesPosition);

    const futureHeaderPosition = this.contentWriter.getPointer();

    this.contentWriter.writeBuffer(this.headerWriter.getBuffer());

    const futureContentPosition = this.contentWriter.getPointer();

    this.contentWriter.setPointer(0);
    this.contentWriter.writeInt(futureHeaderPosition);
    this.contentWriter.setPointer(futureContentPosition);

    return this.contentWriter.getBuffer();
  }
}

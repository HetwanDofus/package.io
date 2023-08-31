import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { D2iReader, D2iWriter } from "@hetwan/io/d2i";

describe("d2i", () => {
  test("Reading/Writing", () => {
    const buffer = readFileSync(join(import.meta.dir, "./i18n_fr.d2i"));
    const reader = new D2iReader(buffer);
    const writer = new D2iWriter();

    const data = reader.getData();

    expect(data.length).toBeGreaterThan(0);

    const testBuffer = writer.write(data);

    expect(testBuffer.length).toBe(buffer.length);

    const reader2 = new D2iReader(testBuffer);
    const data2 = reader2.getData();

    expect(data2.length).toEqual(data.length);
    expect(reader2.context.textSortIndexes.length).toEqual(
      reader.context.textSortIndexes.length
    );
  });
});

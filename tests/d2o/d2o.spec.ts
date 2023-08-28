import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { D2oReader, D2oWriter } from "@hetwan/io/d2o";

describe("d2o", () => {
  test("Reading/Writing", () => {
    const buffer = readFileSync(join(import.meta.dir, "./Url.d2o"));
    const reader = new D2oReader(buffer);
    const writer = new D2oWriter(reader.context);

    expect(reader.context.classesDefinitions.size).toBe(1);
    expect(reader.context.classesDefinitions.get(1)?.name).toBe("Url");
    expect(reader.context.classesDefinitions.get(1)?.packageName).toBe(
      "com.ankamagames.dofus.datacenter.misc"
    );
    expect(reader.context.classesDefinitions.get(1)?.fields.length).toBe(5);

    const data = reader.getData();

    expect(data.length).toBe(2);

    const testBuffer = writer.write(data);

    expect(testBuffer.length).toBe(buffer.length);
  });
});

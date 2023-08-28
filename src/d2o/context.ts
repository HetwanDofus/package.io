import D2oGameDataProcess from "@hetwan/io/d2o/game-data-process";
import { D2oClass } from "@hetwan/io/d2o/structures";

export default class D2oContext {
  public indexes: Map<number, number> = new Map();
  public classesDataIndexes: Map<number, number> = new Map();
  public classesDefinitions: Map<number, D2oClass> = new Map();
  public classesDefinitionsIndexes: Map<number, number> = new Map();
  public dataProcessor?: D2oGameDataProcess;
}

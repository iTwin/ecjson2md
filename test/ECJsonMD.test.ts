import { ECJsonMarkdown } from "../source/ecjson2md";
import { assert } from "chai";
import { Schema } from "@bentley/ecjs";
import * as fs from "fs";

describe("ECJsonToMD", () => {
  let testECJsonMD: ECJsonMarkdown;

  describe("Instantiate ECJsonToD", () => {
    beforeEach(() => {
      testECJsonMD = new ECJsonMarkdown(["./test/Assets"]);
    });

    it("should successfully create an instance of ECJsonMarkDown", () => {
      assert.isDefined(testECJsonMD);
    });

    it("should successfully create an instance of ECJsonMarkDown with a context", () => {
      assert.isDefined(testECJsonMD.getContext());
    });

    it("should successfully load the schema into memory", () => {
      const testFilePath = "./test/Assets/schemaA.ecschema.json";
      const testSchemaJson = JSON.parse(fs.readFileSync(testFilePath, "utf-8"));
      const testSchemaPromise = Schema.fromJson(testSchemaJson, testECJsonMD.getContext());

      testSchemaPromise.then( (result) => {
        assert.isDefined(result);
        assert.equal(result.name, "SchemaA");
        assert.equal(result.description, "This is test schema A.");
      });
    });
  });

  describe("Generate markdown", () => {
    let testFilePath = "./test/Assets/schemaA.ecschema.json";
    let testSchemaJson: object;
    let outputPath: string;
    let lines: string[];

    before(() => {
      testFilePath =  "./test/Assets/schemaA.ecschema.json";
      outputPath = "./test/Assets/schemaA.ecschema.md";

      // If the markdown file already exists, get rid of it and remake it
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      testSchemaJson = JSON.parse(fs.readFileSync(testFilePath, "utf-8"));

      testECJsonMD = new ECJsonMarkdown(["./test/Assets"]);
      testECJsonMD.loadJsonSchema(testSchemaJson, outputPath);
    });

    beforeEach(() => {
      lines = fs.readFileSync(outputPath).toString().split("\n");
    });

    after(() => {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    });

    it("should write the name of the schema with as h1", () => {
      // Check that the name of the schema is written as an h1 followed by exactly
      // one empty line
      assert.equal(lines[0], "# SchemaA");
      assert.equal(lines[1], "");
      assert.notEqual(lines[2], "");
    });

    it("should write the classes as a table", () => {
      // Check that the classes print into a table with the correct name, description, and type
      assert.equal(lines[10], "|PropertyOne|This is the first property of ClassOne|string|");
      assert.equal(lines[11], "|PropertTwo|This is the second property of ClassOne.|string|");
      assert.equal(lines[12], "|PropertyThree|This is the third property of ClassOne|int|");

      // Check that the classes print into a table with the correct name, description, and type
      assert.equal(lines[20], "|PropertyOne|This is the first property of ClassTwo|int|");
      assert.equal(lines[21], "|ProperyTwo|This is the second property of ClassTwo.|string|");
      assert.equal(lines[22], "|PropertyThree|This is the third property of ClassTwo|int|");
    });
  });
});

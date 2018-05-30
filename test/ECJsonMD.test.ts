import { ECJsonMarkdown } from "../source/ecjson2md";
import { assert, expect } from "chai";
import { Schema } from "@bentley/ecjs";
import * as fs from "fs";
import { ECJsonFileNotFound, ECJsonBadJson } from "Exception";

describe("ECJsonToMD", () => {
  let testECJsonMD: ECJsonMarkdown;

  describe("Instantiate ECJsonToMD", () => {
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

  describe("Input and output", () => {
    const outputPath = "./test/Assets/BadInput.md";

    beforeEach(() => {
      testECJsonMD = new ECJsonMarkdown(["./test/Assets"]);
    });

    it("should throw an error for an input path that doens't exist", () => {
      expect(() => testECJsonMD.loadJsonSchema("./test/Assets/nothing.json", outputPath).to.throw(ECJsonFileNotFound));
    });

    it("should throw an error for a malformed json file", () => {
      expect(() => testECJsonMD.loadJsonSchema("./test/Assets/malformed.json", outputPath).to.throw(ECJsonBadJson));
    });

    // Should throw an error for a search path that does not exist
    it("should throw an error for a nonexistent search directory", () => {
      assert.throws(() => new ECJsonMarkdown(["./test/Assets,./thisdirectorydoesntexist"]), "./thisdirectorydoesntexist is not a viable search path");
    });

  });
  describe("Generate markdown", () => {
    let testFilePath = "./test/Assets/schemaA.ecschema.json";
    let outputPath: string;
    let lines: string[];

    before(() => {
      testFilePath =  "./test/Assets/schemaA.ecschema.json";
      outputPath = "./test/Assets/schemaA.ecschema.md";

      // If the markdown file already exists, get rid of it and remake it
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      testECJsonMD = new ECJsonMarkdown(["./test/Assets"]);
      testECJsonMD.loadJsonSchema(testFilePath, outputPath);
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
      assert.equal(lines[11], "|PropertyTwo|This is the second property of ClassOne.|string|");
      assert.equal(lines[12], "|PropertyThree|This is the third property of ClassOne|int|");

      // Check that the classes print into a table with the correct name, description, and type
      assert.equal(lines[20], "|PropertyOne|This is the first property of ClassTwo|int|");
      assert.equal(lines[21], "|PropertyTwo|This is the second property of ClassTwo.|string|");
      assert.equal(lines[22], "|PropertyThree|This is the third property of ClassTwo|int|");
    });

    it("should write the name of the classes as h2", () => {
      assert.equal(lines[3], "");
      assert.equal(lines[4], "## ClassOne");
      assert.equal(lines[5], "");

      assert.equal(lines[13], "");
      assert.equal(lines[14], "## ClassTwo");
      assert.equal(lines[15], "");
    });

    it("should write a class without a description", () => {
      assert.equal(lines[24], "## ClassThree");
      assert.equal(lines[25], "");
      assert.equal(lines[26], "| Name | Description| Type |");
    });

    it("should write a class with table without properties", () => {
      assert.equal(lines[25], "");
      assert.equal(lines[26], "| Name | Description| Type |");
      assert.equal(lines[27], "| :--- | :--------- | :--- |");
      assert.equal(lines[28], "");
    });

    it("should print a property without a description", () => {
      assert.equal(lines[35], "|PropertyOne||int|");
    });
  });
});

import { ECJsonMarkdown } from "../source/ecjson2md";
import { assert } from "chai";
import { Schema } from "@bentley/ecjs";
import * as fs from "fs";

describe("ECJsonToMD", () => {
  let testECJsonMD: ECJsonMarkdown;

  beforeEach(() => {
    testECJsonMD = new ECJsonMarkdown(["./Assets"]);
  });

  describe("Instantiate ECJsonToD", () => {

    it("should successfully create an instance of ECJsonMarkDown", () => {
      assert.isDefined(testECJsonMD);
    });

    it("should successfully create an instance of ECJsonMarkDown with a context", () => {
      assert.isDefined(testECJsonMD.getContext());
    });

    it("should successfully load the schema into memory", async () => {
      const testFilePath = "./test/Assets/schemaA.ecschema.json";
      const testSchemaJson = JSON.parse(fs.readFileSync(testFilePath, "utf-8"));
      const testSchemaPromise = Schema.fromJson(testSchemaJson, testECJsonMD.getContext());

      await testSchemaPromise.then( (result) => {
        assert.isDefined(result);
        assert.equal(result.name, "SchemaA");
        assert.equal(result.description, "This is test schema A.");
      });
    });

    it("should write the name of the schema with as h2", async () => {
      const testFilePath = "./test/Assets/schemaA.ecschema.json";
      const testSchemaJson = JSON.parse(fs.readFileSync(testFilePath, "utf-8"));
      const outputPath = "./test/Assets/schemaA.ecschema.md";
      testECJsonMD.loadJsonSchema(testSchemaJson, outputPath);

      const lines = fs.readFileSync(outputPath).toString().split("\n");

      // Check that the name of the schema is written as an h1 followed by exactly
      // one empty line
      assert.equal(lines[0], "# SchemaA");
      assert.equal(lines[1], "");
      assert.notEqual(lines[2], "");
    });
  });
});

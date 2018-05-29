import { ECJsonMarkdown } from "../source/ecjson2md";
import { assert } from "chai";
import { Schema } from "@bentley/ecjs";
import * as fs from "fs";

describe("ECJsonToMD", () => {
  let testECJsonMD: ECJsonMarkdown;

  describe("Instantiate ECJsonToD", () => {
    beforeEach(() => {
      testECJsonMD = new ECJsonMarkdown([".test/Assets"]);
    });

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
  });

  describe("Generate markdown", () => {
    let testFilePath: string;
    let testSchemaJson: object;
    let outputPath: string;
    let lines: string[];

    beforeEach(async () => {
      testFilePath =  "./test/Assets/schemaA.ecschema.json";
      testSchemaJson = JSON.parse(fs.readFileSync(testFilePath, "utf-8"));
      outputPath = "./test/Assets/schemaA.ecschema.md";

      testECJsonMD = new ECJsonMarkdown(["./Assets"]);
      await testECJsonMD.loadJsonSchema(testSchemaJson, outputPath);

      lines = fs.readFileSync(outputPath).toString().split("\n");
    });

    afterEach(() => {
      if (fs.existsSync(testFilePath)) fs.unlinkSync(outputPath);
    });

    it("should write the name of the schema with as h2", async () => {
      // Check that the name of the schema is written as an h1 followed by exactly
      // one empty line
      assert.equal(lines[0], "# SchemaA");
      assert.equal(lines[1], "");
      assert.notEqual(lines[2], "");
    });
  });
});

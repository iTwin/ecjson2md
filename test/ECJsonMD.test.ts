/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
import { ECJsonMarkdownGenerator } from "../source/ecjson2md";
import { assert } from "chai";
import { Schema } from "@bentley/ecjs";
import * as fs from "fs";
import { ECJsonFileNotFound, ECJsonBadJson, ECJsonBadSearchPath, ECJsonBadOutputPath } from "Exception";

describe("ECJsonToMD", () => {
  let testECJsonMD: ECJsonMarkdownGenerator;

  describe("Instantiate ECJsonToMD", () => {
    beforeEach(() => {
      const dirArray = new Array<string>();
      dirArray.push("./test/Assets/dir/");
      testECJsonMD = new ECJsonMarkdownGenerator(dirArray);
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
    const badOutputPath = "./test/Assets/BadInput.md";
    const badPath = "./this/directory/does/not/exist";
    const okayOutputPath = "./test/Assets/schemaA.ecschema.md";
    let err: any;

    beforeEach(() => {
      testECJsonMD = new ECJsonMarkdownGenerator(["./test/Assets"]);
      err = Error;
    });

    it("should throw an error for an input path that doesn't exist", () => {
      try {
        testECJsonMD.generate("./test/Assets/nothing.json", badOutputPath);
      } catch (e) {
        err = e;
      }

      assert.equal(ECJsonFileNotFound.name, err.name);
    });

    it("should throw an error for a malformed json file", () => {
      try {
        testECJsonMD.generate("./test/Assets/malformed.json", badOutputPath);
      } catch (e) {
        err = e;
      }

      assert.equal(ECJsonBadJson.name, err.name);
    });

    // Should throw an error for a search path that does not exist
    it("should throw an error for a nonexistent search directory", () => {
      try {
        new ECJsonMarkdownGenerator([badPath]);
      } catch (e) {
        err = e;
      }

      assert.equal(ECJsonBadSearchPath.name, err.name);
    });

    // Should throw an error for an output path that does not exist
    it("should throw an error for a nonexistent output path", () => {
      try {
        testECJsonMD.generate("./test/Assets/SchemaA.ecschema.json", badPath);
      } catch (e) {
        err = e;
      }

      assert.equal(ECJsonBadOutputPath.name, err.name);
    });

    before(() => {
      // If the markdown file already exists, get rid of it and remake it
      if (fs.existsSync(okayOutputPath)) fs.unlinkSync(okayOutputPath);

      testECJsonMD = new ECJsonMarkdownGenerator(["./test/Assets/dir"]);
      testECJsonMD.generate("./test/Assets/schemaA.ecschema.json", okayOutputPath);
    });

    after(() => {
      if (fs.existsSync(okayOutputPath)) fs.unlinkSync(okayOutputPath);
    });

    // Ensure that a markdown file is created with good input
    it("should create a markdown file at the correct location", () => {
      assert.isTrue(fs.existsSync(okayOutputPath));
    });
  });
  // TODO: Rewrite markdown tests when implementation is more up to spec

  describe("Basic markdown generation", () => {
    let testFilePath = "./test/Assets/schemaA.ecschema.json";
    let outputPath: string;
    let lines: string[];

    before(() => {
      testFilePath =  "./test/Assets/schemaA.ecschema.json";
      outputPath = "./test/Assets/schemaA.ecschema.md";

      // If the markdown file already exists, get rid of it and remake it
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      testECJsonMD = new ECJsonMarkdownGenerator(["./test/Assets/dir"]);
      testECJsonMD.generate(testFilePath, outputPath);
    });
/*
    beforeEach(() => {
      lines = fs.readFileSync(outputPath).toString().split("\n");
    });
*/
    after(() => {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    });

    it("should write the name of the schema with as h1", () => {
      // Check that the name of the schema is written as an h1 followed by exactly
      // one empty line
      lines = fs.readFileSync(outputPath).toString().split("\n");
      assert.equal(lines[0], "# SchemaA");
      assert.equal(lines[1], "");
      assert.equal(lines[2], "This is test schema A.");
    });

    it("should write the description of the schema", () => {
      assert.equal(lines[1], "");
      assert.equal(lines[2], "This is test schema A.");
      assert.equal(lines[3], "");
    });

    it("should write the description of each class in the schema", () => {
      assert.equal(lines[6], "This is the description for ClassFour");
      assert.equal(lines[19], "This is the description for ClassOne");
      assert.equal(lines[38], "This is the description for ClassTwo");
    });

    it("should write the classes as a table", () => {
      // Check that the classes print into a table with the correct name, description, and type
      assert.equal(lines[14], "|PropertyOne||PrimitiveProperty|");

      // Check that the classes print into a table with the correct name, description, and type
      assert.equal(lines[27], "|PropertyOne|This is the first property of ClassOne|PrimitiveProperty|");
      assert.equal(lines[28], "|PropertyTwo|This is the second property of ClassOne.|PrimitiveProperty|");
      assert.equal(lines[29], "|PropertyThree|This is the third property of ClassOne|PrimitiveProperty|");

      // Check that the classes print into a table with the correct name, description, and type
      assert.equal(lines[46], "|PropertyOne|This is the first property of ClassTwo|PrimitiveProperty|");
      assert.equal(lines[47], "|PropertyTwo|This is the second property of ClassTwo.|PrimitiveProperty|");
      assert.equal(lines[48], "|PropertyThree|This is the third property of ClassTwo|PrimitiveProperty|");
      });
/*
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

  */
 });
});

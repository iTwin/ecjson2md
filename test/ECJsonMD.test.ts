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

    it("generate the front matter correctly", () => {
      lines = fs.readFileSync(outputPath).toString().split("\n");
      assert.equal(lines[0], "---");
      assert.equal(lines[1], "Schema: SchemaA");
      assert.equal(lines[2], "This file was automatically generated via ecjson2md. Do not edit this file.");
      assert.equal(lines[3], "Any edits made to this file will be overwritten the next time it is generated");
      assert.equal(lines[4], "---");
    });

    it("should write the name of the schema with as h1", () => {
      // Check that the name of the schema is written as an h1 followed by exactly
      // one empty line
      assert.equal(lines[6], "# SchemaA");
      assert.equal(lines[7], "");
      assert.equal(lines[8], "This is test schema A.");
    });

    it("should write the description of the schema", () => {
      assert.equal(lines[7], "");
      assert.equal(lines[8], "This is test schema A.");
      assert.equal(lines[9], "");
    });

    it("should write the description of each class in the schema", () => {
      assert.equal(lines[14], "This is the description for ClassFour");
      assert.equal(lines[27], "This is the description for ClassOne");
      assert.equal(lines[46], "This is the description for ClassTwo");
    });

    it("should write the classes as a table", () => {
      // Check that the classes print into a table with the correct name, description, and type
      assert.equal(lines[22], "|PropertyOne||int||");

      // Check that the classes print into a table with the correct name, description, and type
      assert.equal(lines[35], "|PropertyOne|This is the first property of ClassOne|string|Json|");
      assert.equal(lines[36], "|PropertyTwo|This is the second property of ClassOne.|string||");
      assert.equal(lines[37], "|PropertyThree|This is the third property of ClassOne|int||");

      // Check that the classes print into a table with the correct name, description, and type
      assert.equal(lines[64], "|PropertyOne|This is the first property of ClassTwo|int||");
      assert.equal(lines[65], "|PropertyTwo|This is the second property of ClassTwo.|string||");
      assert.equal(lines[66], "|PropertyThree|This is the third property of ClassTwo|int||");
      });

    it("should write the name of the classes as h2", () => {
      assert.equal(lines[12], "### ClassFour"  );
      assert.equal(lines[25], "### ClassOne"   );
      assert.equal(lines[40], "### ClassThree" );
      assert.equal(lines[44], "### ClassTwo"   );
    });

    it("should write a class without a description", () => {
      assert.equal(lines[40], "### ClassThree");
      assert.equal(lines[41], "");
      assert.equal(lines[42], "**Class Type:** CustomAttributeClass");
    });

    it("shouldn't write a table for a class without properties", () => {
      assert.equal(lines[40], "### ClassThree");
      assert.equal(lines[41], "");
      assert.equal(lines[42], "**Class Type:** CustomAttributeClass");
      assert.equal(lines[43], "");
    });

    it("should write a property without a description", () => {
      assert.equal(lines[22], "|PropertyOne||int||");
    });

    it("should put an empty table at the end of each property table", () => {
      assert.equal(lines[23],
        "|            |                   |            |                        |");
      assert.equal(lines[38],
        "|            |                   |            |                        |");
      assert.equal(lines[67],
        "|            |                   |            |                        |");

      // Empty row at the end of a relationship table
      assert.equal(lines[58],
        "|          |                         |                                    |");
    });

    it("should correctly write the relationship table", () => {
      assert.equal(lines[56], "|**Source**|ClassOne|(0..*)|");
      assert.equal(lines[57], "|**Target**|ClassTwo|(0..*)|");
    });

    it("should write the baseclass properly", () => {
      assert.equal(lines[50], "**Base class:** SchemaA:ClassOne");
    });

    it("should list the extended typename for properties", () => {
      assert.equal(lines[35], "|PropertyOne|This is the first property of ClassOne|string|Json|");
      assert.equal(lines[36], "|PropertyTwo|This is the second property of ClassOne.|string||");
    });

    it("should correctly write the type for a referenced property type", () => {
      assert.equal(lines[77 ], "|TestTypes||CustomTestType||");
    });

 });

  describe("Advanced markdown generation tests", () => {
    let testFilePath: string;
    let outputPath: string;
    let lines: string[];

    before(() => {
      // If the file already exists, delete it
      testFilePath = "./test/Assets/Alphabet.ecschema.json";
      outputPath = "./test/Assets/Alphabet.ecschema.md";
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      testECJsonMD.generate(testFilePath, outputPath);
    });

    after(() => {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    });

    it("should alphabetize the classes", () => {
      lines = fs.readFileSync(outputPath, "utf8").split("\n");

      // Assert that each class header is written in alphabetical order
      assert.equal(lines[12], "### A");
      assert.equal(lines[18], "### B");
      assert.equal(lines[24], "### C");
      assert.equal(lines[30], "### D");
      assert.equal(lines[36], "### E");
      assert.equal(lines[42], "### F");
      assert.equal(lines[48], "### G");
      assert.equal(lines[54], "### H");
      assert.equal(lines[60], "### I");
    });

    it("should list multiple constraint classes", () => {
      assert.equal(lines[70], "|**Source**|A, B, C|(0..*)|");
      assert.equal(lines[71], "|**Target**|D, E, F|(0..*)|");
    });
  });
});

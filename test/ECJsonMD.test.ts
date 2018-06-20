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

  // This section of tests the markdown generation of the schema information, it does not
  // check to make sure that there are in the right order. That will be the job of another section.
  describe("Schema name, description, and frontmatter", () => {
    let schemaFilePath: string;
    let outputFilePath: string;
    let generator: ECJsonMarkdownGenerator;
    let searchDirs: string[];
    let lines: string[];

    schemaFilePath = "./test/Assets/basic.ecschema.json";
    outputFilePath = "./test/Assets/basic.ecschema.md";
    searchDirs = [];

    before(() => {
      // If the markdown file already exists, delete it
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

      // Generate the markdown
      generator = new ECJsonMarkdownGenerator(searchDirs);
      generator.generate(schemaFilePath, outputFilePath);
    });

    after(() => {
      // Delete the generated markdown file
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
    });

    it("should generate the front matter correctly", async () => {
      // Read the file
      lines = fs.readFileSync(outputFilePath, "utf8").replace(/\r?\n|\r/g, "").split("---");

      // Assert that the front matter is generated correctly
      assert.equal(lines[1], "Schema: BasicThis file was automatically generated via ecjson2md. Do not edit this file. Any edits made to this file will be overwritten the next time it is generated");
    });

    it("should write the name of the schema properly", async () => {
      // Assert that the name of the schema is correctly written as h1
      lines = fs.readFileSync(outputFilePath, "utf8").split("\n");
      assert.isTrue(lines.indexOf("# Basic") > -1, "The name of the schema was not properly written out");
    });

    it("should write the description of the schema properly", async () => {
      // Assert that the name of the schema is correctly written as h1
      lines = fs.readFileSync(outputFilePath, "utf8").split("\n");
      assert.isTrue(lines.indexOf("This is a very basic schema.") > -1, "The description was not properly written out");
    });
  });

  describe("Schema class sections", () => {
    let schemaFilePath: string;
    let outputFilePath: string;
    let generator: ECJsonMarkdownGenerator;
    let searchDirs: string[];
    let markdownText: string;
    let lines: string[];

    schemaFilePath = "./test/Assets/basicclasses.ecschema.json";
    outputFilePath = "./test/Assets/basicclasses.ecschema.md";
    searchDirs = [];

    before(async () => {
      // If the markdown file already exists, delete it
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

      // Generate the markdown
      generator = new ECJsonMarkdownGenerator(searchDirs);
      await generator.generate(schemaFilePath, outputFilePath);

      // Read the markdown
      markdownText = fs.readFileSync(outputFilePath, "utf8");
    });

    it("should write the classes header", () => {
      // Assert that the classes header is written as h2
      lines = markdownText.split("\n");
      assert.isTrue(lines.indexOf("## Classes:") > -1, "## Classes: was not written properly");
    });

    it("should write an h3 header for each class", () => {
      // Assert that an h3 is written for each class
      lines = markdownText.split("\n");
      assert.isTrue(lines.indexOf("### ClassOne") > -1, "h3 for ClassOne not written properly");
      assert.isTrue(lines.indexOf("### ClassTwo") > -1, "h3 for ClassTwo not written properly");
      assert.isTrue(lines.indexOf("### ClassThree") > -1, "h3 for ClassThree not written properly");
    });

    it("should write a description for each class that has one", () => {
      // Assert that a description is written for each class
      lines = markdownText.split("\n");
      assert.isTrue(lines.indexOf("This is the description for ClassOne") > -1, "description for class one was not written properly");
      assert.isTrue(lines.indexOf("This is the description for ClassTwo") > -1, "description for class two was not written properly");
    });

    it("should not write a description if a class does not have one", () => {
      // Assert that no description is written for class three
      lines = markdownText.replace(/\r?\n|\r/g, "").split("### ClassThree");
      assert.equal(lines[1].slice(0, 39), "**Class Type:** CustomAttributeClass###");
    });

    it("should write the class type for each class", () => {
      // Assert that each class type is written
      lines = markdownText.split("\n");
      assert.isTrue(lines.indexOf("**Class Type:** EntityClass") > -1, "class type for ClassOne not written properly");
      assert.isTrue(lines.indexOf("**Class Type:** CustomAttributeClass") > -1, "class type for ClassTwo not written properly");
      assert.isTrue(lines.indexOf("**Class Type:** Mixin") > -1, "class type for ClassTwo not written properly");
    });

    it("should correctly link the base class", () => {
      // Assert that a link is written for the base class
      lines = markdownText.split("\n");
      assert.isTrue(lines.indexOf("**Base class:** [link_to basicclasses.ecschema/#classone text=\"BasicClasses:ClassOne\"]") > -1, "base class link not written properly");
    });
  });

  describe("Basic schema class markdown structure", () => {
    let schemaFilePath: string;
    let outputFilePath: string;
    let generator: ECJsonMarkdownGenerator;
    let searchDirs: string[];
    let markdownText: string;
    let lines: string[];

    schemaFilePath = "./test/Assets/basicclasses.ecschema.json";
    outputFilePath = "./test/Assets/basicclasses.ecschema.md";
    searchDirs = [];

    before(async () => {
      // If the markdown file already exists, delete it
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

      // Generate the markdown
      generator = new ECJsonMarkdownGenerator(searchDirs);
      await generator.generate(schemaFilePath, outputFilePath);

      // Read the markdown
      markdownText = fs.readFileSync(outputFilePath, "utf8");
    });

    it("the front matter should be written on the first lines", () => {
      // Assert that the front matter takes up the first few lines
      lines = markdownText.split("\n");
      assert.equal(lines[0], "---");
      assert.equal(lines[3], "---");
    });

    it("title of the schema should come after the front matter", () => {
      // Assert that the title of the schema is written following a blank line after the front matter
      lines = markdownText.split("---");
      lines = lines[2].split("\n\n");
      assert.equal(lines[1], "# BasicClasses", "The title of the schema does not properly follow the front matter");
    });

    it("description of the schema should follow the title of the schema", () => {
      lines = markdownText.split("\n");
      // Get the index of the schematitle
      const assertIndex = lines.indexOf("# BasicClasses");
      if (assertIndex < 0) assert.fail();

      // Assert that the description of the schema follows the title after a blank line
      assert.equal(lines[assertIndex] + 1, "");
      assert.equal(lines[assertIndex] + 2, "This is a very basic schema with classes.");
    });
  });

  describe("Basic markdown generation old", () => {
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
      assert.equal(lines[50], "**Base class:** [link_to schemaa.ecschema/#classone text=\"SchemaA:ClassOne\"]");
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

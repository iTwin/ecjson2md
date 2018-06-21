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

  // Tests to ensure that it reads and generates files properly
  describe("Input and output", () => {
    const badOutputPath = "./test/Assets/BadInput.md";
    const badPath = "./this/directory/does/not/exist";
    const okayOutputPath = "./test/Assets/schemaA.ecschema.md";
    let err: ErrorConstructor;

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

    it("should throw an error for a nonexistent search directory", () => {
      try {
        new ECJsonMarkdownGenerator([badPath]);
      } catch (e) {
        err = e;
      }

      assert.equal(ECJsonBadSearchPath.name, err.name);
    });

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

  // This section of tests the markdown generation of the schema information, another section checks that they are in the right order
  describe("Schema name, description, and frontmatter", () => {
    let schemaFilePath: string;
    let outputFilePath: string;
    let generator: ECJsonMarkdownGenerator;
    let searchDirs: string[];
    let lines: string[];
    let markdownText: string;

    schemaFilePath = "./test/Assets/Basic.ecschema.json";
    outputFilePath = "./test/Assets/Basic.ecschema.md";
    searchDirs = [];

    before(async () => {
      // If the markdown file already exists, delete it
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

      // Generate the markdown
      generator = new ECJsonMarkdownGenerator(searchDirs);
      await generator.generate(schemaFilePath, outputFilePath);

      // Read the markdown file
      markdownText = fs.readFileSync(outputFilePath, "utf8");
    });

    beforeEach(() => {
      lines = [];
    });

    after(() => {
      // Delete the generated markdown file
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
    });

    it("should generate the front matter correctly", async () => {
      lines = markdownText.replace(/\r?\n|\r/g, "").split("---");

      // Assert that the front matter is generated correctly
      assert.equal(lines[1], "Schema: BasicThis file was automatically generated via ecjson2md. Do not edit this file. Any edits made to this file will be overwritten the next time it is generated");
    });

    it("should write the name of the schema properly", async () => {
      lines = markdownText.split("\n");

      // Assert that the name of the schema is correctly written as h1
      assert.isTrue(lines.indexOf("# Basic") > -1, "The name of the schema was not properly written out");
    });

    it("should write the description of the schema properly", async () => {
      lines = markdownText.split("\n");

      // Assert that the name of the schema is correctly written as h1
      assert.isTrue(lines.indexOf("This is a very basic schema.") > -1, "The description was not properly written out");
    });
  });

  // This section tests the markdown generation of the class information. Another section checks that the information is in the correct order.
  describe("Schema class sections", () => {
    let schemaFilePath: string;
    let outputFilePath: string;
    let generator: ECJsonMarkdownGenerator;
    let searchDirs: string[];
    let markdownText: string;
    let lines: string[];

    schemaFilePath = "./test/Assets/BasicClasses.ecschema.json";
    outputFilePath = "./test/Assets/BasicClasses.ecschema.md";
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

    beforeEach(() => {
      lines = [];
    });

    after(() => {
      // Delete the generated markdown file
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
    });

    it("should write the classes header", () => {
      lines = markdownText.split("\n");

      // Assert that the classes header is written as h2
      assert.isTrue(lines.indexOf("## Classes:") > -1, "## Classes: was not written properly");
    });

    it("should write an h3 header for each class", () => {
      lines = markdownText.split("\n");

      // Assert that an h3 is written for each class
      assert.isTrue(lines.indexOf("### ClassOne") > -1, "h3 for ClassOne not written properly");
      assert.isTrue(lines.indexOf("### ClassTwo") > -1, "h3 for ClassTwo not written properly");
      assert.isTrue(lines.indexOf("### ClassThree") > -1, "h3 for ClassThree not written properly");
    });

    it("should write a description for each class that has one", () => {
      lines = markdownText.split("\n");

      // Assert that a description is written for each class
      assert.isTrue(lines.indexOf("This is the description for ClassOne") > -1, "description for class one was not written properly");
      assert.isTrue(lines.indexOf("This is the description for ClassTwo") > -1, "description for class two was not written properly");
    });

    it("should not write a description if a class does not have one", () => {
      lines = markdownText.replace(/\r?\n|\r/g, "").split("### ClassThree");

      // Assert that no description is written for class three
      assert.equal(lines[1].slice(0, 39), "**Class Type:** CustomAttributeClass###");
    });

    it("should write the class type for each class", () => {
      lines = markdownText.split("\n");

      // Assert that each class type is written
      assert.isTrue(lines.indexOf("**Class Type:** EntityClass") > -1, "class type for ClassOne not written properly");
      assert.isTrue(lines.indexOf("**Class Type:** CustomAttributeClass") > -1, "class type for ClassTwo not written properly");
      assert.isTrue(lines.indexOf("**Class Type:** Mixin") > -1, "class type for ClassTwo not written properly");
    });

    it("should correctly add link to the base class", () => {
      lines = markdownText.split("\n");

      // Assert that a link is written for the base class
      assert.isTrue(lines.indexOf("**Base class:** [link_to basicclasses.ecschema/#classone text=\"BasicClasses:ClassOne\"]") > -1, "base class link not written properly");
    });
  });

  // This section tests that the schema information is in the correct order
  describe("Basic schema class markdown structure", () => {
    let schemaFilePath: string;
    let outputFilePath: string;
    let generator: ECJsonMarkdownGenerator;
    let searchDirs: string[];
    let markdownText: string;
    let lines: string[];

    schemaFilePath = "./test/Assets/BasicClasses.ecschema.json";
    outputFilePath = "./test/Assets/BasicClasses.ecschema.md";
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

    beforeEach(() => {
      lines = [];
    });

    after(() => {
      // Delete the generated markdown file
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
    });

    it("the front matter should be written on the first lines", () => {
      lines = markdownText.split("\n");
      
      // Assert that the front matter takes up the first few lines
      assert.equal(lines[0], "---");
      assert.equal(lines[3], "---");
    });

    it("title of the schema should come after the front matter", () => {
      lines = markdownText.split("---");
      
      // Assert that the title of the schema is written following a blank line after the front matter
      lines = lines[2].split("\n\n");
      assert.equal(lines[1], "# BasicClasses", "The title of the schema does not properly follow the front matter");
    });

    it("description of the schema should follow the title of the schema", () => {
      lines = markdownText.split("\n");
      
      // Get the index of the schema title
      const assertIndex = lines.indexOf("# BasicClasses");
      assert.isTrue((assertIndex >= 0), "cannot find schema name");

      // Assert that the description of the schema follows the title after a blank line
      assert.equal(lines[assertIndex + 1], "");
      assert.equal(lines[assertIndex + 2], "This is a very basic schema with classes.");
    });

    it("header for the classes should follow the schema description", () => {
      lines = markdownText.split("\n");
      
      // Get the index of the schema description
      const assertIndex = lines.indexOf("This is a very basic schema with classes.");
      assert.isTrue((assertIndex >= 0), "cannot find schema description");

      // Assert that the header for the classes section follows the schema description after a blank line
      assert.equal(lines[assertIndex + 1], "");
      assert.equal(lines[assertIndex + 2], "## Classes:");
    });

    it("h3 for ClassOne should follow the classes header", () => {
      lines = markdownText.split("\n");
      
      // Get the index of the class header
      const assertIndex = lines.indexOf("## Classes:");
      assert.isTrue((assertIndex >= 0), "cannot find the class header");

      // Assert that ClassOne is written as h3 after the class label
      assert.equal(lines[assertIndex + 1], "");
      assert.equal(lines[assertIndex + 2], "### ClassOne");
    });

    it("class description should follow the h3 class name", () => {
      lines = markdownText.split("\n");
      
      // Get the index of the h3 class name
      const assertIndex = lines.indexOf("### ClassOne");
      assert.isTrue((assertIndex >= 0), "cannot find h3 for Class One");

      // Assert that the description follows the h3 class name after a blank line
      assert.equal(lines[assertIndex + 1], "");
      assert.equal(lines[assertIndex + 2], "This is the description for ClassOne");
    });

    it("class type should follow the class description", () => {
      lines = markdownText.split("\n");
      
      // Get the index of the class description
      const assertIndex = lines.indexOf("This is the description for ClassOne");
      assert.isTrue((assertIndex >= 0), "cannot find the description for Class One");

      // Assert that the class type follows the class description after a blank line
      assert.equal(lines[assertIndex + 1], "");
      assert.equal(lines[assertIndex + 2], "**Class Type:** EntityClass");
    });

    it("base class should follow the class type", () => {
      lines = markdownText.split("\n");
      
      // Get the index of the class type of ClassTwo
      const assertIndex = lines.indexOf("**Class Type:** Mixin");
      assert.isTrue((assertIndex >= 0), "cannot find the class type of class two");

      // Assert that the base class follows the class type after a blank line
      assert.equal(lines[assertIndex + 1], "");
      assert.equal(lines[assertIndex + 2], "**Base class:** [link_to basicclasses.ecschema/#classone text=\"BasicClasses:ClassOne\"]");
    });
  });

  // This section checks that the properties table contains the correct information
  describe("class properties table markdown generation", () => {
    const schemaFilePath = "./test/Assets/ClassProperties.ecschema.json";
    const outputFilePath = "./test/Assets/ClassProperties.ecschema.md";
    let generator: ECJsonMarkdownGenerator;
    const searchDirs = new Array<string>();
    let markdownText: string;
    let lines: string[];

    before(async () => {
      // If the markdown file already exists, delete it
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

      // Generate the markdown
      generator = new ECJsonMarkdownGenerator(searchDirs);
      await generator.generate(schemaFilePath, outputFilePath);

      // Read the markdown
      markdownText = fs.readFileSync(outputFilePath, "utf8");
    });

    beforeEach(() => {
      lines = [];
    });

    after(() => {
      // Delete the generated markdown file
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
    });

    it("should create the header of the property table", () => {
      lines = markdownText.split("\n");
      
      // Assert that the table header is generated correctly
      assert.isTrue(lines.indexOf("|    Name    |    Description    |    Type    |      Extended Type     |") > -1, "class properties header not written properly");
      assert.isTrue(lines.indexOf("|:-----------|:------------------|:-----------|:-----------------------|") > -1, "class properties header not written properly");
    });

    it("should create an empty table row at the end of a table", () => {
      lines = markdownText.split("\n");

      // Assert that an empty table row is generated at the end of the table
      assert.isTrue(lines.indexOf("|            |                   |            |                        |") > -1, "empty row at end of table not written properly");
    });

    it("should create a table row for a property with name and type", () => {
      lines = markdownText.split("\n");

      // Assert that a table row is generated correctly for property with name and type
      assert.isTrue(lines.indexOf("|Name_And_Type||string||") > -1, "property row with name and type not written properly");
    });

    it("should create a table row for a property with name, description, and type", () => {
      lines = markdownText.split("\n");

      // Assert that a table row is generated correctly for a property with name, type, and description
      assert.isTrue(lines.indexOf("|Name_Type_And_Description|This property has a name, type, and description|string||") > -1, "property row with name, description, and type not written properly");
    });

    it("should create a table row for a property with name, description, extended type, and type", () => {
      lines = markdownText.split("\n");
      
      // Assert that a table row is generated correctly for a property with name, type, description, and extended type.
      assert.isTrue(lines.indexOf("|Name_Type_Extended_Type_And_Description|This property has a name, type, extended type, and description|string|Json|") > -1, "property row with name, description, extended type, and type not written properly");
    });
  });

  // This section tests that the correct information is generated for relationship class tables
  describe("class relationship table markdown generation", () => {
    const schemaFilePath = "./test/Assets/ClassRelationship.ecschema.json";
    const outputFilePath = "./test/Assets/ClassRelationship.ecschema.md";
    let generator: ECJsonMarkdownGenerator;
    const searchDirs = ["./test/Assets", "./test/Assets/dir"];
    let markdownText: string;
    let lines: string[];

    before(async () => {
      // If the markdown file already exists, delete it
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

      // Generate the markdown
      generator = new ECJsonMarkdownGenerator(searchDirs);
      await generator.generate(schemaFilePath, outputFilePath);

      // Read the markdown
      markdownText = fs.readFileSync(outputFilePath, "utf8");
    });

    beforeEach(() => {
      lines = [];
    });

    after(() => {
      // Delete the generated markdown file
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
    });

    it("should create the header of the relationship table", () => {
      lines = markdownText.split("\n");
      
      // Asserts that a header is correctly generated for the relationship table
      assert.isTrue(lines.indexOf("|          |    ConstraintClasses    |            Multiplicity            |") > -1, "class relationship table header not written properly");
      assert.isTrue(lines.indexOf("|:---------|:------------------------|:-----------------------------------|") > -1, "class relationship table header not written properly");
    });

    it("should create an empty table row at the end of a table", () => {
      lines = markdownText.split("\n");

      // Asserts that an empty table row is generated at the end of the table.
      assert.isTrue(lines.indexOf("|          |                         |                                    |") > -1, "empty row at end of table not written properly");
    });

    it("should correctly generate the source table row with one constraint class", () => {
      lines = markdownText.split("\n");

      // Asserts that a source row is generated properly with one constraint class
      assert.isTrue(lines.indexOf("|**Source**|ClassOne|(0..*)|") > -1, "source table row not written properly");
    });

    it("should correctly generate the target table row with one constraint class", () => {
      lines = markdownText.split("\n");

      // Asserts that a target row is generated properly with one constraint class
      assert.isTrue(lines.indexOf("|**Target**|ClassTwo|(0..*)|") > -1, "target table row not written properly");
    });

    it("should correctly generate the source table row with multiple constraint classes", () => {
      lines = markdownText.split("\n");

      // Asserts that a source row is generated properly with multiple constraint classes
      assert.isTrue(lines.indexOf("|**Source**|A, B|(0..*)|") > -1, "source table row not written properly");
    });

    it("should correctly generate the target table row with multiple constraint classes", () => {
      lines = markdownText.split("\n");

      // Asserts that a target row is generated properly with multiple constraint classes
      assert.isTrue(lines.indexOf("|**Target**|C, D|(0..*)|") > -1, "target table row not written properly");
    });
  });

  // This section tests that the class tables are generated properly
  describe("class properties and relationship tables structure", () => {
    const schemaFilePath = "./test/Assets/PropertiesRelationship.ecschema.json";
    const outputFilePath = "./test/Assets/PropertiesRelationship.ecschema.md";
    let generator: ECJsonMarkdownGenerator;
    const searchDirs = ["./test/Assets", "./test/Assets/dir"];
    let markdownText: string;
    let lines: string[];

    before(async () => {
      // If the markdown file already exists, delete it
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

      // Generate the markdown
      generator = new ECJsonMarkdownGenerator(searchDirs);
      await generator.generate(schemaFilePath, outputFilePath);

      // Read the markdown
      markdownText = fs.readFileSync(outputFilePath, "utf8");
    });

    beforeEach(() => {
      lines = [];
    });

    after(() => {
      // Delete the generated markdown file
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
    });

    it("Relationship class label should come after the class type", () => {
      lines = markdownText.split("\n");

      // Get the index of the class type
      const assertIndex = lines.indexOf("**Class Type:** RelationshipClass");
      assert.isTrue((assertIndex >= 0), "cannot find the class type");

      // Assert that the label follows the class type after a blank line
      assert.equal(lines[assertIndex + 1], "");
      assert.equal(lines[assertIndex + 2], "**Relationship Class:**");
    });

    it("Relationship table should come after the relationship class label", () => {
      lines = markdownText.split("\n");

      // Get the index of the relationship class label
      const assertIndex = lines.indexOf("**Relationship Class:**");
      assert.isTrue((assertIndex >= 0), "cannot find the relationship class label");

      // Assert that the table header follows the relationship class label after a blank line
      assert.equal(lines[assertIndex + 1], "");
      assert.equal(lines[assertIndex + 2], "|          |    ConstraintClasses    |            Multiplicity            |");
      assert.equal(lines[assertIndex + 3], "|:---------|:------------------------|:-----------------------------------|");
    });

    it("Class properties label should come after the relationship table", () => {
      lines = markdownText.split("\n");

      // Get the index of the last row in the relationship table
      const assertIndex = lines.indexOf("|          |                         |                                    |");
      assert.isTrue((assertIndex >= 0), "cannot find the last row of relationship class table");

      // Assert that class properties label follows the relationship table after a blank line
      assert.equal(lines[assertIndex + 1], "");
      assert.equal(lines[assertIndex + 2], "**Class Properties:**");
    });

    it("Properties table should come after the relationship class label", () => {
      lines = markdownText.split("\n");

      // Get the index of the class properties label
      const assertIndex = lines.indexOf("**Class Properties:**");
      assert.isTrue((assertIndex >= 0), "cannot find the class properties label");

      // Assert that properties table follows the class properties label after a blank line
      assert.equal(lines[assertIndex + 1], "");
      assert.equal(lines[assertIndex + 2], "|    Name    |    Description    |    Type    |      Extended Type     |");
      assert.equal(lines[assertIndex + 3], "|:-----------|:------------------|:-----------|:-----------------------|");
    });
  });
    // TODO: Refactor this test
    /*
    it("should correctly write the type for a referenced property type", () => {
      assert.equal(lines[77 ], "|TestTypes||CustomTestType||");
    });
    */

  describe("Advanced markdown generation tests", () => {
    let testFilePath: string;
    let outputFilePath: string;
    let lines: string[];
    let markdownText: string;

    before(async () => {
      testFilePath = "./test/Assets/Alphabet.ecschema.json";
      outputFilePath = "./test/Assets/Alphabet.ecschema.md";

      // If the file already exists, delete it
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

      testECJsonMD = new ECJsonMarkdownGenerator(["./test/Assets/dir"]);
      await testECJsonMD.generate(testFilePath, outputFilePath);

      markdownText = fs.readFileSync(outputFilePath, "utf8");
    });

    after(() => {
      if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
    });

    it("should alphabetize the classes", () => {
      lines = markdownText.split("\n");

      // Assert that each class header is written in alphabetical order
      assert.equal(lines[11], "### A");
      assert.equal(lines[17], "### B");
      assert.equal(lines[23], "### C");
      assert.equal(lines[29], "### D");
      assert.equal(lines[35], "### E");
      assert.equal(lines[41], "### F");
      assert.equal(lines[47], "### G");
      assert.equal(lines[53], "### H");
      assert.equal(lines[59], "### I");
    });

    it("should list multiple constraint classes", () => {
      assert.equal(lines[69], "|**Source**|A, B, C|(0..*)|");
      assert.equal(lines[70], "|**Target**|D, E, F|(0..*)|");
    });
  });
});

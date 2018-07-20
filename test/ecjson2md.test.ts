import { ECJsonMarkdownGenerator } from "../source/ecjson2md";
import { assert } from "chai";
import { ECJsonBadSearchPath } from "../source/Exception";
import * as fs from "fs";
import * as path from "path";
import * as rimraf from "rimraf";
import { SchemaContext, Schema } from "@bentley/ecjs";

describe("ecjson2md", () => {
  describe("ECJsonMarkdownGenerator", () => {
    describe("Instantiate", () => {
      it("should successfully instantiate with no search dirs", () => {
        const testMDGenerator = new ECJsonMarkdownGenerator([]);
        assert.isDefined(testMDGenerator);
      });

      it("should instantiate with several search dirs", () => {
        const testMDGenerator = new ECJsonMarkdownGenerator([".", "..", "./test/Assets/dir/"]);
        assert.isDefined(testMDGenerator);
      });

      it("should throw an exception for a search dir that doesn't exist", () => {
        let err: Error = new Error();

        try {
          new ECJsonMarkdownGenerator([".", "..", "./badPath"]);
        } catch (exc) {
          err = exc;
        }

        assert.equal(ECJsonBadSearchPath.name, err.name);
      });
    });

    describe("Markdown generation", () => {
      const outputDir = path.join(".", "test", "temp");

      // Make the temp dir to store the ouuput
      before(() => {
        if (!fs.existsSync(outputDir))
          fs.mkdirSync(outputDir);
      });

      // Delete the temp dir
      after(() => {
        rimraf.sync(outputDir);
      });

      describe("writeFrontMatter", () => {
        const outputPath = path.join(outputDir, "titleTest.md");
        let testSchema: Schema;

        before(() => {
          testSchema = new Schema();
          testSchema.fromJsonSync
          (JSON.parse(
            '{\
                "$schema":"https://dev.bentley.com/json_schemas/ec/31/draft-01/ecschema",\
                "alias":"testSchema",\
                "name": "testSchema",\
                "version":"02.00.00"\
              }'));
        });

        afterEach(() => {
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });

        it("should correctly write the front matter without an alert", () => {
          ECJsonMarkdownGenerator.writeFrontMatter(outputPath, testSchema, false);

          const outputLines = fs.readFileSync(outputPath).toString().split("\n");
          outputLines;

          assert.equal(outputLines[0], "---");
          assert.equal(outputLines[1], "Schema: testSchema");
          assert.equal(outputLines[2], "This file was automatically generated via ecjson2md. Do not edit this file. Any edits made to this file will be overwritten the next time it is generated");
          assert.equal(outputLines[3], "---");
          assert.equal(outputLines[4], "");
          assert.equal(outputLines[5], "");
        });

        it("should correctly write the front matter with an alert", () => {
          ECJsonMarkdownGenerator.writeFrontMatter(outputPath, testSchema, true);

          const outputLines = fs.readFileSync(outputPath).toString().split("\n");
          outputLines;

          assert.equal(outputLines[0], "---");
          assert.equal(outputLines[1], "Schema: testSchema");
          assert.equal(outputLines[2], "This file was automatically generated via ecjson2md. Do not edit this file. Any edits made to this file will be overwritten the next time it is generated");
          assert.equal(outputLines[3], "---");
          assert.equal(outputLines[4], "");
          assert.equal(outputLines[5], '[!alert text="This documentation represents a nonreleased version of this schema" kind="warning"]');
          assert.equal(outputLines[6], "");
          assert.equal(outputLines[7], "");
        });
      });

      describe("writeTitle", () => {
        const outputFilePath = path.join(outputDir, "titleTest.md");

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
        });

        it("should write the title properly for a schema with no description", () => {
          const testSchema = new Schema();
          testSchema.fromJsonSync
          (JSON.parse(
            '{\
                "$schema":"https://dev.bentley.com/json_schemas/ec/31/draft-01/ecschema",\
                "alias":"testSchema",\
                "name": "testSchema",\
                "version":"02.00.00"\
              }'));

          ECJsonMarkdownGenerator.writeTitle(outputFilePath, testSchema);

          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");

          assert.equal(outputLines[0], "# testSchema");
          assert.equal(outputLines[1], "");
          assert.equal(outputLines[2], "");
        });

        it("should write the title properly for a schema with a description", () => {
          const testSchema = new Schema();
          testSchema.fromJsonSync(JSON.parse(
            '{\
              "$schema":"https://dev.bentley.com/json_schemas/ec/31/draft-01/ecschema",\
              "description":"This is the description",\
              "alias":"testSchema",\
              "name": "testSchema",\
              "version":"02.00.00"\
            }'));

          ECJsonMarkdownGenerator.writeTitle(outputFilePath, testSchema);

          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");

          assert.equal(outputLines[0], "# testSchema");
          assert.equal(outputLines[1], "");
          assert.equal(outputLines[2], "This is the description");
          assert.equal(outputLines[3], "");
          assert.equal(outputLines[4], "");
        });
      });

      describe("write schema item name", () => {
        const outputFilePath = path.join(outputDir, "nameTest.md");

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
        });

        it("shouldn't write anything for an undefined name", () => {
          // Arrange
          const name = undefined;

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemName(outputFilePath, name);

          // Assert
          assert.isFalse(fs.existsSync(outputFilePath));
        });

        it("should properly write the name of a schema item", () => {
          // Arrange
          const name = "NameOfTheSchemaItem";

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemName(outputFilePath, name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines[0], "### " + name);
          assert.equal(outputLines[1], "");
          assert.equal(outputLines[2], "");
        });
      });

      describe("write schema item description", () => {
        const outputFilePath = path.join(outputDir, "descriptionTest.md");

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
        });

        it("shouldn't write anything for an undefined description", () => {
          // Arrange
          const description = undefined;

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemDescription(outputFilePath, description);

          // Assert
          assert.isFalse(fs.existsSync(outputFilePath));
        });

        it("should properly write the description of a schema item", () => {
          // Arrange
          const description = "This is the description";

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemDescription(outputFilePath, description);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines[0], description);
          assert.equal(outputLines[1], "");
          assert.equal(outputLines[2], "");
        });
      });

      describe("write schema item label", () => {
        const outputFilePath = path.join(outputDir, "labelTest.md");

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);
        });

        it("shouldn't write anything for an undefined label", () => {
          // Arrange
          const label = undefined;

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemLabel(outputFilePath, label);

          // Assert
          assert.isFalse(fs.existsSync(outputFilePath));
        });

        it("should properly write the label of a schema item", () => {
          // Arrange
          const label = "TestLabel";

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemLabel(outputFilePath, label);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines[0], "**Label:** " + label);
          assert.equal(outputLines[1], "");
          assert.equal(outputLines[2], "");
        });
      });
    });

    describe("Misc", () => {
      describe("getSortedSchemaItems", () => {
        const schemaJson = JSON.parse(
        '{\
          "$schema":"https://dev.bentley.com/json_schemas/ec/31/draft-01/ecschema",\
          "description":"This is the description",\
          "alias":"testSchema",\
          "name": "testSchema",\
          "version":"02.00.00",\
          "items": { \
            "EntityClassB": {\
              "description": "this is a description", \
              "schemaItemType":"EntityClass"\
            },\
            "EntityClassC":{\
              "schemaItemType":"EntityClass"\
            },\
            "EntityClassA":{\
              "schemaItemType":"EntityClass"\
            },\
            "CustomAttributeClassB":{\
              "schemaItemType":"CustomAttributeClass"\
            },\
            "CustomAttributeClassC":{\
              "schemaItemType":"CustomAttributeClass"\
            },\
            "CustomAttributeClassA":{\
              "schemaItemType":"CustomAttributeClass"\
            },\
            "EnumerationB":{\
              "backingTypeName" : "int", \
              "schemaItemType":"Enumeration"\
            },\
            "EnumerationC":{\
              "backingTypeName" : "int", \
              "schemaItemType":"Enumeration"\
            },\
            "EnumerationA":{\
              "backingTypeName" : "int",  \
              "schemaItemType":"Enumeration"\
            },\
            "KindOfQuantityB":{\
              "schemaItemType":"KindOfQuantity"\
            },\
            "KindOfQuantityC":{\
              "schemaItemType":"KindOfQuantity"\
            },\
            "KindOfQuantityA":{\
              "schemaItemType":"KindOfQuantity"\
            },\
            "RelationshipClassB":{\
              "source" :{\
                "constraintClasses" : [ "testSchema.KindOfQuantityA" ],\
                "multiplicity" : "(0..1)",\
                "polymorphic" : true,\
                "roleLabel" : "owns"\
              },\
              "target" :{\
                "constraintClasses" : [ "testSchema.KindOfQuantityB" ],\
                "multiplicity" : "(0..*)",\
                "polymorphic" : false,\
                "roleLabel" : "is owned by"\
              },\
              "schemaItemType":"RelationshipClass"\
            },\
            "RelationshipClassC":{\
              "source" :{\
                "constraintClasses" : [ "testSchema.KindOfQuantityA" ],\
                "multiplicity" : "(0..1)",\
                "polymorphic" : true,\
                "roleLabel" : "owns"\
              },\
              "target" :{\
                "constraintClasses" : [ "testSchema.KindOfQuantityB" ],\
                "multiplicity" : "(0..*)",\
                "polymorphic" : false,\
                "roleLabel" : "is owned by"\
              },\
              "schemaItemType":"RelationshipClass"\
            },\
            "RelationshipClassA":{\
              "source" :{\
                "constraintClasses" : [ "testSchema.KindOfQuantityA" ],\
                "multiplicity" : "(0..1)",\
                "polymorphic" : true,\
                "roleLabel" : "owns"\
              },\
              "target" :{\
                "constraintClasses" : [ "testSchema.KindOfQuantityB" ],\
                "multiplicity" : "(0..*)",\
                "polymorphic" : false,\
                "roleLabel" : "is owned by"\
              },\
              "schemaItemType":"RelationshipClass"\
            },\
            "MixinB":{\
              "schemaItemType":"Mixin"\
            },\
            "MixinC":{\
              "schemaItemType":"Mixin"\
            },\
            "MixinA":{\
              "schemaItemType":"Mixin"\
            }\
          }\
        }');

        let testSchema: Schema;

        before(() => {
          // Load up the schema
          const context = new SchemaContext();
          testSchema = Schema.fromJsonSync(schemaJson, context);
        });

        it("should return the sorted EntityClasses", () => {
          const sortedEntityClasses = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, "EntityClass");

          assert.equal(sortedEntityClasses[0].name, "EntityClassA");
          assert.equal(sortedEntityClasses[1].name, "EntityClassB");
          assert.equal(sortedEntityClasses[2].name, "EntityClassC");
        });

        it("should return the sorted CustomAttributeClasses", () => {
          const sortedEntityClasses = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, "CustomAttributeClass");

          assert.equal(sortedEntityClasses[0].name, "CustomAttributeClassA");
          assert.equal(sortedEntityClasses[1].name, "CustomAttributeClassB");
          assert.equal(sortedEntityClasses[2].name, "CustomAttributeClassC");
        });

        it("should return the sorted Enumerations", () => {
          const sortedEntityClasses = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, "Enumeration");

          assert.equal(sortedEntityClasses[0].name, "EnumerationA");
          assert.equal(sortedEntityClasses[1].name, "EnumerationB");
          assert.equal(sortedEntityClasses[2].name, "EnumerationC");
        });

        it("should return the sorted KindOfQuantities", () => {
          const sortedEntityClasses = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, "KindOfQuantity");

          assert.equal(sortedEntityClasses[0].name, "KindOfQuantityA");
          assert.equal(sortedEntityClasses[1].name, "KindOfQuantityB");
          assert.equal(sortedEntityClasses[2].name, "KindOfQuantityC");
        });

        it("should return the sorted RelationshipClasses", () => {
          const sortedEntityClasses = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, "RelationshipClass");

          assert.equal(sortedEntityClasses[0].name, "RelationshipClassA");
          assert.equal(sortedEntityClasses[1].name, "RelationshipClassB");
          assert.equal(sortedEntityClasses[2].name, "RelationshipClassC");
        });

        it("should return the sorted Mixins", () => {
          const sortedEntityClasses = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, "Mixin");

          assert.equal(sortedEntityClasses[0].name, "MixinA");
          assert.equal(sortedEntityClasses[1].name, "MixinB");
          assert.equal(sortedEntityClasses[2].name, "MixinC");
        });
      });
    });
  });
});

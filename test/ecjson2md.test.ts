/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/

import { ECJsonMarkdownGenerator, formatLink, formatWarningAlert, prepSearchDirs, propertyTypeNumberToString, removeExtraBlankLines, schemaItemToGroupName } from "../source/ecjson2md";
import { assert, expect } from "chai";
import { ECJsonBadSearchPath } from "../source/Exception";
import * as fs from "fs";
import * as path from "path";
import * as rimraf from "rimraf";
import { classModifierToString, CustomAttributeClass, Enumeration, EntityClass, Format, InvertedUnit, KindOfQuantity, Mixin, Phenomenon, PropertyCategory, PropertyType, RelationshipClass, Schema, SchemaContext, SchemaItemType, StructClass, Unit } from "@itwin/ecschema-metadata";
import { SchemaJsonFileLocater } from "@itwin/ecschema-locaters";

describe("ecjson2md", () => {
  describe("ECJsonMarkdownGenerator", () => {

    const baseUrl = "https://imodelschemaeditor.bentley.com/?stage=browse&";
    const iconPath = ".././media/imodel-schema-editor-icon.png";

    // Helper function to convert template literals to string array
    function outputLiteralToArray(text: string): string[] {
      const output = text.split(/\n/);
      output.shift();
      output.map((line, i) => {
        output[i] = line.trim();
      });

      return output;
    }

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
        } catch (exc: any) {
          err = exc;
        }

        assert.equal(ECJsonBadSearchPath.name, err.name);
      });
    });

    describe("Schema table of contents generation", () => {
      const outputDir = path.join(".", "test", "temp");

      // Make the temp dir to store the output
      before(() => {
        if (!fs.existsSync(outputDir))
          fs.mkdirSync(outputDir);
      });

      // Delete the temp dir
      after(() => {
        rimraf.sync(outputDir);
      });

      it("should successfully generate table of contents for provided schema", () => {
        const outputPath = path.join(outputDir, "contentTest.md");
        // Arrange
        const schemaJson = {
          $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
          alias: "testSchema",
          name: "testSchema",
          version: "02.00.00",
          items: {
            UnitA : {
              definition : "UnitA",
              phenomenon : "testSchema.CURRENT",
              schemaItemType : "Unit",
              unitSystem : "testSchema.SI",
            },
            CURRENT : {
              definition : "CURRENT",
              label : "Current",
              schemaItemType : "Phenomenon",
            },
            SI : {
              schemaItemType : "UnitSystem",
            },
            DefaultReal : {
              formatTraits : [ "keepSingleZero", "keepDecimalPoint" ],
              label : "real",
              precision : 6,
              schemaItemType : "Format",
              type : "Decimal",
            },
            KindOfQuantityA: {
              schemaItemType: "KindOfQuantity",
              label: "KindOfQuantityA",
              relativeError: 0.0,
              persistenceUnit : "testSchema.UnitA",
              presentationUnits : [ "testSchema.DefaultReal[testSchema.UnitA]" ],
            },
          },
        };

        const context = new SchemaContext();
        const testSchema = Schema.fromJsonSync(schemaJson, context);

        ECJsonMarkdownGenerator.generateTableOfContents(outputPath, testSchema);
        const generatedTable = fs.readFileSync(outputPath).toString().split("\n");
        const expectedTable = outputLiteralToArray(`
        ## Table of contents
        - [Kind Of Quantity Items](#kind-of-quantity-items)
        \t- [KindOfQuantityA](#kindofquantitya)
        - [Units](#units)
        \t- [UnitA](#unita)
        - [Phenomenon Classes](#phenomenon-classes)
        \t- [CURRENT](#current)
        - [Unit Systems](#unit-systems)
        \t- [SI](#si)
        - [Formats](#formats)
        \t- [DefaultReal](#defaultreal)

        `);
        assert.equal(generatedTable.length, expectedTable.length);
      });
    });

    describe("Schema markdown generation", () => {
      const outputDir = path.join(".", "test", "temp");

      // Make the temp dir to store the output
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
          testSchema = Schema.fromJsonSync({
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
          }, new SchemaContext());
        });

        beforeEach(() => {
          if (fs.existsSync(outputPath))
            fs.unlinkSync(outputPath);
        });

        afterEach(() => {
          if (fs.existsSync(outputPath))
            fs.unlinkSync(outputPath);
        });

        it("should correctly write the front matter without an alert", () => {
          // Act
          ECJsonMarkdownGenerator.writeFrontMatter(outputPath, testSchema, false);

          // Assert
          const outputLines = fs.readFileSync(outputPath).toString().split("\n");
          // replace recurring things with ${variables}
          const correctLines = outputLiteralToArray(`
          ---
          noEditThisPage: true
          Schema: testSchema
          Warning: This file was automatically generated via ecjson2md. Do not edit this file. Any edits made to this file will be overwritten the next time it is generated.
          ---

          `);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should correctly write the front matter with an alert", () => {
          // Act
          ECJsonMarkdownGenerator.writeFrontMatter(outputPath, testSchema, true);

          // Assert
          const outputLines = fs.readFileSync(outputPath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ---
          noEditThisPage: true
          Schema: testSchema
          Warning: This file was automatically generated via ecjson2md. Do not edit this file. Any edits made to this file will be overwritten the next time it is generated.
          ---

          [!alert text="This documentation represents a nonreleased version of this schema" kind="warning"]

          `);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeSchema", () => {
        const outputFilePath = path.join(outputDir, "titleTest.md");

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should write the markdown properly for a schema with no description or label", () => {
          // Arrange
          const testSchema = Schema.fromJsonSync({
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
          }, new SchemaContext());

          // Act
          ECJsonMarkdownGenerator.writeSchema(outputFilePath, testSchema);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          # testSchema [!badge text="Schema" kind="Info"]

          **Alias:** testSchema

          **Version:** 2.0.0

          `);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should write the markdown properly for a schema with a description", () => {
          // Arrange
          const testSchema = Schema.fromJsonSync({
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            description: "This is the description",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
          }, new SchemaContext());

          // Act
          ECJsonMarkdownGenerator.writeSchema(outputFilePath, testSchema);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          # testSchema [!badge text="Schema" kind="Info"]

          **Alias:** testSchema

          **Version:** 2.0.0

          This is the description

          `);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should write the markdown properly for a schema with a description and label", () => {
          // Arrange
          const testSchema = Schema.fromJsonSync({
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            description: "This is the description",
            alias: "testSchema",
            name: "testSchema",
            label: "testSchemaLabel",
            version: "02.00.00",
          }, new SchemaContext());

          // Act
          ECJsonMarkdownGenerator.writeSchema(outputFilePath, testSchema);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          # testSchema (testSchemaLabel) [!badge text="Schema" kind="Info"]

          **Alias:** testSchema

          **Version:** 2.0.0

          This is the description

          `);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeSchemaItemHeader", () => {
        const outputFilePath = path.join(outputDir, "nameTest.md");

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("shouldn't write anything for an undefined name", () => {
          // Arrange
          const name = undefined;
          const type = SchemaItemType.EntityClass;

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemHeader(outputFilePath, name, type, "");

          // Assert
          assert.isFalse(fs.existsSync(outputFilePath));
        });

        it("should properly write the name of a schema item", () => {
          // Arrange
          const name = "NameOfTheSchemaItem";
          const type = SchemaItemType.EntityClass;

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemHeader(outputFilePath, name, type, "schemaName");

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
            ### **${name}** [!badge text="EntityClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=${type}&id=schemaName.${name})

            `);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeSchemaItemDescription", () => {
        const outputFilePath = path.join(outputDir, "descriptionTest.md");

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should properly write an empty description for a schema item", () => {
          // Arrange
          const description = "";

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemDescription(outputFilePath, description);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
             ${description}

            `);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write the description of a schema item", () => {
          // Arrange
          const description = "This is the description";

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemDescription(outputFilePath, description);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
           ${description}

          `);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeSchemaItemLabel", () => {
        const outputFilePath = path.join(outputDir, "labelTest.md");

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
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
          const correctLines = outputLiteralToArray(`
          **Display Label:** ${label}

          `);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeSchemaItemPriority", () => {
        const outputFilePath = path.join(outputDir, "priorityTest.md");

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should properly write the priority of a schema item", () => {
          // Arrange
          const priority = 0;

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemPriority(outputFilePath, priority);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          **Priority:** ${priority}

          `);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeSchemaItemModifier", () => {
        const outputFilePath = path.join(outputDir, "modifierTest.md");

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("shouldn't write anything for an undefined modifier", () => {
          // Arrange
          const modifier = undefined;

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemModifier(outputFilePath, modifier);

          // Assert
          assert.isFalse(fs.existsSync(outputFilePath));
        });

        it("should properly write the modifier of a schema item", () => {
          // Arrange
          const modifier = 1;

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemModifier(outputFilePath, modifier);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          **Modifier:** ${classModifierToString(modifier)}

          `);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeSchemaItemBaseClass", () => {
        const outputFilePath = path.join(outputDir, "baseClassTest.md");

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("shouldn't write anything an undefined base class", () => {
          // Arrange
          const baseClass = undefined;

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemBaseClass(outputFilePath, baseClass);

          // Assert
          assert.isFalse(fs.existsSync(outputFilePath));
        });

        it("should write the base class properly", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            description: "This is the description",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                description: "this is a description",
                schemaItemType: "EntityClass",
                baseClass : "testSchema.EntityClassB",
              },
              EntityClassB: {
                description: "this is a description",
                schemaItemType: "EntityClass",
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const testBaseClass = ECJsonMarkdownGenerator.getSortedSchemaItems<EntityClass>(testSchema, SchemaItemType.EntityClass)[0].baseClass;

          // Act
          ECJsonMarkdownGenerator.writeSchemaItemBaseClass(outputFilePath, testBaseClass);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          **Base Class:** [testSchema:EntityClassB](./testschema.ecschema.md#entityclassb)

          `);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeEntityClass", () => {
        const outputFilePath = path.join(outputDir, "entityClassTest.md");

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should properly write an entity class that has just a name and type", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                schemaItemType: "EntityClass",
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "EntityClassA";

          // Act
          const entity = testSchema.getItemSync(schemaItem) as EntityClass
          ECJsonMarkdownGenerator.writeEntityClass(outputFilePath, entity, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **EntityClassA** [!badge text="EntityClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=EntityClass&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write an entity class that has just a name, type, and description", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            description: "This is the description",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                description: "this is a description",
                schemaItemType: "EntityClass",
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "EntityClassA";

          // Act
          const entity = testSchema.getItemSync(schemaItem) as EntityClass;
          ECJsonMarkdownGenerator.writeEntityClass(outputFilePath, entity, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **EntityClassA** [!badge text="EntityClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=EntityClass&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

           this is a description
          
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write an entity class that has just a name, type, and base class", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            description: "This is the description",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                schemaItemType: "EntityClass",
                baseClass : "testSchema.EntityClassB",
              },
              EntityClassB: {
                description: "this is a description",
                schemaItemType: "EntityClass",
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "EntityClassA";

          // Act
          const entity = testSchema.getItemSync(schemaItem) as EntityClass;
          ECJsonMarkdownGenerator.writeEntityClass(outputFilePath, entity, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **EntityClassA** [!badge text="EntityClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=EntityClass&id=${testSchema.name}.${schemaItem})
          
          [!IndentStart]

          **Base Class:** [testSchema:EntityClassB](./testschema.ecschema.md#entityclassb)
          
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write an entity class that has just a name, type, and label", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            description: "This is the description",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                schemaItemType: "EntityClass",
                label : "entityLabel",
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "EntityClassA";

          // Act
          const entity = testSchema.getItemSync(schemaItem) as EntityClass;
          ECJsonMarkdownGenerator.writeEntityClass(outputFilePath, entity, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **EntityClassA** (entityLabel) [!badge text="EntityClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=EntityClass&id=${testSchema.name}.${schemaItem})

          [!IndentStart]
          
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write an entity class that has a name, type, description, base class, and label", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            description: "This is the description",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                schemaItemType: "EntityClass",
                description: "this is a description",
                label: "entityLabel",
                baseClass : "testSchema.EntityClassB",
              },
              EntityClassB: {
                description: "this is a description",
                schemaItemType: "EntityClass",
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "EntityClassA";

          // Act
          const entity = testSchema.getItemSync(schemaItem) as EntityClass;
          ECJsonMarkdownGenerator.writeEntityClass(outputFilePath, entity, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **EntityClassA** (entityLabel) [!badge text="EntityClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=EntityClass&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

           this is a description

          **Base Class:** [testSchema:EntityClassB](./testschema.ecschema.md#entityclassb)
          
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write an entity class that has properties", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            description: "This is the description",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                schemaItemType: "EntityClass",
                properties :
                [
                  {
                    description: "description one",
                    name: "NameOne",
                    type: "PrimitiveProperty",
                    typeName: "string",
                  },
                  {
                    extendedTypeName: "Json",
                    name: "NameTwo",
                    type: "PrimitiveProperty",
                    typeName: "string",
                  },
                  {
                    description: "description three",
                    extendedTypeName: "Json",
                    name: "NameThree",
                    type: "PrimitiveProperty",
                    typeName: "string",
                  },
                  {
                    name: "NameFour",
                    type: "PrimitiveProperty",
                    typeName: "string",
                  },
                ],
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "EntityClassA";

          // Act
          const entity = testSchema.getItemSync(schemaItem) as EntityClass;
          ECJsonMarkdownGenerator.writeEntityClass(outputFilePath, entity, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **EntityClassA** [!badge text="EntityClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=EntityClass&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

          #### Properties

          |    Name    |    Description    |    Type    |      Extended Type     |
          |:-----------|:------------------|:-----------|:-----------------------|
          |NameOne|description one|string||
          |NameTwo||string|Json|
          |NameThree|description three|string|Json|
          |NameFour||string||
          
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a deprecated entity class", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            description: "This is the description",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                schemaItemType: "EntityClass",
                customAttributes: [
                  {
                    Description: "EntityClassA has been deprecated in favor of EntityClassB.",
                    className: "CoreCustomAttributes.Deprecated",
                  },
                ],
              },
            },
          };

          // To locate the 'Deprecated' CustomAttribute
          const searchDirs = prepSearchDirs("./test/Assets/dir/");
          const locator = new SchemaJsonFileLocater();
          locator.addSchemaSearchPaths(searchDirs);
          const context = new SchemaContext();
          context.addLocater(locator);
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "EntityClassA";

          // Act
          const entity = testSchema.getItemSync(schemaItem) as EntityClass;
          ECJsonMarkdownGenerator.writeEntityClass(outputFilePath, entity, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **EntityClassA** [!badge text="EntityClass" kind="info"] [!badge text="Deprecated" kind="warning"] [<img src="${iconPath}">](${baseUrl}elementtype=EntityClass&id=${testSchema.name}.${schemaItem})

          [!alert text="EntityClassA has been deprecated in favor of EntityClassB." kind="warning"]

          [!IndentStart]
          
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeKindfOfQuantityClass", () => {
        const outputFilePath = path.join(outputDir, "entityClassTest.md");

        // Delete the output file before each test
        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should properly write a kind of quantity without a description", async () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              A : {
                definition : "A",
                phenomenon : "testSchema.CURRENT",
                schemaItemType : "Unit",
                unitSystem : "testSchema.SI",
              },
              CURRENT : {
                definition : "CURRENT",
                label : "Current",
                schemaItemType : "Phenomenon",
              },
              SI : {
                schemaItemType : "UnitSystem",
              },
              DefaultReal : {
                formatTraits : [ "keepSingleZero", "keepDecimalPoint" ],
                label : "real",
                precision : 6,
                schemaItemType : "Format",
                type : "Decimal",
              },
              KindOfQuantityA: {
                schemaItemType: "KindOfQuantity",
                label: "KindOfQuantityA",
                relativeError: 0.0,
                persistenceUnit : "testSchema.A",
                presentationUnits : [ "testSchema.DefaultReal[testSchema.A]" ],
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "KindOfQuantityA";

          // Act
          const kindOfQuantity = testSchema.getItemSync(schemaItem) as KindOfQuantity;
          await ECJsonMarkdownGenerator.writeKindOfQuantityClass(outputFilePath, kindOfQuantity, testSchema);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **KindOfQuantityA** (KindOfQuantityA) [!badge text="KindOfQuantity" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=KindOfQuantity&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

          **Relative Error:** 0

          **Persistence Unit:** A
          
          **Presentation Formats**

          - [DefaultReal](#defaultreal) [ [A](#a) ]
          
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a kind of quantity without presentation formats", async () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              A : {
                definition : "A",
                phenomenon : "testSchema.CURRENT",
                schemaItemType : "Unit",
                unitSystem : "testSchema.SI",
              },
              CURRENT : {
                definition : "CURRENT",
                label : "Current",
                schemaItemType : "Phenomenon",
              },
              SI : {
                schemaItemType : "UnitSystem",
              },
              DefaultReal : {
                formatTraits : [ "keepSingleZero", "keepDecimalPoint" ],
                label : "real",
                precision : 6,
                schemaItemType : "Format",
                type : "Decimal",
              },
              KindOfQuantityA: {
                schemaItemType: "KindOfQuantity",
                description: "A Kind of Quantity",
                label: "KindOfQuantityA",
                relativeError: 0.0,
                persistenceUnit : "testSchema.A",
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "KindOfQuantityA";

          // Act
          const kindOfQuantity = testSchema.getItemSync(schemaItem) as KindOfQuantity;
          await ECJsonMarkdownGenerator.writeKindOfQuantityClass(outputFilePath, kindOfQuantity, testSchema);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **KindOfQuantityA** (KindOfQuantityA) [!badge text="KindOfQuantity" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=KindOfQuantity&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

           A Kind of Quantity

          **Relative Error:** 0

          **Persistence Unit:** A
          
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a kind of quantity without a description or presentation formats", async() => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              A : {
                definition : "A",
                phenomenon : "testSchema.CURRENT",
                schemaItemType : "Unit",
                unitSystem : "testSchema.SI",
              },
              CURRENT : {
                definition : "CURRENT",
                label : "Current",
                schemaItemType : "Phenomenon",
              },
              SI : {
                schemaItemType : "UnitSystem",
              },
              DefaultReal : {
                formatTraits : [ "keepSingleZero", "keepDecimalPoint" ],
                label : "real",
                precision : 6,
                schemaItemType : "Format",
                type : "Decimal",
              },
              KindOfQuantityA: {
                schemaItemType: "KindOfQuantity",
                label: "KindOfQuantityA",
                relativeError: 0.0,
                persistenceUnit : "testSchema.A",
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "KindOfQuantityA";

          // Act
          const kindOfQuantity = testSchema.getItemSync(schemaItem) as KindOfQuantity;
          await ECJsonMarkdownGenerator.writeKindOfQuantityClass(outputFilePath, kindOfQuantity, testSchema);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **KindOfQuantityA** (KindOfQuantityA) [!badge text="KindOfQuantity" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=KindOfQuantity&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

          **Relative Error:** 0

          **Persistence Unit:** A
          
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a kind of quantity with multiple presentation formats", async () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              A : {
                definition : "A",
                phenomenon : "testSchema.CURRENT",
                schemaItemType : "Unit",
                unitSystem : "testSchema.SI",
              },
              CURRENT : {
                definition : "CURRENT",
                label : "Current",
                schemaItemType : "Phenomenon",
              },
              SI : {
                schemaItemType : "UnitSystem",
              },
              KILOAMPERE : {
                definition : "[KILO]*A",
                label : "KA",
                phenomenon : "testSchema.CURRENT",
                schemaItemType : "Unit",
                unitSystem : "testSchema.METRIC",
              },
              ACCELERATION : {
                definition : "LENGTH*TIME(-2)",
                label : "Acceleration",
                schemaItemType : "Phenomenon",
              },
              CM_PER_SEC_SQ : {
                definition : "CM*S(-2)",
                label : "cm/sec�",
                phenomenon : "testSchema.ACCELERATION",
                schemaItemType : "Unit",
                unitSystem : "testSchema.METRIC",
              },
              METRIC : {
                schemaItemType : "UnitSystem",
              },
              FT_PER_SEC_SQ : {
                definition : "FT*S(-2)",
                label : "ft/sec�",
                phenomenon : "testSchema.ACCELERATION",
                schemaItemType : "Unit",
                unitSystem : "testSchema.USCUSTOM",
              },
              USCUSTOM : {
                schemaItemType : "UnitSystem",
              },
              M_PER_SEC_SQ : {
                definition : "M*S(-2)",
                label : "m/sec�",
                phenomenon : "testSchema.ACCELERATION",
                schemaItemType : "Unit",
                unitSystem : "testSchema.SI",
              },
              DefaultReal : {
                formatTraits : [ "keepSingleZero", "keepDecimalPoint" ],
                label : "real",
                precision : 6,
                schemaItemType : "Format",
                type : "Decimal",
              },
              KindOfQuantityA: {
                schemaItemType: "KindOfQuantity",
                description: "A Kind of Quantity",
                label: "KindOfQuantityA",
                relativeError: 0.0,
                persistenceUnit : "testSchema.A",
                presentationUnits : [
                  "testSchema.DefaultReal[testSchema.A|amp]",
                  "testSchema.DefaultReal[testSchema.KILOAMPERE]",
                  "testSchema.DefaultReal[testSchema.M_PER_SEC_SQ]",
                  "testSchema.DefaultReal[testSchema.CM_PER_SEC_SQ]",
                  "testSchema.DefaultReal[testSchema.FT_PER_SEC_SQ]",
                ],
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "KindOfQuantityA";

          // Act
          const kindOfQuantity = testSchema.getItemSync(schemaItem) as KindOfQuantity;
          await ECJsonMarkdownGenerator.writeKindOfQuantityClass(outputFilePath, kindOfQuantity, testSchema);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **KindOfQuantityA** (KindOfQuantityA) [!badge text="KindOfQuantity" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=KindOfQuantity&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

           A Kind of Quantity

          **Relative Error:** 0

          **Persistence Unit:** A
          
          **Presentation Formats**

          - [DefaultReal](#defaultreal) [ [A](#a)|amp ]
          - [DefaultReal](#defaultreal) [ [KILOAMPERE](#kiloampere) ]
          - [DefaultReal](#defaultreal) [ [M_PER_SEC_SQ](#m_per_sec_sq) ]
          - [DefaultReal](#defaultreal) [ [CM_PER_SEC_SQ](#cm_per_sec_sq) ]
          - [DefaultReal](#defaultreal) [ [FT_PER_SEC_SQ](#ft_per_sec_sq) ]
          
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeRelationshipClass", () => {
        const outputFilePath = path.join(outputDir, "relationshipClassTest.md");

        // Delete the output file before each test
        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should properly write a class without a description, base class, or label", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                schemaItemType: "EntityClass",
              },
              EntityClassB: {
                schemaItemType: "EntityClass",
              },
              EntityClassC: {
                schemaItemType: "EntityClass",
              },
              EntityClassD: {
                schemaItemType: "EntityClass",
              },
              RelationshipClassA: {
                modifier: "none",
                schemaItemType: "RelationshipClass",
                strength : "referencing",
                strengthDirection : "forward",
                source : {
                  constraintClasses: [ "testSchema.EntityClassA" ],
                  multiplicity : "(0..*)",
                  polymorphic : false,
                  roleLabel: "relates to",
                },
                target : {
                  constraintClasses : [ "testSchema.EntityClassB" ],
                  multiplicity : "(1..1)",
                  polymorphic: true,
                  roleLabel: "is related by",
                },
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "RelationshipClassA";

          // Act
          const relationshipClass = testSchema.getItemSync(schemaItem) as RelationshipClass;
          ECJsonMarkdownGenerator.writeRelationshipClass(outputFilePath, relationshipClass, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **RelationshipClassA** [!badge text="RelationshipClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=RelationshipClass&id=${testSchema.name}.${schemaItem})

          [!IndentStart]   

          **Strength:** Referencing

          **Strength Direction:** Forward

          #### Source
          [!IndentStart]

          **Is Polymorphic:** false

          **Role Label:** relates to

          **Multiplicity:** (0..*)

          #### Constraint Classes:
          - [EntityClassA](./testschema.ecschema.md#entityclassa)
          [!IndentEnd]
          #### Target
          [!IndentStart]

          **Is Polymorphic:** true

          **Role Label:** is related by

          **Multiplicity:** (1..1)

          #### Constraint Classes:
          - [EntityClassB](./testschema.ecschema.md#entityclassb)
          [!IndentEnd]
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class with a description", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                schemaItemType: "EntityClass",
              },
              EntityClassB: {
                schemaItemType: "EntityClass",
              },
              EntityClassC: {
                schemaItemType: "EntityClass",
              },
              EntityClassD: {
                schemaItemType: "EntityClass",
              },
              RelationshipClassA: {
                description : "this is a description",
                modifier: "none",
                schemaItemType: "RelationshipClass",
                strength : "referencing",
                strengthDirection : "forward",
                source : {
                  constraintClasses: [ "testSchema.EntityClassA" ],
                  multiplicity : "(0..*)",
                  polymorphic : false,
                  roleLabel: "relates to",
                },
                target : {
                  constraintClasses : [ "testSchema.EntityClassB" ],
                  multiplicity : "(1..1)",
                  polymorphic: true,
                  roleLabel: "is related by",
                },
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "RelationshipClassA";

          // Act
          const relationshipClass = testSchema.getItemSync(schemaItem) as RelationshipClass;
          ECJsonMarkdownGenerator.writeRelationshipClass(outputFilePath, relationshipClass, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **RelationshipClassA** [!badge text="RelationshipClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=RelationshipClass&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

           this is a description

          **Strength:** Referencing

          **Strength Direction:** Forward

          #### Source
          [!IndentStart]

          **Is Polymorphic:** false

          **Role Label:** relates to

          **Multiplicity:** (0..*)

          #### Constraint Classes:
          - [EntityClassA](./testschema.ecschema.md#entityclassa)
          [!IndentEnd]
          #### Target
          [!IndentStart]

          **Is Polymorphic:** true

          **Role Label:** is related by

          **Multiplicity:** (1..1)

          #### Constraint Classes:
          - [EntityClassB](./testschema.ecschema.md#entityclassb)
          [!IndentEnd]
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class with a base class", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                schemaItemType: "EntityClass",
              },
              EntityClassB: {
                schemaItemType: "EntityClass",
              },
              EntityClassC: {
                schemaItemType: "EntityClass",
              },
              EntityClassD: {
                schemaItemType: "EntityClass",
              },
              RelationshipClassA: {
                baseClass : "testSchema.EntityClassD",
                modifier: "none",
                schemaItemType: "RelationshipClass",
                strength : "referencing",
                strengthDirection : "forward",
                source : {
                  constraintClasses: [ "testSchema.EntityClassA" ],
                  multiplicity : "(0..*)",
                  polymorphic : false,
                  roleLabel: "relates to",
                },
                target : {
                  constraintClasses : [ "testSchema.EntityClassB" ],
                  multiplicity : "(1..1)",
                  polymorphic: true,
                  roleLabel: "is related by",
                },
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "RelationshipClassA";

          // Act
          const relationshipClass = testSchema.getItemSync(schemaItem) as RelationshipClass;
          ECJsonMarkdownGenerator.writeRelationshipClass(outputFilePath, relationshipClass, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **RelationshipClassA** [!badge text="RelationshipClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=RelationshipClass&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

          **Base Class:** [testSchema:EntityClassD](./testschema.ecschema.md#entityclassd)

          **Strength:** Referencing

          **Strength Direction:** Forward

          #### Source
          [!IndentStart]

          **Is Polymorphic:** false

          **Role Label:** relates to

          **Multiplicity:** (0..*)

          #### Constraint Classes:
          - [EntityClassA](./testschema.ecschema.md#entityclassa)
          [!IndentEnd]
          #### Target
          [!IndentStart]

          **Is Polymorphic:** true

          **Role Label:** is related by

          **Multiplicity:** (1..1)

          #### Constraint Classes:
          - [EntityClassB](./testschema.ecschema.md#entityclassb)
          [!IndentEnd]
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class with a label", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                schemaItemType: "EntityClass",
              },
              EntityClassB: {
                schemaItemType: "EntityClass",
              },
              EntityClassC: {
                schemaItemType: "EntityClass",
              },
              EntityClassD: {
                schemaItemType: "EntityClass",
              },
              RelationshipClassA: {
                baseClass : "testSchema.EntityClassD",
                modifier: "none",
                schemaItemType: "RelationshipClass",
                strength : "referencing",
                strengthDirection : "forward",
                source : {
                  constraintClasses: [ "testSchema.EntityClassA" ],
                  multiplicity : "(0..*)",
                  polymorphic : false,
                  roleLabel: "relates to",
                },
                target : {
                  constraintClasses : [ "testSchema.EntityClassB" ],
                  multiplicity : "(1..1)",
                  polymorphic: true,
                  roleLabel: "is related by",
                },
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "RelationshipClassA";

          // Act
          const relationshipClass = testSchema.getItemSync(schemaItem) as RelationshipClass;
          ECJsonMarkdownGenerator.writeRelationshipClass(outputFilePath, relationshipClass, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **RelationshipClassA** [!badge text="RelationshipClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=RelationshipClass&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

          **Base Class:** [testSchema:EntityClassD](./testschema.ecschema.md#entityclassd)

          **Strength:** Referencing

          **Strength Direction:** Forward

          #### Source
          [!IndentStart]

          **Is Polymorphic:** false

          **Role Label:** relates to

          **Multiplicity:** (0..*)

          #### Constraint Classes:
          - [EntityClassA](./testschema.ecschema.md#entityclassa)
          [!IndentEnd]
          #### Target
          [!IndentStart]

          **Is Polymorphic:** true

          **Role Label:** is related by

          **Multiplicity:** (1..1)

          #### Constraint Classes:
          - [EntityClassB](./testschema.ecschema.md#entityclassb)
          [!IndentEnd]
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a base class with description, base class, and label", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                schemaItemType: "EntityClass",
              },
              EntityClassB: {
                schemaItemType: "EntityClass",
              },
              EntityClassC: {
                schemaItemType: "EntityClass",
              },
              EntityClassD: {
                schemaItemType: "EntityClass",
              },
              RelationshipClassA: {
                label : "relationshipClassALabel",
                modifier: "none",
                schemaItemType: "RelationshipClass",
                strength : "referencing",
                strengthDirection : "forward",
                source : {
                  constraintClasses: [ "testSchema.EntityClassA" ],
                  multiplicity : "(0..*)",
                  polymorphic : false,
                  roleLabel: "relates to",
                },
                target : {
                  constraintClasses : [ "testSchema.EntityClassB" ],
                  multiplicity : "(1..1)",
                  polymorphic: true,
                  roleLabel: "is related by",
                },
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "RelationshipClassA";

          // Act
          const relationshipClass = testSchema.getItemSync(schemaItem) as RelationshipClass;
          ECJsonMarkdownGenerator.writeRelationshipClass(outputFilePath, relationshipClass, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **RelationshipClassA** (relationshipClassALabel) [!badge text="RelationshipClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=RelationshipClass&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

          **Strength:** Referencing

          **Strength Direction:** Forward

          #### Source
          [!IndentStart]

          **Is Polymorphic:** false

          **Role Label:** relates to

          **Multiplicity:** (0..*)

          #### Constraint Classes:
          - [EntityClassA](./testschema.ecschema.md#entityclassa)
          [!IndentEnd]
          #### Target
          [!IndentStart]

          **Is Polymorphic:** true

          **Role Label:** is related by

          **Multiplicity:** (1..1)

          #### Constraint Classes:
          - [EntityClassB](./testschema.ecschema.md#entityclassb)
          [!IndentEnd]
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class that has multiple constraint classes in target and source", () => {
          // Arrange
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              EntityClassA: {
                schemaItemType: "EntityClass",
              },
              EntityClassB: {
                schemaItemType: "EntityClass",
              },
              EntityClassC: {
                schemaItemType: "EntityClass",
              },
              EntityClassD: {
                schemaItemType: "EntityClass",
              },
              EntityClassE: {
                schemaItemType: "EntityClass",
              },
              EntityClassF: {
                schemaItemType: "EntityClass",
              },
              EntityClassG: {
                schemaItemType: "EntityClass",
              },
              RelationshipClassA: {
                modifier: "none",
                schemaItemType: "RelationshipClass",
                strength : "referencing",
                strengthDirection : "forward",
                source : {
                  constraintClasses: [
                    "testSchema.EntityClassA",
                    "testSchema.EntityClassB",
                    "testSchema.EntityClassC" ],
                  multiplicity : "(0..*)",
                  polymorphic : false,
                  roleLabel: "relates to",
                },
                target : {
                  constraintClasses : [
                    "testSchema.EntityClassE",
                    "testSchema.EntityClassF",
                    "testSchema.EntityClassG" ],
                  multiplicity : "(1..1)",
                  polymorphic: true,
                  roleLabel: "is related by",
                },
              },
            },
          };

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);
          const schemaItem = "RelationshipClassA";

          // Act
          const relationshipClass = testSchema.getItemSync(schemaItem) as RelationshipClass;
          ECJsonMarkdownGenerator.writeRelationshipClass(outputFilePath, relationshipClass, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **RelationshipClassA** [!badge text="RelationshipClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=RelationshipClass&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

          **Strength:** Referencing

          **Strength Direction:** Forward

          #### Source
          [!IndentStart]

          **Is Polymorphic:** false

          **Role Label:** relates to

          **Multiplicity:** (0..*)

          #### Constraint Classes:
          - [EntityClassA](./testschema.ecschema.md#entityclassa)
          - [EntityClassB](./testschema.ecschema.md#entityclassb)
          - [EntityClassC](./testschema.ecschema.md#entityclassc)
          [!IndentEnd]
          #### Target
          [!IndentStart]

          **Is Polymorphic:** true

          **Role Label:** is related by

          **Multiplicity:** (1..1)

          #### Constraint Classes:
          - [EntityClassE](./testschema.ecschema.md#entityclasse)
          - [EntityClassF](./testschema.ecschema.md#entityclassf)
          - [EntityClassG](./testschema.ecschema.md#entityclassg)
          [!IndentEnd]
          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeEnumerationItem", () => {
        const outputFilePath = path.join(outputDir, "relationshipClassTest.md");
        const schemaJson = {
          $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
          alias: "testSchema",
          name: "testSchema",
          version: "02.00.00",
          items: {
            IntBackedEnum : {
              type : "int",
              enumerators : [
                {
                  name : "IntThing",
                  label : "IntThing",
                  value : 0,
                },
              ],
              isStrict : true,
              schemaItemType : "Enumeration",
            },
            StringBackedEnum : {
              type : "string",
              enumerators : [
                {
                  name : "StringThing",
                  label : "StringThing",
                  value : "zero",
                },
              ],
              isStrict : true,
              schemaItemType : "Enumeration",
            },
            NoEnumEnum : {
              type : "string",
              enumerators : [ ],
              isStrict : true,
              schemaItemType : "Enumeration",
            },
            LotsOfEnumEnum : {
              type : "int",
              enumerators : [
                {
                  name : "Zero",
                  label : "Zero",
                  value : 0,
                },
                {
                  name : "One",
                  label : "One",
                  value : 1,
                },
                {
                  name : "Two",
                  label : "Two",
                  value : 2,
                },
                {
                  name : "Three",
                  label : "Three",
                  value : 3,
                },
                {
                  name : "Four",
                  label : "Four",
                  value : 4,
                },
              ],
              isStrict : true,
              schemaItemType : "Enumeration",
            },
            NoLabelEnumerators : {
              type : "int",
              enumerators : [
                {
                  name : "Zero",
                  value : 0,
                },
                {
                  name : "One",
                  value : 1,
                },
                {
                  name : "Two",
                  value : 2,
                },
                {
                  name : "Three",
                  value : 3,
                },
                {
                  name : "Four",
                  value : 4,
                },
              ],
              isStrict : true,
              schemaItemType : "Enumeration",
            },
            WithDescriptionEnum : {
              type : "int",
              enumerators : [
                {
                  name : "Zero",
                  value : 0,
                  description : "Short Description",
                },
                {
                  name : "One",
                  value : 1,
                  description : "Description with \"commas\" ",
                },
                {
                  name : "Two",
                  value : 2,
                  description : "",
                },
                {
                  name : "Three",
                  value : 3,
                  description : "Multi line description: Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text",
                },
              ],
              isStrict : true,
              schemaItemType : "Enumeration",
            },
          },
        };

        const context = new SchemaContext();
        const testSchema = Schema.fromJsonSync(schemaJson, context);

        // Delete the output file before each test
        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should properly write an enumeration backed by int", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **IntBackedEnum** [!badge text="Enumeration" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Enumeration&id=${testSchema.name}.IntBackedEnum)

          [!IndentStart]

          **Backing Type:** int

          **Strict:** true
          
          |    Label    |    Value    |    Description    |
          |:------------|:------------|:------------------|
          |IntThing|0||
          
          [!IndentEnd]\n`);

          // Act
          const enumeration = testSchema.getItemSync("IntBackedEnum") as Enumeration;
          ECJsonMarkdownGenerator.writeEnumerationItem(outputFilePath, enumeration, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write an enumeration backed by a string", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **StringBackedEnum** [!badge text="Enumeration" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Enumeration&id=${testSchema.name}.StringBackedEnum)

          [!IndentStart]

          **Backing Type:** string    

          **Strict:** true

          |    Label    |    Value    |    Description    |
          |:------------|:------------|:------------------|
          |StringThing|zero||
          
          [!IndentEnd]\n`);

          // Act
          const enumeration = testSchema.getItemSync("StringBackedEnum") as Enumeration;
          ECJsonMarkdownGenerator.writeEnumerationItem(outputFilePath, enumeration, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write an enumeration with no enumerators", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **NoEnumEnum** [!badge text="Enumeration" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Enumeration&id=${testSchema.name}.NoEnumEnum)

          [!IndentStart]

          **Backing Type:** string

          **Strict:** true
          [!IndentEnd]\n`);

          // Act
          const enumeration = testSchema.getItemSync("NoEnumEnum") as Enumeration;
          ECJsonMarkdownGenerator.writeEnumerationItem(outputFilePath, enumeration, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write an enumeration with several enumerators", () => {
          // Arrange

          const correctLines = outputLiteralToArray(`
          ### **LotsOfEnumEnum** [!badge text="Enumeration" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Enumeration&id=${testSchema.name}.LotsOfEnumEnum)

          [!IndentStart]

          **Backing Type:** int

          **Strict:** true

          |    Label    |    Value    |    Description    |
          |:------------|:------------|:------------------|
          |Zero|0||
          |One|1||
          |Two|2||
          |Three|3||
          |Four|4||
          
          [!IndentEnd]\n`);

          // Act
          const enumeration = testSchema.getItemSync("LotsOfEnumEnum") as Enumeration;
          ECJsonMarkdownGenerator.writeEnumerationItem(outputFilePath, enumeration, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write an enumeration with no enumerator labels", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **NoLabelEnumerators** [!badge text="Enumeration" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Enumeration&id=${testSchema.name}.NoLabelEnumerators)

          [!IndentStart]

          **Backing Type:** int

          **Strict:** true

          |    Label    |    Value    |    Description    |
          |:------------|:------------|:------------------|
          ||0||
          ||1||
          ||2||
          ||3||
          ||4||

          [!IndentEnd]\n`);

          // Act
          const enumeration = testSchema.getItemSync("NoLabelEnumerators") as Enumeration;
          ECJsonMarkdownGenerator.writeEnumerationItem(outputFilePath, enumeration, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write an enumeration with descriptions", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **WithDescriptionEnum** [!badge text="Enumeration" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Enumeration&id=${testSchema.name}.WithDescriptionEnum)
  
          [!IndentStart]
  
          **Backing Type:** int
  
          **Strict:** true
  
          |    Label    |    Value    |    Description    |
          |:------------|:------------|:------------------|
          ||0|Short Description|
          ||1|Description with \"commas\" |
          ||2||
          ||3|Multi line description: Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text, Text|
  
          [!IndentEnd]\n`);

          // Act
          const enumeration = testSchema.getItemSync("WithDescriptionEnum") as Enumeration;
          ECJsonMarkdownGenerator.writeEnumerationItem(outputFilePath, enumeration, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeMixinClass", () => {
        const outputFilePath = path.join(outputDir, "mixinClassTest.md");
        const schemaJson = {
          $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
          alias: "testSchema",
          name: "testSchema",
          version: "02.00.00",
          items: {
            UnitA: {
              schemaItemType: "Unit",
              name: "A",
              phenomenon: "testSchema.Phenomenon",
              unitSystem: "testSchema.UnitSys",
              definition: "",
            },
            Phenomenon: {
              schemaItemType: "Phenomenon",
              name: "Phenom",
              label: "Phenomenon",
              definition: "",
            },
            UnitSys: {
              schemaItemType: "UnitSystem",
              name: "UnitSys",
              label: "Test Unit System",
              description: "Test Unit System",
            },
            DefaultReal : {
              formatTraits : [ "keepSingleZero", "keepDecimalPoint" ],
              label : "real",
              precision : 6,
              schemaItemType : "Format",
              type : "Decimal",
            },
            KOQA: {
              schemaItemType: "KindOfQuantity",
              relativeError : 0.0,
              persistenceUnit : "testSchema.UnitA",
              precision : 0.0010,
              presentationUnits : [ "testSchema.DefaultReal[testSchema.UnitA]" ],
            },
            KOQB: {
              schemaItemType: "KindOfQuantity",
              relativeError : 0.0,
              persistenceUnit : "testSchema.UnitA",
              precision : 0.0010,
              presentationUnits : [ "testSchema.DefaultReal[testSchema.UnitA]" ],
            },
            KOQC: {
              schemaItemType: "KindOfQuantity",
              relativeError : 0.0,
              persistenceUnit : "testSchema.UnitA",
              precision : 0.0010,
              presentationUnits : [ "testSchema.DefaultReal[testSchema.UnitA]" ],
            },
            KOQD: {
              schemaItemType: "KindOfQuantity",
              relativeError : 0.0,
              persistenceUnit : "testSchema.UnitA",
              precision : 0.0010,
              presentationUnits : [ "testSchema.DefaultReal[testSchema.UnitA]" ],
            },
            EntityA : {
              schemaItemType : "EntityClass",
            },
            EntityB : {
              schemaItemType : "EntityClass",
            },
            PlainMixin : {
              appliesTo : "testSchema.EntityA",
              schemaItemType : "Mixin",
            },
            MixinWithDescription : {
              appliesTo : "testSchema.EntityA",
              description : "this is a description",
              schemaItemType : "Mixin",
            },
            MixinWithBaseclass : {
              appliesTo : "testSchema.EntityA",
              baseClass : "testSchema.EntityB",
              schemaItemType : "Mixin",
            },
            MixinWithLabel : {
              appliesTo : "testSchema.EntityA",
              schemaItemType : "Mixin",
              label : "MixinLabel",
            },
            MixinWithDBL : {
              appliesTo : "testSchema.EntityA",
              schemaItemType : "Mixin",
              description : "this is a description",
              baseClass : "testSchema.EntityB",
              label : "MixinLabel",
            },
            MixinWithProperties : {
              appliesTo : "testSchema.EntityA",
              schemaItemType : "Mixin",
              properties : [
                {
                  kindOfQuantity : "testSchema.KOQA",
                  name : "propertyA",
                  type : "PrimitiveProperty",
                  typeName : "double",
                },
                {
                  kindOfQuantity : "testSchema.KOQB",
                  label : "propertyBLabel",
                  name : "propertyB",
                  type : "PrimitiveProperty",
                  typeName : "double",
                },
                {
                  kindOfQuantity : "testSchema.KOQC",
                  label : "propertyCLabel",
                  name : "propertyC",
                  type : "PrimitiveProperty",
                  typeName : "double",
                  isReadOnly : false,
                },
                {
                  kindOfQuantity : "testSchema.KOQD",
                  label : "propertyDLabel",
                  name : "propertyD",
                  type : "PrimitiveProperty",
                  typeName : "double",
                  isReadOnly : true,
                  priority : 1,
                },
              ],
            },
            MixinWithAll : {
              description : "this is a description",
              baseClass : "testSchema.EntityB",
              label : "MixinLabel",
              appliesTo : "testSchema.EntityA",
              schemaItemType : "Mixin",
              properties : [
                {
                  kindOfQuantity : "testSchema.KOQD",
                  label : "propertyDLabel",
                  name : "propertyD",
                  type : "PrimitiveProperty",
                  typeName : "double",
                  isReadOnly : true,
                  priority : 1,
                },
              ],
            },
          },
        };

        const context = new SchemaContext();
        const testSchema = Schema.fromJsonSync(schemaJson, context);

        // Delete the output file before each test
        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("it should properly write a mixin that has no description, base class, label, or properties", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **PlainMixin** *Abstract* [!badge text="Mixin" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Mixin&id=${testSchema.name}.PlainMixin)

          [!IndentStart]

          **Applies To:** [EntityA](./testschema.ecschema.md#entitya)
          
          [!IndentEnd]\n`);

          // Act
          const mixin = testSchema.getItemSync("PlainMixin") as Mixin;
          ECJsonMarkdownGenerator.writeMixinClass(outputFilePath, mixin, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("it should properly write a mixin that has a description", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **MixinWithDescription** *Abstract* [!badge text="Mixin" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Mixin&id=${testSchema.name}.MixinWithDescription)

          [!IndentStart]

           this is a description

          **Applies To:** [EntityA](./testschema.ecschema.md#entitya)
          
          [!IndentEnd]\n`);

          // Act
          const mixin = testSchema.getItemSync("MixinWithDescription") as Mixin;
          ECJsonMarkdownGenerator.writeMixinClass(outputFilePath, mixin, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("it should properly write a mixin that has a base class", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **MixinWithBaseclass** *Abstract* [!badge text="Mixin" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Mixin&id=${testSchema.name}.MixinWithBaseclass)

          [!IndentStart]

          **Base Class:** [testSchema:EntityB](./testschema.ecschema.md#entityb)

          **Applies To:** [EntityA](./testschema.ecschema.md#entitya)
          
          [!IndentEnd]\n`);

          // Act
          const mixin = testSchema.getItemSync("MixinWithBaseclass") as Mixin;
          ECJsonMarkdownGenerator.writeMixinClass(outputFilePath, mixin, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("it should properly write a mixin that has a label", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **MixinWithLabel** (MixinLabel) *Abstract* [!badge text="Mixin" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Mixin&id=${testSchema.name}.MixinWithLabel)

          [!IndentStart]

          **Applies To:** [EntityA](./testschema.ecschema.md#entitya)
          
          [!IndentEnd]\n`);

          // Act
          const mixin = testSchema.getItemSync("MixinWithLabel") as Mixin;
          ECJsonMarkdownGenerator.writeMixinClass(outputFilePath, mixin, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("it should properly write a mixin that has a base class, label, and description", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **MixinWithDBL** (MixinLabel) *Abstract* [!badge text="Mixin" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Mixin&id=${testSchema.name}.MixinWithDBL)

          [!IndentStart]

           this is a description

          **Base Class:** [testSchema:EntityB](./testschema.ecschema.md#entityb)

          **Applies To:** [EntityA](./testschema.ecschema.md#entitya)
          
          [!IndentEnd]\n`);

          // Act
          const mixin = testSchema.getItemSync("MixinWithDBL") as Mixin;
          ECJsonMarkdownGenerator.writeMixinClass(outputFilePath, mixin, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("it should properly write a mixin that has several properties", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **MixinWithProperties** *Abstract* [!badge text="Mixin" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Mixin&id=${testSchema.name}.MixinWithProperties)

          [!IndentStart]

          **Applies To:** [EntityA](./testschema.ecschema.md#entitya)

          #### Properties

          |    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |
          |:-----------|:------------|:------------|:-----------|:-----------------|:---------------|
          |propertyA||||false|0|
          |propertyB||propertyBLabel||false|0|
          |propertyC||propertyCLabel||false|0|
          |propertyD||propertyDLabel||true|1|
          
          [!IndentEnd]\n`);

          // Act
          const mixin = testSchema.getItemSync("MixinWithProperties") as Mixin;
          ECJsonMarkdownGenerator.writeMixinClass(outputFilePath, mixin, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("it should properly write a mixin that has all attributes", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **MixinWithAll** (MixinLabel) *Abstract* [!badge text="Mixin" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Mixin&id=${testSchema.name}.MixinWithAll)

          [!IndentStart]

           this is a description

          **Base Class:** [testSchema:EntityB](./testschema.ecschema.md#entityb)

          **Applies To:** [EntityA](./testschema.ecschema.md#entitya)

          #### Properties

          |    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |
          |:-----------|:------------|:------------|:-----------|:-----------------|:---------------|
          |propertyD||propertyDLabel||true|1|

          <details> 
          <summary>Inherited properties</summary>

          |    Name    |    Description    |    Type    |      Extended Type     |
          |:-----------|:------------------|:-----------|:-----------------------|
          </details>
          
          [!IndentEnd]\n`);

          // Act
          const mixin = testSchema.getItemSync("MixinWithAll") as Mixin;
          ECJsonMarkdownGenerator.writeMixinClass(outputFilePath, mixin, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeCustomAttributeClass", () => {

        const outputFilePath = path.join(outputDir, "customAttributeClassTest.md");
        const schemaJson = {
          $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
          alias: "testSchema",
          name: "testSchema",
          version: "02.00.00",
          items: {
            EntityA : { schemaItemType : "EntityClass" },
            PlainCAC : {
              appliesTo : "AnyProperty",
              modifier : "sealed",
              schemaItemType : "CustomAttributeClass",
            },
            CACWithDescription : {
              appliesTo : "AnyProperty",
              description : "this is a description",
              modifier : "sealed",
              schemaItemType : "CustomAttributeClass",
            },
            CACWithBaseClass : {
              appliesTo : "AnyProperty",
              description : "this is a description",
              baseClass : "testSchema.EntityA",
              modifier : "sealed",
              schemaItemType : "CustomAttributeClass",
            },
            CACWithProperties : {
              appliesTo : "AnyProperty",
              description : "this is a description",
              baseClass : "testSchema.EntityA",
              modifier : "sealed",
              schemaItemType : "CustomAttributeClass",
              properties : [
                {
                  name : "PropertyA",
                  label : "PropertyALabel",
                  type : "PrimitiveProperty",
                  typeName : "boolean",
                },
              ],
            },
            CACWithMultipleProperties : {
              appliesTo : "AnyProperty",
              schemaItemType : "CustomAttributeClass",
              properties : [
                {
                  name : "PropertyA",
                  type : "PrimitiveProperty",
                  typeName : "boolean",
                },
                {
                  name : "PropertyB",
                  label : "PropertyBLabel",
                  type : "PrimitiveProperty",
                  typeName : "boolean",
                  isReadOnly : true,
                },
                {
                  name : "PropertyC",
                  label : "PropertyCLabel",
                  type : "PrimitiveProperty",
                  typeName : "boolean",
                  isReadOnly : true,
                  priority : 1,
                },
              ],
            },
          },
        };

        const context = new SchemaContext();
        const testSchema = Schema.fromJsonSync(schemaJson, context);

        // Delete the output file before each test
        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should write a class without description, base class, or properties", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **PlainCAC** *Sealed* [!badge text="CustomAttributeClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=CustomAttributeClass&id=${testSchema.name}.PlainCAC)

          [!IndentStart]

          **Applies to:** AnyProperty

          [!IndentEnd]\n`);

          // Act
          const customAttribute = testSchema.getItemSync("PlainCAC") as CustomAttributeClass;
          ECJsonMarkdownGenerator.writeCustomAttributeClass(outputFilePath, customAttribute, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class that has a description", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **CACWithDescription** *Sealed* [!badge text="CustomAttributeClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=CustomAttributeClass&id=${testSchema.name}.CACWithDescription)

          [!IndentStart]

           this is a description

          **Applies to:** AnyProperty
          
          [!IndentEnd]\n`);

          // Act
          const customAttribute = testSchema.getItemSync("CACWithDescription") as CustomAttributeClass;
          ECJsonMarkdownGenerator.writeCustomAttributeClass(outputFilePath, customAttribute, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class with a description and a base class", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **CACWithBaseClass** *Sealed* [!badge text="CustomAttributeClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=CustomAttributeClass&id=${testSchema.name}.CACWithBaseClass)

          [!IndentStart]

           this is a description

          **Base Class:** [testSchema:EntityA](./testschema.ecschema.md#entitya)

          **Applies to:** AnyProperty
          
          [!IndentEnd]\n`);

          // Act
          const customAttribute = testSchema.getItemSync("CACWithBaseClass") as CustomAttributeClass;
          ECJsonMarkdownGenerator.writeCustomAttributeClass(outputFilePath, customAttribute, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class that has a description, base class, and properties", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **CACWithProperties** *Sealed* [!badge text="CustomAttributeClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=CustomAttributeClass&id=${testSchema.name}.CACWithProperties)

          [!IndentStart]

           this is a description

          **Base Class:** [testSchema:EntityA](./testschema.ecschema.md#entitya)

          **Applies to:** AnyProperty
          #### Properties

          |    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |
          |:-----------|:------------|:------------|:-----------|:-----------------|:---------------|
          |PropertyA||PropertyALabel||false|0|

          <details>
          <summary>Inherited properties</summary>

          |    Name    |    Description    |    Type    |      Extended Type     |
          |:-----------|:------------------|:-----------|:-----------------------|
          </details>
          
          [!IndentEnd]\n`);

          // Act
          const customAttribute = testSchema.getItemSync("CACWithProperties") as CustomAttributeClass;
          ECJsonMarkdownGenerator.writeCustomAttributeClass(outputFilePath, customAttribute, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class that has several properties", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **CACWithMultipleProperties** [!badge text="CustomAttributeClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=CustomAttributeClass&id=${testSchema.name}.CACWithMultipleProperties)

          [!IndentStart] 

          **Applies to:** AnyProperty
          #### Properties

          |    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |
          |:-----------|:------------|:------------|:-----------|:-----------------|:---------------|
          |PropertyA||||false|0|
          |PropertyB||PropertyBLabel||true|0|
          |PropertyC||PropertyCLabel||true|1|
          
          [!IndentEnd]\n`);

          // Act
          const customAttribute = testSchema.getItemSync("CACWithMultipleProperties") as CustomAttributeClass;
          ECJsonMarkdownGenerator.writeCustomAttributeClass(outputFilePath, customAttribute, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeStructClass", () => {
        const outputFilePath = path.join(outputDir, "structClassTest.md");
        const schemaJson = {
          $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
          alias: "testSchema",
          name: "testSchema",
          version: "02.00.00",
          items: {
            EntityA : {
              schemaItemType : "EntityClass",
            },
            PlainStruct : {
              modifier : "sealed",
              schemaItemType : "StructClass",
            },
            StructD : {
              modifier : "sealed",
              description : "this is a description",
              schemaItemType : "StructClass",
            },
            StructDL : {
              modifier : "sealed",
              description : "this is a description",
              label : "StructDLLabel",
              schemaItemType : "StructClass",
            },
            StructDLB : {
              modifier : "sealed",
              description  : "this is a description",
              label : "StructDLBLabel",
              baseClass : "testSchema.EntityA",
              schemaItemType : "StructClass",
            },
            StructDLBP : {
              modifier : "sealed",
              description : "this is a description",
              label : "StructDLBPLabel",
              baseClass : "testSchema.EntityA",
              schemaItemType : "StructClass",
              properties : [
                {
                  name : "propertyA",
                  type : "PrimitiveProperty",
                  typeName : "string",
                },
              ],
            },
            StructProperties : {
              modifier : "sealed",
              schemaItemType : "StructClass",
              properties : [
                {
                  name : "propertyA",
                  type : "PrimitiveProperty",
                  typeName : "string",
                },
                {
                  name : "propertyB",
                  type : "PrimitiveProperty",
                  typeName : "string",
                  isReadOnly : true,
                },
                {
                  name : "propertyV",
                  type : "PrimitiveProperty",
                  typeName : "string",
                  priority : 1,
                },
              ],
            },
          },
        };

        const context = new SchemaContext();
        const testSchema = Schema.fromJsonSync(schemaJson, context);

        // Delete the output file before each test
        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should properly write a class without a description, label, base class, or properties", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **PlainStruct** *Sealed* [!badge text="StructClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=StructClass&id=${testSchema.name}.PlainStruct)

          [!IndentStart]
          
          [!IndentEnd]\n`);

          // Act
          const struct = testSchema.getItemSync("PlainStruct") as StructClass;
          ECJsonMarkdownGenerator.writeStructClass(outputFilePath, struct, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class that has a description", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **StructD** *Sealed* [!badge text="StructClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=StructClass&id=${testSchema.name}.StructD)

          [!IndentStart]

           this is a description
          
          [!IndentEnd]\n`);

          // Act
          const struct = testSchema.getItemSync("StructD") as StructClass;
          ECJsonMarkdownGenerator.writeStructClass(outputFilePath, struct, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class that has a description and label", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **StructDL** (StructDLLabel) *Sealed* [!badge text="StructClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=StructClass&id=${testSchema.name}.StructDL)

          [!IndentStart]

           this is a description
          
          [!IndentEnd]\n`);

          // Act
          const struct = testSchema.getItemSync("StructDL") as StructClass;
          ECJsonMarkdownGenerator.writeStructClass(outputFilePath, struct, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class that has a description, label, and base class", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **StructDLB** (StructDLBLabel) *Sealed* [!badge text="StructClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=StructClass&id=${testSchema.name}.StructDLB)

          [!IndentStart]

           this is a description

          **Base Class:** [testSchema:EntityA](./testschema.ecschema.md#entitya)
          
          [!IndentEnd]\n`);

          // Act
          const struct = testSchema.getItemSync("StructDLB") as StructClass;
          ECJsonMarkdownGenerator.writeStructClass(outputFilePath, struct, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class that a description, label, base class, and properties", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **StructDLBP** (StructDLBPLabel) *Sealed* [!badge text="StructClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=StructClass&id=${testSchema.name}.StructDLBP)

          [!IndentStart]

           this is a description

          **Base Class:** [testSchema:EntityA](./testschema.ecschema.md#entitya)

          #### Properties

          |    Name    |  Description  |    Label    |  Category  |    Read Only     |    Priority    |
          |:-----------|:--------------|:------------|:-----------|:-----------------|:---------------|
          |propertyA||||false|0|

          <details>
          <summary>Inherited properties</summary>

          |    Name    |    Description    |    Type    |      Extended Type     |
          |:-----------|:------------------|:-----------|:-----------------------|
          </details>

          [!IndentEnd]\n`);

          // Act
          const struct = testSchema.getItemSync("StructDLBP") as StructClass;
          ECJsonMarkdownGenerator.writeStructClass(outputFilePath, struct, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write a class that has several properties", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **StructProperties** *Sealed* [!badge text="StructClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=StructClass&id=${testSchema.name}.StructProperties)

          [!IndentStart]

          #### Properties

          |    Name    |  Description  |    Label    |  Category  |    Read Only     |    Priority    |
          |:-----------|:--------------|:------------|:-----------|:-----------------|:---------------|
          |propertyA||||false|0|
          |propertyB||||true|0|
          |propertyV||||false|1|
          
          [!IndentEnd]\n`);

          // Act
          const struct = testSchema.getItemSync("StructProperties") as StructClass;
          ECJsonMarkdownGenerator.writeStructClass(outputFilePath, struct, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writePropertyCategory", () => {
        const outputFilePath = path.join(outputDir, "structClassTest.md");
        const schemaJson = {
          $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
          alias: "testSchema",
          name: "testSchema",
          version: "02.00.00",
          items: {
            PlainPropCategory : {
              schemaItemType : "PropertyCategory",
            },
            PropCategoryD : {
              schemaItemType : "PropertyCategory",
              description : "this is a description",
            },
            PropCategoryDL : {
              schemaItemType : "PropertyCategory",
              description : "this is a description",
              label : "PropCategoryDLLabel",
            },
          },
        };

        const context = new SchemaContext();
        const testSchema = Schema.fromJsonSync(schemaJson, context);

        // Delete the output file before each test
        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should properly write property category with no description or label", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **PlainPropCategory** [!badge text="PropertyCategory" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=PropertyCategory&id=${testSchema.name}.PlainPropCategory)

          [!IndentStart]

          [!IndentEnd]\n`);

          // Act
          const propertyCategory = testSchema.getItemSync("PlainPropCategory") as PropertyCategory;
          ECJsonMarkdownGenerator.writePropertyCategory(outputFilePath, propertyCategory, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write property category with a description", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **PropCategoryD** [!badge text="PropertyCategory" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=PropertyCategory&id=${testSchema.name}.PropCategoryD)

          [!IndentStart]

           this is a description
          
          [!IndentEnd]\n`);

          // Act
          const propertyCategory = testSchema.getItemSync("PropCategoryD") as PropertyCategory;
          ECJsonMarkdownGenerator.writePropertyCategory(outputFilePath, propertyCategory, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write property category with a description and label", () => {
          // Arrange
          const correctLines = outputLiteralToArray(`
          ### **PropCategoryDL** (PropCategoryDLLabel) [!badge text="PropertyCategory" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=PropertyCategory&id=${testSchema.name}.PropCategoryDL)

          [!IndentStart]

           this is a description
          
          [!IndentEnd]\n`);

          // Act
          const propertyCategory = testSchema.getItemSync("PropCategoryDL") as PropertyCategory;
          ECJsonMarkdownGenerator.writePropertyCategory(outputFilePath, propertyCategory, testSchema.name);
          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeFormat", () => {
        const outputFilePath = path.join(outputDir, "formatTest.md");

        const schemaJson = {
          $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
          alias: "testSchema",
          name: "testSchema",
          version: "02.00.00",
          items: {
            FormatA: {
              schemaItemType: "Format",
              type: "Fractional",
            },
            FormatB: {
              schemaItemType: "Format",
              type: "Decimal",
              precision: 4,
              showSignOption: "NoSign",
              uomSeparator: "",
            },
            FormatC: {
              schemaItemType: "Format",
              type: "Fractional",
              formatTraits: [ "keepSingleZero", "keepDecimalPoint", "showUnitLabel" ],
              uomSeparator: "-",
            },
          },
        };
        const context = new SchemaContext();
        const testSchema = Schema.fromJsonSync(schemaJson, context);

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should properly write formats that has just a name and type (required)", () => {
          // Act
          const schemaItem = "FormatA";
          const format = testSchema.getItemSync(schemaItem) as Format;
          ECJsonMarkdownGenerator.writeFormatClass(outputFilePath, format, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **FormatA** [!badge text="Format" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Format&id=${testSchema.name}.${schemaItem})\n
          [!IndentStart]

          **Type:** Fractional\n
          **Precision:** 6\n
          **Show Sign Option:** OnlyNegative\n
          **Format Traits**\n
          **Separator:** <code> </code> (Space)\n
          [!IndentEnd]\n`);
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write formats that have a name, type, precision, and showSignOption", () => {
          // Act
          const schemaItem = "FormatB";
          const format = testSchema.getItemSync(schemaItem) as Format;
          ECJsonMarkdownGenerator.writeFormatClass(outputFilePath, format, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **FormatB** [!badge text="Format" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Format&id=${testSchema.name}.${schemaItem})\n
          [!IndentStart]

          **Type:** Decimal\n
          **Precision:** 4\n
          **Show Sign Option:** NoSign\n
          **Format Traits**\n
          **Separator:** None\n
          [!IndentEnd]\n`);
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write formats that have a name, type, precision, and format traits", () => {
          // Act
          const schemaItem = "FormatC";
          const format = testSchema.getItemSync(schemaItem) as Format;
          ECJsonMarkdownGenerator.writeFormatClass(outputFilePath, format, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **FormatC** [!badge text="Format" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Format&id=${testSchema.name}.${schemaItem})

          [!IndentStart]

          **Type:** Fractional

          **Precision:** 6

          **Show Sign Option:** OnlyNegative

          **Format Traits**
          - KeepSingleZero
          - KeepDecimalPoint
          - ShowUnitLabel

          **Separator:** -

          [!IndentEnd]
          `);
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeUnit", () => {
        const outputFilePath = path.join(outputDir, "UnitTest.md");

        const schemaJson = {
          $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
          alias: "testSchema",
          name: "testSchema",
          version: "02.00.00",
          items: {
            UnitA: {
              schemaItemType: "Unit",
              definition: "CM(2)",
              label: "label",
              phenomenon: "testSchema.LUMINOSITY",
              unitSystem: "testSchema.SI",
            },
            LUMINOSITY: {
              definition: "LUMINOSITY",
              label: "Luminosity",
              schemaItemType: "Phenomenon",
            },
            SI: {
              schemaItemType: "UnitSystem",
            },
            UnitB: {
              schemaItemType: "Unit",
              definition: "CM(2)",
              label: "label",
              phenomenon: "testSchema.POWER",
              unitSystem: "testSchema.SI",
              numerator: 1,
              denominator: 1,
            },
            POWER: {
              definition: "WORK*TIME(-1)",
              label: "Power",
              schemaItemType: "Phenomenon",
            },
            POWER_RATIO: {
              definition: "POWER*POWER(1)",
              label: "Power Ratio",
              schemaItemType: "Phenomenon",
            },
            STATISTICS: {
              schemaItemType: "UnitSystem",
            },
            UnitC: {
              schemaItemType: "Unit",
              definition: "CM(2)",
              label: "label",
              phenomenon: "testSchema.POWER",
              unitSystem: "testSchema.SI",
              numerator: 123,
              denominator: 1,
            },
            UnitD: {
              schemaItemType: "Unit",
              definition: "CM(2)",
              label: "label",
              phenomenon: "testSchema.POWER",
              unitSystem: "testSchema.SI",
              numerator: 123,
              denominator: 456,
            },
            UnitE: {
              schemaItemType: "Unit",
              definition: "CM(2)",
              label: "label",
              phenomenon: "testSchema.POWER",
              unitSystem: "testSchema.SI",
              numerator: 1,
              denominator: 4,
            },
            UnitF: {
              schemaItemType: "Unit",
              definition: "UnitE*UnitE(-1)",
              label: "unit f",
              phenomenon: "testSchema.POWER_RATIO",
              unitSystem: "testSchema.SI",
            },
            InvUnitF: {
              schemaItemType: "InvertedUnit",
              invertsUnit: "testSchema.UnitF",
              label: "inverts unit f",
              unitSystem: "testSchema.STATISTICS",
            },
          },
        };
        const context = new SchemaContext();
        const testSchema = Schema.fromJsonSync(schemaJson, context);

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should properly write units with a phenomenon and unitSystem", () => {
          // Act
          const schemaItem = "UnitA";
          const unit = testSchema.getItemSync(schemaItem) as Unit;
          ECJsonMarkdownGenerator.writeUnitClass(outputFilePath, unit, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **UnitA** (label) [!badge text="Unit" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Unit&id=${testSchema.name}.${schemaItem})\n
          [!IndentStart]

          **Definition:** CM(2)\n
          **Phenomenon:** LUMINOSITY\n
          **Unit System:** SI\n
          [!IndentEnd]\n`);
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write units with neither numerator or denominator displayed", () => {
          // Act
          const schemaItem = "UnitB";
          const unit = testSchema.getItemSync(schemaItem) as Unit;
          ECJsonMarkdownGenerator.writeUnitClass(outputFilePath, unit, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **UnitB** (label) [!badge text="Unit" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Unit&id=${testSchema.name}.${schemaItem})\n
          [!IndentStart]

          **Definition:** CM(2)\n
          **Phenomenon:** POWER\n
          **Unit System:** SI\n
          [!IndentEnd]\n`);
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write units with numerator displayed", () => {
          // Act
          const schemaItem = "UnitC";
          const unit = testSchema.getItemSync(schemaItem) as Unit;
          ECJsonMarkdownGenerator.writeUnitClass(outputFilePath, unit, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **UnitC** (label) [!badge text="Unit" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Unit&id=${testSchema.name}.${schemaItem})\n
          [!IndentStart]

          **Definition:** CM(2)\n
          **Phenomenon:** POWER\n
          **Unit System:** SI\n
          **Numerator:** 123\n
          [!IndentEnd]\n`);
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write units with numerator and denominator displayed", () => {
          // Act
          const schemaItem = "UnitD";
          const unit = testSchema.getItemSync(schemaItem) as Unit;
          ECJsonMarkdownGenerator.writeUnitClass(outputFilePath, unit, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **UnitD** (label) [!badge text="Unit" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Unit&id=${testSchema.name}.${schemaItem})\n
          [!IndentStart]

          **Definition:** CM(2)\n
          **Phenomenon:** POWER\n
          **Unit System:** SI\n
          **Numerator:** 123\n
          **Denominator:** 456\n
          [!IndentEnd]\n`);
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write units with numerator and denominator displayed, numerator is 1", () => {
          // Act
          const schemaItem = "UnitE";
          const unit = testSchema.getItemSync(schemaItem) as Unit;
          ECJsonMarkdownGenerator.writeUnitClass(outputFilePath, unit, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **UnitE** (label) [!badge text="Unit" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Unit&id=${testSchema.name}.${schemaItem})\n
          [!IndentStart]

          **Definition:** CM(2)\n
          **Phenomenon:** POWER\n
          **Unit System:** SI\n
          **Numerator:** 1\n
          **Denominator:** 4\n
          [!IndentEnd]\n`);
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should properly write inverted Unit", () => {
          // Act
          const schemaItem = "InvUnitF";
          const invertedUnit = testSchema.getItemSync(schemaItem) as InvertedUnit;
          ECJsonMarkdownGenerator.writeInvertedUnit(outputFilePath, invertedUnit, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **InvUnitF** (inverts unit f) [!badge text="InvertedUnit" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=InvertedUnit&id=${testSchema.name}.${schemaItem})\n
          [!IndentStart]

          **Inverts Unit:** UnitF\n
          **Phenomenon:** POWER_RATIO\n
          **Unit System:** STATISTICS\n
          [!IndentEnd]\n`);
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writePhenomenon", () => {
        const outputFilePath = path.join(outputDir, "PhenomenonTest.md");

        const schemaJson = {
          $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
          alias: "testSchema",
          name: "testSchema",
          version: "02.00.00",
          items: {
            PhenomenonA: {
              schemaItemType: "Phenomenon",
              definition: "This is a phenomenon test case.",
            },
          },
        };
        const context = new SchemaContext();
        const testSchema = Schema.fromJsonSync(schemaJson, context);

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should properly write the phenomenon with name, type, and definition", () => {
          // Act
          const schemaItem = "PhenomenonA";
          const phenomenon = testSchema.getItemSync(schemaItem) as Phenomenon;
          ECJsonMarkdownGenerator.writePhenomenonClass(outputFilePath, phenomenon, testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **PhenomenonA** [!badge text="Phenomenon" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Phenomenon&id=${testSchema.name}.${schemaItem})\n
          [!IndentStart]

          **Definition:** This is a phenomenon test case.\n
          [!IndentEnd]\n`);
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("writeUnitSystem", () => {
        const outputFilePath = path.join(outputDir, "UnitSystemTest.md");

        const schemaJson = {
          $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
          alias: "testSchema",
          name: "testSchema",
          version: "02.00.00",
          items: {
            UnitSystemA: {
              schemaItemType: "UnitSystem",
            },
            UnitSystemB: {
              schemaItemType: "UnitSystem",
              description: "UnitSystem test with description.",
            },
          },
        };
        const context = new SchemaContext();
        const testSchema = Schema.fromJsonSync(schemaJson, context);

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        // Delete the output file after each test
        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("schould properly write UnitSystem with the schemaItemType", () => {
          // Act
          const schemaItem = "UnitSystemA";
          ECJsonMarkdownGenerator.writeUnitSystemClass(outputFilePath, testSchema.getItemSync(schemaItem), testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **UnitSystemA** [!badge text="UnitSystem" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=UnitSystem&id=${testSchema.name}.${schemaItem})\n
          [!IndentStart]

          [!IndentEnd]\n`);
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("schould properly write UnitSystem with schemaItemType and description", () => {
          // Act
          const schemaItem = "UnitSystemB";
          ECJsonMarkdownGenerator.writeUnitSystemClass(outputFilePath, testSchema.getItemSync(schemaItem), testSchema.name);

          // Assert
          const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **UnitSystemB** [!badge text="UnitSystem" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=UnitSystem&id=${testSchema.name}.${schemaItem})\n
          [!IndentStart]

           UnitSystem test with description.\n
          [!IndentEnd]\n`);
          assert.equal(outputLines.length, correctLines.length);
          correctLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("Inherited properties", () => {
        const outputDir = path.join(".", "test", "temp");
        const schemaJson = {
          $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
          alias: "testSchema",
          name: "testSchema",
          version: "02.00.00",
          items: {
            UnitSystemA: {
              schemaItemType: "UnitSystem",
            },
            UnitSystemB: {
              schemaItemType: "UnitSystem",
              description: "UnitSystem test with description.",
            },
            EntityA : {
              schemaItemType : "EntityClass",
            },
            EntityB : {
              schemaItemType : "EntityClass",
            },
            EntityC : {
              baseClass : "testSchema.EntityWithProps",
              schemaItemType : "EntityClass",
            },
            EntityWithProps : {
              schemaItemType : "EntityClass",
              properties :
              [
                {
                  description: "description one",
                  name: "NameOne",
                  type: "PrimitiveProperty",
                  typeName: "string",
                },
                {
                  extendedTypeName: "Json",
                  name: "NameTwo",
                  type: "PrimitiveProperty",
                  typeName: "string",
                },
              ],
            },
            StructItem : {
              modifier : "sealed",
              description  : "this is a description",
              label : "StructLabel",
              baseClass : "testSchema.EntityWithProps",
              schemaItemType : "StructClass",
              properties :
              [
                {
                  description: "struct prop one",
                  name: "structPropOne",
                  type: "PrimitiveProperty",
                  typeName: "string",
                },
              ],
            },
            PlainMixin : {
              appliesTo : "testSchema.EntityA",
              baseClass : "testSchema.StructItem",
              schemaItemType : "Mixin",
            },
            MixinWithBaseclass : {
              appliesTo : "testSchema.EntityA",
              baseClass : "testSchema.EntityB",
              schemaItemType : "Mixin",
            },
            CACWithBaseClass : {
              appliesTo : "AnyProperty",
              description : "this is a description",
              baseClass : "testSchema.PlainMixin",
              modifier : "sealed",
              schemaItemType : "CustomAttributeClass",
            },
          },
        };

        describe("correctly write classes with inherited properties", () => {
          it("should correctly write struct class with inherited properties", () => {
            const outputPath = path.join(outputDir, "structClassTest.md");

            const context = new SchemaContext();
            const testSchema = Schema.fromJsonSync(schemaJson, context);
            const schemaItem = "StructItem";

            const struct = testSchema.getItemSync(schemaItem) as StructClass;
            ECJsonMarkdownGenerator.writeStructClass(outputPath, struct, testSchema.name);

            const outputLines = fs.readFileSync(outputPath).toString().split("\n");
            const correctLines = outputLiteralToArray(`
            ### **StructItem** (StructLabel) *Sealed* [!badge text="StructClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=StructClass&id=${testSchema.name}.${schemaItem})
  
            [!IndentStart]

            this is a description

            **Base Class:** [testSchema:EntityWithProps](./testschema.ecschema.md#entitywithprops)

            #### Properties

            |      Name    |  Description  |    Label    |  Category  |    Read Only     |    Priority    |
            |:-----------|:--------------|:------------|:-----------|:-----------------|:---------------|
            |structPropOne|struct prop one|||false|0|

            <details>
            <summary>Inherited properties</summary>

            |    Name    |    Description    |    Type    |      Extended Type     |
            |:-----------|:------------------|:-----------|:-----------------------|
            |NameOne|description one|string||
            |NameTwo||string|Json|
            </details>

            [!IndentEnd]\n`);

            assert.equal(outputLines.length, correctLines.length);
            outputLines.map((line, i) => {
              assert.equal(outputLines[i], line);
            });
          });

          it("should correctly write entityClass with inherited properties", () => {
            const outputPath = path.join(outputDir, "entityClassInheritedTest.md");

            const context = new SchemaContext();
            const testSchema = Schema.fromJsonSync(schemaJson, context);
            const schemaItem = "EntityC";

            const entity = testSchema.getItemSync(schemaItem) as EntityClass;
            ECJsonMarkdownGenerator.writeEntityClass(outputPath, entity, testSchema.name);

            const outputLines = fs.readFileSync(outputPath).toString().split("\n");
            const correctLines = outputLiteralToArray(`
              ### **EntityC** [!badge text="EntityClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=EntityClass&id=${testSchema.name}.${schemaItem})

              [!IndentStart]

              **Base Class:** [testSchema:EntityWithProps](./testschema.ecschema.md#entitywithprops)

              <details>
              <summary>Inherited properties</summary>

              |    Name    |    Description    |    Type    |      Extended Type     |
              |:-----------|:------------------|:-----------|:-----------------------|
              |NameOne|description one|string||
              |NameTwo||string|Json|
              </details>

              [!IndentEnd]
              `);

            assert.equal(outputLines.length, correctLines.length);
            outputLines.map((line, i) => {
              assert.equal(outputLines[i], line);
            });
          });

          it("should correctly write mixin with inherited properties", () => {
            const outputPath = path.join(outputDir, "mixinClassTest.md");

            const context = new SchemaContext();
            const testSchema = Schema.fromJsonSync(schemaJson, context);

            const mixin = testSchema.getItemSync("PlainMixin") as Mixin;
            ECJsonMarkdownGenerator.writeMixinClass(outputPath, mixin, testSchema.name);

            const outputLines = fs.readFileSync(outputPath).toString().split("\n");
            const correctLines = outputLiteralToArray(`    
            ### **PlainMixin** *Abstract* [!badge text="Mixin" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Mixin&id=${testSchema.name}.PlainMixin)

            [!IndentStart]

            **Base Class:** [testSchema:StructItem](./testschema.ecschema.md#structitem)

            **Applies To:** [EntityA](./testschema.ecschema.md#entitya)

            <details>
            <summary>Inherited properties</summary>

            |    Name    |    Description    |    Type    |      Extended Type     |
            |:-----------|:------------------|:-----------|:-----------------------|
            |NameOne|description one|string||
            |NameTwo||string|Json|
            |structPropOne|struct prop one|string||
            </details>

            [!IndentEnd]
            `);

            assert.equal(outputLines.length, correctLines.length);
            outputLines.map((line, i) => {
              assert.equal(outputLines[i], line);
            });
          });

          it("should correctly write customAttribute class with inherited properties", () => {
            const outputPath = path.join(outputDir, "customAttributeInheritTest.md");

            const context = new SchemaContext();
            const testSchema = Schema.fromJsonSync(schemaJson, context);
            const schemaItem = "CACWithBaseClass";

            const customAttribute = testSchema.getItemSync(schemaItem) as CustomAttributeClass;
            ECJsonMarkdownGenerator.writeCustomAttributeClass(outputPath, customAttribute, testSchema.name);

            const outputLines = fs.readFileSync(outputPath).toString().split("\n");
            const correctLines = outputLiteralToArray(`
             ### **CACWithBaseClass** *Sealed* [!badge text="CustomAttributeClass" kind="info"] [<img src="${iconPath}">](${baseUrl}elementtype=Mixin&id=${testSchema.name}.${schemaItem})

             [!IndentStart]

             this is a description

             **Base Class:** [testSchema:PlainMixin](./testschema.ecschema.md#plainmixin)

             **Applies to:** AnyProperty

             <details>
             <summary>Inherited properties</summary>

             |    Name    |    Description    |    Type    |      Extended Type     |
             |:-----------|:------------------|:-----------|:-----------------------|
             |NameOne|description one|string||
             |NameTwo||string|Json|
             |structPropOne|struct prop one|string||
             </details>

             [!IndentEnd]
            `);

            assert.equal(outputLines.length, correctLines.length);
            outputLines.map((line, i) => {
              assert.equal(outputLines[i], line);
            });
          });
        });

        it("should not write inherited properties table when there is no baseClass", () => {
          const outputPath = path.join(outputDir, "nobaseTest.md");

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);

          const entity = testSchema.getItemSync("EntityA") as EntityClass;
          ECJsonMarkdownGenerator.writeEntityClass(outputPath, entity, testSchema.name);

          const outputLines = fs.readFileSync(outputPath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **EntityA** [!badge text="EntityClass" kind="info"]

          [!IndentStart]

          [!IndentEnd]
          `);

          assert.equal(outputLines.length, correctLines.length);
          outputLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });

        it("should not write inherited properties table when baseClass does not have any properties", () => {
          const outputPath = path.join(outputDir, "noPropertiesBaseTest.md");

          const context = new SchemaContext();
          const testSchema = Schema.fromJsonSync(schemaJson, context);

          const mixin = testSchema.getItemSync("MixinWithBaseclass") as Mixin;
          ECJsonMarkdownGenerator.writeMixinClass(outputPath, mixin, testSchema.name);

          const outputLines = fs.readFileSync(outputPath).toString().split("\n");
          const correctLines = outputLiteralToArray(`
          ### **MixinWithBaseclass** *Abstract* [!badge text="Mixin" kind="info"]

          [!IndentStart]

          **Base Class:** [testSchema:EntityB](./testschema.ecschema.md#entityb)

          **Applies To:** [testSchema:EntityA](./testschema.ecschema.md#entitya)

          [!IndentEnd]\n`);

          assert.equal(outputLines.length, correctLines.length);
          outputLines.map((line, i) => {
            assert.equal(outputLines[i], line);
          });
        });
      });

      describe("Misc", () => {
        describe("getSortedSchemaItems", () => {
          const schemaJson = {
            $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
            description: "This is the description",
            alias: "testSchema",
            name: "testSchema",
            version: "02.00.00",
            items: {
              UnitA: {
                schemaItemType: "Unit",
                name: "A",
                phenomenon: "testSchema.Phenomenon",
                unitSystem: "testSchema.UnitSys",
                definition: "",
              },
              Phenomenon: {
                schemaItemType: "Phenomenon",
                name: "Phenom",
                label: "Phenomenon",
                definition: "",
              },
              UnitSys: {
                schemaItemType: "UnitSystem",
                name: "UnitSys",
                label: "Test Unit System",
                description: "Test Unit System",
              },
              EntityClassB: {
                description: "this is a description",
                schemaItemType: "EntityClass",
              },
              EntityClassC: {
                schemaItemType: "EntityClass",
              },
              EntityClassA: {
                schemaItemType: "EntityClass",
              },
              CustomAttributeClassB: {
                schemaItemType: "CustomAttributeClass",
                appliesTo : "AnyProperty",
              },
              CustomAttributeClassC: {
                schemaItemType: "CustomAttributeClass",
                appliesTo : "AnyProperty",
              },
              CustomAttributeClassA: {
                schemaItemType: "CustomAttributeClass",
                appliesTo : "AnyProperty",
              },
              EnumerationB: {
                type : "int",
                schemaItemType: "Enumeration",
                isStrict : true,
                enumerators : [],
              },
              EnumerationC: {
                type : "int",
                schemaItemType: "Enumeration",
                isStrict : true,
                enumerators : [],
              },
              EnumerationA: {
                type : "int",
                schemaItemType: "Enumeration",
                isStrict : true,
                enumerators : [],
              },
              KindOfQuantityB: {
                schemaItemType: "KindOfQuantity",
                relativeError : 0.0,
                persistenceUnit : "testSchema.UnitA",
              },
              KindOfQuantityC: {
                schemaItemType: "KindOfQuantity",
                relativeError : 0.0,
                persistenceUnit : "testSchema.UnitA",
              },
              KindOfQuantityA: {
                schemaItemType: "KindOfQuantity",
                relativeError : 0.0,
                persistenceUnit : "testSchema.UnitA",
              },
              RelationshipClassB: {
                strength : "embedding",
                strengthDirection : "forward",
                source : {
                  constraintClasses : [ "testSchema.EntityClassA" ],
                  multiplicity : "(0..1)",
                  polymorphic : true,
                  roleLabel : "owns",
                },
                target : {
                  constraintClasses : [ "testSchema.EntityClassB" ],
                  multiplicity : "(0..*)",
                  polymorphic : false,
                  roleLabel : "is owned by",
                },
                schemaItemType: "RelationshipClass",
              },
              RelationshipClassC: {
                strength : "embedding",
                strengthDirection : "forward",
                source : {
                  constraintClasses : [ "testSchema.EntityClassA" ],
                  multiplicity : "(0..1)",
                  polymorphic : true,
                  roleLabel : "owns",
                },
                target : {
                  constraintClasses : [ "testSchema.EntityClassB" ],
                  multiplicity : "(0..*)",
                  polymorphic : false,
                  roleLabel : "is owned by",
                },
                schemaItemType: "RelationshipClass",
              },
              RelationshipClassA: {
                strength : "embedding",
                strengthDirection : "forward",
                source : {
                  constraintClasses : [ "testSchema.EntityClassA" ],
                  multiplicity : "(0..1)",
                  polymorphic : true,
                  roleLabel : "owns",
                },
                target : {
                  constraintClasses : [ "testSchema.EntityClassB" ],
                  multiplicity : "(0..*)",
                  polymorphic : false,
                  roleLabel : "is owned by",
                },
                schemaItemType: "RelationshipClass",
              },
              MixinB: {
                schemaItemType: "Mixin",
                appliesTo : "testSchema.EntityClassB",
              },
              MixinC: {
                schemaItemType: "Mixin",
                appliesTo : "testSchema.EntityClassC",
              },
              MixinA: {
                schemaItemType: "Mixin",
                appliesTo : "testSchema.EntityClassA",
              },
              PropertyCategoryB: {
                schemaItemType: "PropertyCategory",
              },
              PropertyCategoryC: {
                schemaItemType: "PropertyCategory",
              },
              PropertyCategoryA: {
                schemaItemType: "PropertyCategory",
              },
            },
          };

          let testSchema: Schema;

          before(() => {
            // Load up the schema
            const context = new SchemaContext();
            testSchema = Schema.fromJsonSync(schemaJson, context);
          });

          it("should return the sorted EntityClasses", () => {
            const sortedItems = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, SchemaItemType.EntityClass);
            const expectedItems = ["EntityClassA", "EntityClassB", "EntityClassC"];

            assert.equal(sortedItems.length, expectedItems.length);
            expectedItems.map((line, i) => {
              assert.equal(line, sortedItems[i].name);
            });
          });

          it("should return the sorted CustomAttributeClasses", () => {
            const sortedItems = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, SchemaItemType.CustomAttributeClass);
            const expectedItems = ["CustomAttributeClassA", "CustomAttributeClassB", "CustomAttributeClassC"];

            assert.equal(sortedItems.length, expectedItems.length);
            expectedItems.map((line, i) => {
              assert.equal(line, sortedItems[i].name);
            });
          });

          it("should return the sorted Enumerations", () => {
            const sortedItems = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, SchemaItemType.Enumeration);
            const expectedItems = ["EnumerationA", "EnumerationB", "EnumerationC"];

            assert.equal(sortedItems.length, expectedItems.length);
            expectedItems.map((line, i) => {
              assert.equal(line, sortedItems[i].name);
            });
          });

          it("should return the sorted KindOfQuantities", () => {
            const sortedItems = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, SchemaItemType.KindOfQuantity);
            const expectedItems = ["KindOfQuantityA", "KindOfQuantityB", "KindOfQuantityC"];

            assert.equal(sortedItems.length, expectedItems.length);
            expectedItems.map((line, i) => {
              assert.equal(line, sortedItems[i].name);
            });
          });

          it("should return the sorted RelationshipClasses", () => {
            const sortedItems = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, SchemaItemType.RelationshipClass);
            const expectedItems = ["RelationshipClassA", "RelationshipClassB", "RelationshipClassC"];

            assert.equal(sortedItems.length, expectedItems.length);
            expectedItems.map((line, i) => {
              assert.equal(line, sortedItems[i].name);
            });
          });

          it("should return the sorted Mixins", () => {
            const sortedItems = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, SchemaItemType.Mixin);
            const expectedItems = ["MixinA", "MixinB", "MixinC"];

            assert.equal(sortedItems.length, expectedItems.length);
            expectedItems.map((line, i) => {
              assert.equal(line, sortedItems[i].name);
            });
          });

          it("should return the sorted list of property categories", () => {
            const sortedItems = ECJsonMarkdownGenerator.getSortedSchemaItems(testSchema, SchemaItemType.PropertyCategory);
            const expectedItems = ["PropertyCategoryA", "PropertyCategoryB", "PropertyCategoryC"];

            assert.equal(sortedItems.length, expectedItems.length);
            expectedItems.map((line, i) => {
              assert.equal(line, sortedItems[i].name);
            });
          });
        });

        describe("formatLink", () => {
          it("should correctly format a link for bemetalsmith", () => {
            const link = formatLink("https://www.google.com", "Google");
            assert.equal(link, "[Google](https://www.google.com)");
          });
        });

        describe("formatWarningAlert", () => {
          it("should properly format a warning alert for bemetalsmith", () => {
            const warning = formatWarningAlert("This is a warning");
            assert.equal(warning, '[!alert text="This is a warning" kind="warning"]');
          });
        });

        describe("propertyTypeNumberToString", () => {
          it("should return the correct type for each number", () => {
            assert.equal(propertyTypeNumberToString(PropertyType.Struct), "struct");
            assert.equal(propertyTypeNumberToString(PropertyType.Struct_Array), "struct array");
            assert.equal(propertyTypeNumberToString(PropertyType.Navigation), "navigation");
            assert.equal(propertyTypeNumberToString(PropertyType.Binary), "binary");
            assert.equal(propertyTypeNumberToString(PropertyType.Binary_Array), "binary array");
            assert.equal(propertyTypeNumberToString(PropertyType.Boolean), "boolean");
            assert.equal(propertyTypeNumberToString(PropertyType.Boolean_Array), "boolean array");
            assert.equal(propertyTypeNumberToString(PropertyType.DateTime), "dateTime");
            assert.equal(propertyTypeNumberToString(PropertyType.DateTime_Array), "dateTime array");
            assert.equal(propertyTypeNumberToString(PropertyType.Double), "double");
            assert.equal(propertyTypeNumberToString(PropertyType.Double_Array), "double array");
            assert.equal(propertyTypeNumberToString(PropertyType.Integer), "int");
            assert.equal(propertyTypeNumberToString(PropertyType.Integer_Array), "int array");
            assert.equal(propertyTypeNumberToString(PropertyType.Integer_Enumeration), "int enum");
            assert.equal(propertyTypeNumberToString(PropertyType.Integer_Enumeration_Array), "int enum array");
            assert.equal(propertyTypeNumberToString(PropertyType.Long), "long");
            assert.equal(propertyTypeNumberToString(PropertyType.Long_Array), "long array");
            assert.equal(propertyTypeNumberToString(PropertyType.Point2d), "point2d");
            assert.equal(propertyTypeNumberToString(PropertyType.Point2d_Array), "point2d array");
            assert.equal(propertyTypeNumberToString(PropertyType.Point3d), "point3d");
            assert.equal(propertyTypeNumberToString(PropertyType.Point3d_Array), "point3d array");
            assert.equal(propertyTypeNumberToString(PropertyType.String), "string");
            assert.equal(propertyTypeNumberToString(PropertyType.String_Array), "string array");
            assert.equal(propertyTypeNumberToString(PropertyType.String_Enumeration), "string enum");
            assert.equal(propertyTypeNumberToString(PropertyType.String_Enumeration_Array), "string enum array");
            assert.equal(propertyTypeNumberToString(PropertyType.IGeometry), "IGeometry");
            assert.equal(propertyTypeNumberToString(PropertyType.IGeometry_Array), "IGeometry array");
          });

          it ("should correctly convert schemaItemType to group name", () => {
            assert.equal(schemaItemToGroupName(SchemaItemType.EntityClass), "Entity Classes");
            assert.equal(schemaItemToGroupName(SchemaItemType.Constant), "Constants");
            assert.equal(schemaItemToGroupName(SchemaItemType.CustomAttributeClass), "Custom Attribute Classes");
            assert.equal(schemaItemToGroupName(SchemaItemType.Enumeration), "Enumerations");
            assert.equal(schemaItemToGroupName(SchemaItemType.Format), "Formats");
            assert.equal(schemaItemToGroupName(SchemaItemType.InvertedUnit), "Inverted Units");
            assert.equal(schemaItemToGroupName(SchemaItemType.KindOfQuantity), "Kind Of Quantities");
            assert.equal(schemaItemToGroupName(SchemaItemType.Mixin), "Mixins");
            assert.equal(schemaItemToGroupName(SchemaItemType.Phenomenon), "Phenomena");
            assert.equal(schemaItemToGroupName(SchemaItemType.PropertyCategory), "Property Categories");
            assert.equal(schemaItemToGroupName(SchemaItemType.RelationshipClass), "Relationship Classes");
            assert.equal(schemaItemToGroupName(SchemaItemType.StructClass), "Struct Classes");
            assert.equal(schemaItemToGroupName(SchemaItemType.Unit), "Units");
            assert.equal(schemaItemToGroupName(SchemaItemType.UnitSystem), "Unit Systems");
          });
        });

        describe("remarks.md generation", () => {
          const inputFileDir = path.join(".", "test", "Assets", "dir");
          let testRemarksGenerator: ECJsonMarkdownGenerator;
          let outputFilePath: string;
          const newlineRegex = /(?:\r\n|\r|\n)/g;

          // Delete the output file before each test
          beforeEach(() => {
            if (fs.existsSync(outputFilePath))
              fs.unlinkSync(outputFilePath);
            testRemarksGenerator = new ECJsonMarkdownGenerator([inputFileDir]);
          });

          // Delete the output file after each test
          afterEach(() => {
            if (fs.existsSync(outputFilePath))
              fs.unlinkSync(outputFilePath);
          });

          it("should properly generate a remarks file for the BisCore schema", () => {
            // Arrange
            const inputFileName = "BisCore";
            const inputFilePath = path.join(inputFileDir, inputFileName + ".ecschema.json");
            const correctFilePath = path.join(inputFileDir, inputFileName + ".remarks.md");

            outputFilePath = path.join(outputDir, inputFileName + ".remarks.md");

            // Act
            testRemarksGenerator.genRemarks(inputFilePath, outputFilePath);

            // Assert
            const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
            const correctLines = fs.readFileSync(correctFilePath).toString().split(newlineRegex);
            assert.equal(outputLines.length, correctLines.length);
            correctLines.map((line, i) => {
              assert.equal(outputLines[i], line);
            });
          });

          it("should properly generate a remarks file for the Grids schema", () => {
            // Arrange
            const inputFileName = "Grids";
            const inputFilePath = path.join(inputFileDir, inputFileName + ".ecschema.json");
            const correctFilePath = path.join(inputFileDir, inputFileName + ".remarks.md");

            outputFilePath = path.join(outputDir, inputFileName + ".remarks.md");

            // Act
            testRemarksGenerator.genRemarks(inputFilePath, outputFilePath);

            // Assert
            const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
            const correctLines = fs.readFileSync(correctFilePath).toString().split(newlineRegex);
            assert.equal(outputLines.length, correctLines.length);
            correctLines.map((line, i) => {
              assert.equal(outputLines[i], line);
            });
          });
        });

        describe("integration tests", () => {
          const inputFileDir = path.join(".", "test", "Assets", "dir");
          let testMDGenerator: ECJsonMarkdownGenerator;
          let outputFilePath: string;
          const newlineRegex = /(?:\r\n|\r|\n)/g; // remove carriage returns as well to prevent tests failing

          // Delete the output file before each test
          beforeEach(() => {
            if (fs.existsSync(outputFilePath))
              fs.unlinkSync(outputFilePath);
            testMDGenerator = new ECJsonMarkdownGenerator([inputFileDir]);
          });

          // Delete the output file after each test
          afterEach(() => {
            if (fs.existsSync(outputFilePath))
              fs.unlinkSync(outputFilePath);
          });

          it("should properly generate markdown for BisCore", async () => {
            // Arrange
            const inputFileName = "BisCore.ecschema";
            const inputFilePath = path.join(inputFileDir, inputFileName + ".json");
            const correctFilePath = path.join(inputFileDir, inputFileName + ".md");

            outputFilePath = path.join(outputDir, inputFileName + ".md");

            // Act
            await testMDGenerator.generate(inputFilePath, outputFilePath);

            // Assert
            const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
            const correctLines = fs.readFileSync(correctFilePath).toString().split(newlineRegex);
            assert.equal(outputLines.length, correctLines.length);
            correctLines.map((line, i) => {
              assert.equal(outputLines[i], line);
            });
          });

          it("should properly generate markdown for BisCore (XML verison)", async () => {
            // Arrange
            const inputFileName = "BisCore.ecschema";
            const inputFilePath = path.join(inputFileDir, inputFileName + ".xml");
            const correctFilePath = path.join(inputFileDir, inputFileName + ".md");

            outputFilePath = path.join(outputDir, inputFileName + ".md");

            // Act
            await testMDGenerator.generate(inputFilePath, outputFilePath);

            // Assert
            const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
            const correctLines = fs.readFileSync(correctFilePath).toString().split(newlineRegex);
            assert.equal(outputLines.length, correctLines.length);
            correctLines.map((line, i) => {
              assert.equal(outputLines[i], line);
            });
          });

          it("should properly generate markdown for AecUnits", async () => {
            // Arrange
            const inputFileName = "AecUnits.ecschema";
            const inputFilePath = path.join(inputFileDir, inputFileName + ".json");
            const correctFilePath = path.join(inputFileDir, inputFileName + ".md");

            outputFilePath = path.join(outputDir, inputFileName + ".md");

            // Act
            await testMDGenerator.generate(inputFilePath, outputFilePath);

            // Assert
            const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
            const correctLines = fs.readFileSync(correctFilePath).toString().split(newlineRegex);
            assert.equal(outputLines.length, correctLines.length);
            correctLines.map((line, i) => {
              expect(outputLines[i]).eq(line);
            });
          });

          it("should properly generate markdown for AecUnits (XML version)", async () => {
            // Arrange
            const inputFileName = "AecUnits.ecschema";
            const inputFilePath = path.join(inputFileDir, inputFileName + ".xml");
            const correctFilePath = path.join(inputFileDir, inputFileName + ".md");

            outputFilePath = path.join(outputDir, inputFileName + ".md");

            // Act
            await testMDGenerator.generate(inputFilePath, outputFilePath);

            // Assert
            const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
            const correctLines = fs.readFileSync(correctFilePath).toString().split(newlineRegex);
            assert.equal(outputLines.length, correctLines.length);
            correctLines.map((line, i) => {
              expect(outputLines[i]).eq(line);
            });
          });

          it("should properly generate markdown for CoreCustomAttributes", async () => {
            // Arrange
            const inputFileName = "CoreCustomAttributes.ecschema";
            const inputFilePath = path.join(inputFileDir, inputFileName + ".json");
            const correctFilePath = path.join(inputFileDir, inputFileName + ".md");

            outputFilePath = path.join(outputDir, inputFileName + ".md");

            // Act
            await testMDGenerator.generate(inputFilePath, outputFilePath);

            // Assert
            const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
            const correctLines = fs.readFileSync(correctFilePath).toString().split(newlineRegex);
            assert.equal(outputLines.length, correctLines.length);
            correctLines.map((line, i) => {
              assert.equal(outputLines[i], line);
            });
          });

          it("should properly generate markdown for Grids", async () => {
            // Arrange
            const inputFileName = "Grids.ecschema";
            const inputFilePath = path.join(inputFileDir, inputFileName + ".json");
            const correctFilePath = path.join(inputFileDir, inputFileName + ".md");

            outputFilePath = path.join(outputDir, inputFileName + ".md");

            // Act
            await testMDGenerator.generate(inputFilePath, outputFilePath);

            // Assert
            const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
            const correctLines = fs.readFileSync(correctFilePath).toString().split(newlineRegex);
            assert.equal(outputLines.length, correctLines.length);
            correctLines.map((line, i) => {
              assert.equal(outputLines[i], line);
            });
          });

          it("should properly generate markdown for Formats", async () => {
            // Arrange
            const inputFileName = "Formats.ecschema";
            const inputFilePath = path.join(inputFileDir, inputFileName + ".json");
            const correctFilePath = path.join(inputFileDir, inputFileName + ".md");

            outputFilePath = path.join(outputDir, inputFileName + ".md");

            // Act
            await testMDGenerator.generate(inputFilePath, outputFilePath);

            // Assert
            const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
            const correctLines = fs.readFileSync(correctFilePath).toString().split(newlineRegex);
            assert.equal(outputLines.length, correctLines.length);
            correctLines.map((line, i) => {
              assert.equal(outputLines[i], line);
            });
          });

          it("should properly generate markdown for Units", async () => {
            // Arrange
            const inputFileName = "Units.ecschema";
            const inputFilePath = path.join(inputFileDir, inputFileName + ".json");
            const correctFilePath = path.join(inputFileDir, inputFileName + ".md");

            outputFilePath = path.join(outputDir, inputFileName + ".md");

            // Act
            await testMDGenerator.generate(inputFilePath, outputFilePath);

            // Assert
            const outputLines = fs.readFileSync(outputFilePath).toString().split("\n");
            const correctLines = fs.readFileSync(correctFilePath).toString().split(newlineRegex);
            assert.equal(outputLines.length, correctLines.length);
            correctLines.map((line, i) => {
              assert.equal(outputLines[i], line);
            });
          });
        });
      });
    });

    describe("others", () => {
      describe("removeBlankLines", () => {
        const outputFilePath = path.join(".", "test", "_temp_remove_line_.txt");

        beforeEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        afterEach(() => {
          if (fs.existsSync(outputFilePath))
            fs.unlinkSync(outputFilePath);
        });

        it("should remove blank lines at the end of file", () => {
          // Arrange
          const inputFilePath = path.join(".", "test", "Assets", "file_with_blank_lines.txt");

          // Act
          removeExtraBlankLines(inputFilePath, outputFilePath);

          // Assert
          const outputBuffer = fs.readFileSync(outputFilePath).toString();
          const correctBuffer = "test";
          assert.equal(outputBuffer, correctBuffer);
        });

        it("shouldn't do anything to a file with no blank lines", () => {
          // Arrange
          const inputFilePath = path.join(".", "test", "Assets", "file_with_no_blank_line.txt");

          // Act
          removeExtraBlankLines(inputFilePath, outputFilePath);

          // Assert
          const outputBuffer = fs.readFileSync(outputFilePath).toString();
          const correctBuffer = "test";
          assert.equal(outputBuffer, correctBuffer);
        });
      });
    });
  });
});

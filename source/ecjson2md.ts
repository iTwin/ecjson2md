/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
import * as fs from "fs";
import { SchemaContext, SchemaJsonFileLocater, Schema, ECClass, schemaItemTypeToString, RelationshipClass, primitiveTypeToString } from "@bentley/ecjs";
import { ECJsonFileNotFound, ECJsonBadJson, ECJsonBadSearchPath, ECJsonBadOutputPath } from "./Exception";

export class ECJsonMarkdownGenerator {
  private context: SchemaContext;
  public searchDirs: string[];

  constructor(searchDirs: string[]) {
    //  Check that all the search paths exist
    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) throw new ECJsonBadSearchPath(dir);
    }

    // Add the provided directories to the locator as search paths
    const locator = new SchemaJsonFileLocater();

    locator.addSchemaSearchPaths(searchDirs);
    this.searchDirs = searchDirs;

    // Add the locator to the context
    this.context = new SchemaContext();
    this.context.addLocater(locator);
  }

  /**
   * @returns the context for testing purposes
   */
  public getContext() {
    return this.context;
  }

  /**
   * Writes the name of the schema to the md file at the outputfile.
   * @param schema Schema to grab the name from
   * @param outputMDFile The path of the markdown file to write to
   */
  private writeName(outputMDFile: any, schema: Schema) {
    fs.writeFileSync(outputMDFile, "# " + schema.name + "\n\n");
    if (schema.description !== undefined) fs.appendFileSync(outputMDFile, schema.description + "\n\n");
    fs.appendFileSync(outputMDFile, "## Overview:\n\n");
  }

/** Returns an array of ecschema classes sorted based on name
 * @param schema Schema that contains the classes to be sorted
 */
  private getSortedClasses(schema: Schema): ECClass[] {
    return schema.getClasses().sort((c1, c2) => {
      if (c1.name > c2.name) return 1;
      else if (c1.name < c2.name) return -1;
      else return 0;
    });
  }

  /**
   * Writes the details of a relationship class as markdown.
   * @param ouputMDFile MarkdownFile to write to
   * @param relClass Relationship class to pull information from
   */
  private async writeRelationshipClass(outputMDFile: any, relClass: RelationshipClass) {
    const sourceCoClasses = relClass.source.constraintClasses;
    const targetCoClasses = relClass.target.constraintClasses;

    // Collect source constraint classes
    let sourceCoClassList: string = "";

    if (sourceCoClasses !== undefined) {
      for (const constraintClass of sourceCoClasses) {
        // If the current class is the last one, don't append a comma
        if (constraintClass === sourceCoClasses[sourceCoClasses.length - 1])
          sourceCoClassList += constraintClass.name;
        else sourceCoClassList += constraintClass.name + ", ";
      }
    }

    // Collect target constraint classes
    let targetCoClassList: string = "";

    if (targetCoClasses !== undefined) {
      for (const constraintClass of targetCoClasses) {
        // If the current class is the last one, don't append a comma
        if (constraintClass === targetCoClasses[targetCoClasses.length - 1])
          targetCoClassList +=  constraintClass.name;
        else targetCoClassList += constraintClass.name + ", ";
      }
    }

    // Write bold header
    fs.appendFileSync(outputMDFile, "**Relationship Class:**\n\n");

    // Write table
    fs.appendFileSync(outputMDFile,
      "|          |    ConstraintClasses    |            Multiplicity            |\n" +
      "|:---------|:------------------------|:-----------------------------------|\n" +
      "|**Source**|" + sourceCoClassList + "|" + relClass.source.multiplicity + "|\n" +
      "|**Target**|" + targetCoClassList + "|" + relClass.target.multiplicity + "|\n" +
      "|          |                         |                                    |\n\n");
  }

  /**
   * Writes the classes of the schema to the md file at the outputfile.
   * @param outputMDFile Markdown file to write to
   * @param schema Schema to grab the classes from
   */
  private async writeClasses(outputMDFile: any, schema: Schema) {
    for (const schemaClass of this.getSortedClasses(schema)) {
      // Write the name of the class
      fs.appendFileSync(outputMDFile, "## " + schemaClass.name + "\n\n");

      // Write the class description if it's given
      if (schemaClass.description !== undefined) fs.appendFileSync(outputMDFile, schemaClass.description + "\n\n");

      // Write the schema item type if it is given
      if (schemaClass.type !== undefined)
        fs.appendFileSync(outputMDFile, "**Class Type:** " + schemaItemTypeToString(schemaClass.type) + "\n\n");

      // Write the base class if it's given
      if (schemaClass.baseClass !== undefined) {
        await schemaClass.baseClass.then(async (result) => {
          fs.appendFileSync(outputMDFile, "**Base class:** " +  result.schema.name + ":" + result.name + "\n\n");
        });
      }

      // If the class is a relationship class, write the relationship information
      if (schemaItemTypeToString(schemaClass.type) === "RelationshipClass") await this.writeRelationshipClass(outputMDFile, schemaClass as RelationshipClass);

      // If the class has no properties, end here. If it does, write the column headers and call writeClassProperties()
      if (schemaClass.properties) await this.writeClassProperties(outputMDFile, schemaClass);
    }
  }

  /**
   * Writes the properties of the class to the md file at the outputfile.
   * @param outputMDFile Markdown file to write to
   * @param schemaClassProperties array of the properties=
   */
  private async writeClassProperties(outputMDFile: any, schemaClass: ECClass) {
    const schemaClassProperties = schemaClass.properties;
    const placeHolder = "";

    const helper = (( value: any ) => value !== undefined ? value : placeHolder);

    // If the class has no properties, return
    if (!schemaClassProperties) return;

    fs.appendFileSync(outputMDFile, "**Class Properties:**\n\n");
    fs.appendFileSync(outputMDFile,     "|    Name    |    Description    |    Type    |      Extended Type     |\n" +
                                        "|:-----------|:------------------|:-----------|:-----------------------|\n");

    for (const property of schemaClassProperties) {
      await property.then((result: any) => {
        // const type: string = result.constructor.name; // Gets the property type. Leaving it here for now in case req. changes

        let type: string | undefined;

        // Attempt to convert the type
        // TODO: Parse the custom typename instead of using the placeholder
        try {
          type = primitiveTypeToString(result._type);
        } catch (err) {
          try {
            type = result.enumeration._name._name;
          } catch (err) {
            type = placeHolder;
          }
        }

        const name = helper(result._name._name);
        const description = helper(result._description);
        const extendedTypeName = helper(result.extendedTypeName);

        fs.appendFileSync(outputMDFile, "|" + name + "|" + description + "|" + type + "|" + extendedTypeName + "|\n");
      });
    }

    fs.appendFileSync(outputMDFile,     "|            |                   |            |                        |\n\n");
    fs.appendFileSync(outputMDFile, "### Remarks:\n\n");
  }

  /**
   * Loads a schema and its references into memory and drives the
   * markdown generation
   * @param schemaPath path to SchemaJson to load
   * @param outputFilePath Path to the output file to write to
   */
  public generate(schemaPath: string, outputFilePath: string): Promise<any> {
    // If the schema file doesn't exist, throw an error
    if (!fs.existsSync(schemaPath)) throw new ECJsonFileNotFound(schemaPath);

    const schemaString = fs.readFileSync(schemaPath, "utf8");

    // If the file cannot be parsed, throw an error.
    let schemaJson: any;

    try {
      schemaJson = JSON.parse(schemaString);
    } catch (e) {
      throw new ECJsonBadJson(schemaPath);
    }

    // Get the path of the directory that will contain the output md file
    let outputDir: any = outputFilePath.split("/");
    outputDir.pop();
    outputDir = outputDir.join("/");

    // Check if the output directory exists
    if (!fs.existsSync(outputDir)) throw new ECJsonBadOutputPath(outputFilePath);

    return Schema.fromJson(schemaJson, this.context).then(
      async (result) => {
        await this.writeName(outputFilePath, result);
        await this.writeClasses(outputFilePath, result);
      });
      // .catch(() => {
      //   throw Error("Could not load ECSchema JSON file");
      // });
  }
}

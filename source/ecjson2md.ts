/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
import * as fs from "fs";
import { SchemaContext, SchemaJsonFileLocater, Schema, primitiveTypeToString } from "@bentley/ecjs";
import { ECJsonFileNotFound, ECJsonBadJson, ECJsonBadSearchPath, ECJsonBadOutputPath } from "./Exception";

export class ECJsonMarkdown {
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
   * @param outputFile The path of the file to write to
   */
  private writeName(schema: Schema, mdWriteStream: fs.WriteStream) {
    mdWriteStream.write("# " + schema.name + "\n");
    if (schema.description !== undefined) mdWriteStream.write("\n" + schema.description + "\n");
  }

  /**
   * Writes the classes of the schema to the md file at the outputfile.
   * @param schema Schema to grab the classes from
   * @param outputFile The path of the file to write to
   */
  private async writeClasses(schema: Schema, mdWriteStream: fs.WriteStream) {
    for (const schemaClass of schema.getClasses()) {
      // Write the name of the class
      mdWriteStream.write("\n## " + schemaClass.name + "\n\n");
      // Write the class description if it's given
      if (schemaClass.description !== undefined) mdWriteStream.write(schemaClass.description + "\n\n");
      // Write the column headings
      mdWriteStream.write("| Name " +
                                    // "| Defined in" +
                                    "| Description" +
                                    "| Type " +
                                    // "| Display Label " +
                                    // "| Base Property " +
                                    // "| Kind of Quantity " +
                                    // "| Array Bounds " +
                                    // "| Is Readonly " +
                                    "|\n");

      mdWriteStream.write("| :--- " +
                                    // "| :--------- " +
                                    "| :--------- " +
                                    "| :--- " +
                                    // "| :------------" +
                                    // "| :------------"  +
                                    // "| :---------------" +
                                    // "| :----------- " +
                                    // "| :---------- " +
                                    "|\n");
      // If the class has properties, write them using writeClassProperties()
      if (schemaClass.properties) await this.writeClassProperties(schemaClass.properties, mdWriteStream);
    }
  }

  private mdHelper(value: string|undefined) {
    const replacement = "";
    return value !== undefined ? value : replacement;
  }

  /**
   * Writes the properties of the class to the md file at the outputfile.
   * @param schemaClassProperties array of the properties
   * @param outputFile The path of the file to write to
   */
  private writeClassProperties(schemaClassProperties: any, mdWriteStream: fs.WriteStream) {
    if (!schemaClassProperties) return;
    for (const property of schemaClassProperties) {
      property.then((result: any) => {
        // Write the table row for the property
        mdWriteStream.write("|"
          + this.mdHelper(result._name._name) + "|"
//          + this.mdHelper(result._definedIn)  + "|"
          + this.mdHelper(result._description) + "|");
        let type: string;
        // Try to parse the property type
        try {
          type = primitiveTypeToString(result._type);
        } catch (err) {
          type = "";
        }
        mdWriteStream.write(type + "|"
//          + this.mdHelper(result._label) + "|"
//          + this.mdHelper(result._baseClass) + "|"
//          + this.mdHelper(result._kindOfQuantity) + "|"
//          + this.mdHelper(result._minLength) + " - " + this.mdHelper(result._maxLength) + "|"
//          + this.mdHelper(result._isReadOnly) + "|"
          + "\n");
      });
    }
  }

  /**
   * Loads a schema and its references into memory and drives the
   * markdown generation
   * @param schemaPath path to SchemaJson to load
   * @param outputFilePath Path to the output file to write to
   */
  public loadJsonSchema(schemaPath: string, outputFilePath: string): any {
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

    const mdWriteStream = fs.createWriteStream(outputFilePath);

    const schemaPromise = Schema.fromJson(schemaJson, this.context);

    schemaPromise.then(async (result) => {
      await this.writeName(result, mdWriteStream);
      await this.writeClasses(result, mdWriteStream);
      mdWriteStream.end();
    });
  }
}

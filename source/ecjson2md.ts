import * as fs from "fs";
import { SchemaContext, SchemaJsonFileLocater, Schema, primitiveTypeToString } from "@bentley/ecjs";

export class ECJsonMarkdown {
  private context: SchemaContext;

  constructor(searchDirs: string[]) {
    // Add the provided directories to the locator as search paths
    const locator = new SchemaJsonFileLocater();
    locator.addSchemaSearchPaths(searchDirs);

    // Add the locator to the context
    this.context = new SchemaContext();
    this.context.addLocater(locator);
  }

  /**
   * @returns the context for testing purposes
   */
  public getContext() { return this.context; }
  /**
   * Writes the name of the schema to the md file at the outputfile.
   * @param schema Schema to grab the name from
   * @param outputFile The path of the file to write to
   */
  private writeName(schema: Schema, outputFile: string) {
    fs.writeFileSync(outputFile, "# " + schema.name + "\n");
    if (schema.description !== undefined) fs.appendFileSync(outputFile, "\n" + schema.description + "\n");
  }

  /**
   * Writes the classes of the schema to the md file at the outputfile.
   * @param schema Schema to grab the classes from
   * @param outputFile The path of the file to write to
   */
  private async writeClasses(schema: Schema, outputFile: string) {
    for (const schemaClass of schema.getClasses()) {
      // Write the name of the class
      fs.appendFileSync(outputFile, "\n## " + schemaClass.name + "\n\n");
      // Write the class description if it's given
      if (schemaClass.description !== undefined) fs.appendFileSync(outputFile, schemaClass.description + "\n\n");
      // Write the column headings
      fs.appendFileSync(outputFile, "| Name " +
                                    // "| Defined in" +
                                    "| Description" +
                                    "| Type " +
                                    // "| Display Label " +
                                    // "| Base Property " +
                                    // "| Kind of Quantity " +
                                    // "| Array Bounds " +
                                    // "| Is Readonly " +
                                    "|\n");

      fs.appendFileSync(outputFile, "| :--- " +
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
      if (schemaClass.properties) await this.writeClassProperties(schemaClass.properties, outputFile);
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
  private writeClassProperties(schemaClassProperties: any, outputFile: string) {
    if (!schemaClassProperties) return;
    for (const property of schemaClassProperties) {
      property.then((result: any) => {
        // Write the table row for the property
        fs.appendFileSync(outputFile, "|"
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
        fs.appendFileSync(outputFile, type + "|"
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
   * @param schema SchemaJson to load
   * @param outputFile Path to the output file to write to
   */
  public loadJsonSchema(schema: string | object, outputFile: string): any {

    const schemaPromise = Schema.fromJson(schema, this.context);

    schemaPromise.then( async (result) => {
      this.writeName(result, outputFile);
      this.writeClasses(result, outputFile);
    });

  }
}

/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
import * as fs from "fs";
import { SchemaContext, SchemaJsonFileLocater, Schema, ECClass, schemaItemTypeToString, RelationshipClass, primitiveTypeToString } from "@bentley/ecjs";
import { ECJsonFileNotFound, ECJsonBadJson, ECJsonBadSearchPath, ECJsonBadOutputPath } from "./Exception";

const PLACE_HOLDER = "";

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
  private writeTitle(outputMDFile: any, schema: Schema) {
    // Write the name of the schema as an <h1>
    fs.appendFileSync(outputMDFile, "# " + schema.name + "\n\n");
    // Write the description of the schema as a <p>
    if (schema.description !== undefined) fs.appendFileSync(outputMDFile, schema.description + "\n\n");
    // Create an <h2> for "classes"
    fs.appendFileSync(outputMDFile, "## Classes:\n\n");
  }

  private writeFrontMatter(outputMDFile: any, schema: Schema) {
    fs.appendFileSync(outputMDFile, "---\n");
    fs.appendFileSync(outputMDFile, "Schema: " + schema.name + "\n");
    fs.appendFileSync(outputMDFile, "This file was automatically generated via ecjson2md. Do not edit this file. Any edits made to this file will be overwritten the next time it is generated\n");
    fs.appendFileSync(outputMDFile, "---\n\n");
  }
 /**
  * @returns an array of ecschema classes sorted based on name
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
   * @returns A string that contains a comma seperated list of contstraint classes
   * @param constraintClasses Target or source constraint classes
   */
  private collectConstraintClasses(constraintClasses: any): string {
    if (constraintClasses === undefined) return "";

    let constraintClassString: string = "";

    for (const constraintClass of constraintClasses) {
      // If the current class is the last one, don't append a comma
      if (constraintClass === constraintClasses[constraintClasses.length - 1])
        constraintClassString += constraintClass.name;
      else constraintClassString += constraintClass.name + ", ";
    }

    return constraintClassString;
  }

  /**
   * Writes the details of a relationship class as markdown.
   * @param ouputMDFile MarkdownFile to write to
   * @param relClass Relationship class to pull information from
   */
  private async writeRelationshipClass(outputMDFile: any, relClass: RelationshipClass) {
    // Format constraint class lists
    const sourceCoClasses = this.collectConstraintClasses(relClass.source.constraintClasses);
    const targetCoClasses = this.collectConstraintClasses(relClass.target.constraintClasses);

    // Write <strong> header
    fs.appendFileSync(outputMDFile, "**Relationship Class:**\n\n");

    // Write table
    fs.appendFileSync(outputMDFile,
      "|          |    ConstraintClasses    |            Multiplicity            |\n" +
      "|:---------|:------------------------|:-----------------------------------|\n" +
      "|**Source**|" +  sourceCoClasses  + "|" + relClass.source.multiplicity + "|\n" +
      "|**Target**|" +  targetCoClasses  + "|" + relClass.target.multiplicity + "|\n" +
      "|          |                         |                                    |\n\n");
  }

  public writeBaseClass(outputMDFile: string, baseClass: any) {
    if (baseClass !== undefined) {
      baseClass.then((result: any) => {
        fs.appendFileSync(outputMDFile, "**Base class:** " + "[link_to " + result.schema.name.toLowerCase() + ".ecschema" + "/#" +  result.name.toLowerCase()  + " text=\"" + result.schema.name + ":" + result.name + "\"]\n\n");
      });
    }
  }
  /**
   * Writes the classes of the schema to the md file at the outputfile.
   * @param outputMDFile Markdown file to write to
   * @param schema Schema to grab the classes from
   */
  private async writeClasses(outputMDFile: any, schema: Schema) {
    for (const schemaClass of this.getSortedClasses(schema)) {
      // Write the name of the class
      fs.appendFileSync(outputMDFile, "### " + schemaClass.name + "\n\n");

      // Write the class description if it's given
      if (schemaClass.description !== undefined) fs.appendFileSync(outputMDFile, schemaClass.description + "\n\n");

      // Write the schema item type if it is given
      if (schemaClass.type !== undefined)
        fs.appendFileSync(outputMDFile, "**Class Type:** " + schemaItemTypeToString(schemaClass.type) + "\n\n");

      // Write the base class if it's given
      await this.writeBaseClass(outputMDFile, schemaClass.baseClass);

      // If the class is a relationship class, write the relationship information
      if (schemaItemTypeToString(schemaClass.type) === "RelationshipClass") await this.writeRelationshipClass(outputMDFile, schemaClass as RelationshipClass);

      // If the class has no properties, end here. If it does, write the column headers and call writeClassProperties()
      if (schemaClass.properties) await this.writeClassProperties(outputMDFile, schemaClass);
    }
  }

  /**
   * @returns A string a of the property type
   * @param property The resolved property
   */
  private propertyTypeToString(property: any): string {
    try {
      return primitiveTypeToString(property._type);
    } catch (err) {
      try {
        return property.enumeration._name._name;
      } catch (err) {
        return PLACE_HOLDER;
      }
    }
  }

  /**
   * Write the markdown header for a class property table to the file specified
   * @param outputMDFile File to write to
   */
  private writePropertiesHeader(outputMDFile: string): void {
    fs.appendFileSync(outputMDFile, "**Class Properties:**\n\n");
    fs.appendFileSync(outputMDFile,     "|    Name    |    Description    |    Type    |      Extended Type     |\n" +
                                        "|:-----------|:------------------|:-----------|:-----------------------|\n");
  }

  /**
   * Writes the property attributes as a markdown row in the file specified
   * @param outputMDFile File to write to
   * @param property Property to generate the row from
   */
  private writeClassPropertiesRow(outputMDFile: string, property: any): void {
    // If the attribute is not there, return the place holder
    const helper = (( value: any ) => value !== undefined ? value : PLACE_HOLDER);

    const type = this.propertyTypeToString(property);
    const name = helper(property._name._name);
    const description = helper(property._description);
    const extendedTypeName = helper(property.extendedTypeName);

    fs.appendFileSync(outputMDFile, "|" + name + "|" + description + "|" + type + "|" + extendedTypeName + "|\n");
  }

  /**
   * Writes the properties of the class to the md file at the outputfile.
   * @param outputMDFile Markdown file to write to
   * @param schemaClassProperties array of the properties=
   */
  private async writeClassProperties(outputMDFile: any, schemaClass: ECClass) {
    const schemaClassProperties = schemaClass.properties;

    // If the class has no properties, return
    if (!schemaClassProperties) return;

    // Write the header
    this.writePropertiesHeader(outputMDFile);

    for (const property of schemaClassProperties) {
      await property.then((result: any) => {
        // const type: string = result.constructor.name; // Gets the property type. Leaving it here for now in case req. changes

        // Write the property row markdown to the file
        this.writeClassPropertiesRow(outputMDFile, result);
      });
    }

    fs.appendFileSync(outputMDFile,     "|            |                   |            |                        |\n\n");
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
    let outputDir: string[] | string = outputFilePath.split("/");
    outputDir.pop();
    outputDir = outputDir.join("/");

    // Check if the output directory exists
    if (!fs.existsSync(outputDir)) throw new ECJsonBadOutputPath(outputFilePath);

    return Schema.fromJson(schemaJson, this.context).then(
      async (result) => {
        await fs.writeFileSync(outputFilePath, "");
        await this.writeFrontMatter(outputFilePath, result);
        await this.writeTitle(outputFilePath, result);
        await this.writeClasses(outputFilePath, result);
      });
      // .catch(() => {
      //   throw Error("Could not load ECSchema JSON file");
      // });
  }
}

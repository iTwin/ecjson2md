/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
import * as fs from "fs";
import { SchemaContext, SchemaJsonFileLocater, Schema, ECClass, schemaItemTypeToString, RelationshipClass, PropertyType, primitiveTypeToString, SchemaItem } from "@bentley/ecjs";
import { ECJsonFileNotFound, ECJsonBadJson, ECJsonBadSearchPath, ECJsonBadOutputPath, BadPropertyType } from "./Exception";
import * as path from "path";

const PLACE_HOLDER = "";

/**
 * Returns the name of the type that corresponds to the property number.
 * @param {number} propertyTypeNumber property._type
 * @returns Sring of the name of the property type
 */
export function propertyTypeNumberToString(propertyTypeNumber: number) {
  switch (propertyTypeNumber) {
    case PropertyType.Struct: return "struct";
    case PropertyType.String_Array: return "struct array";
    case PropertyType.Navigation: return "navigation";
    case PropertyType.Binary: return "binary";
    case PropertyType.Binary_Array: return "binary array";
    case PropertyType.Boolean: return "boolean";
    case PropertyType.Boolean_Array: return "boolean array";
    case PropertyType.DateTime: return "dateTime";
    case PropertyType.DateTime_Array: return "dateTime array";
    case PropertyType.Double: return "double";
    case PropertyType.Double_Array: return "double array";
    case PropertyType.Integer: return "int";
    case PropertyType.Integer_Array: return "int array";
    case PropertyType.Integer_Enumeration: return "int enum";
    case PropertyType.Integer_Enumeration_Array: return "int enum array";
    case PropertyType.Long: return "long";
    case PropertyType.Long_Array: return "long array";
    case PropertyType.Point2d: return "point2d";
    case PropertyType.Point2d_Array: return "point2d array";
    case PropertyType.Point3d: return "point3d";
    case PropertyType.Point3d_Array: return "point3d array";
    case PropertyType.String: return "string";
    case PropertyType.String_Array: return "string array";
    case PropertyType.String_Enumeration: return "string enum";
    case PropertyType.String_Enumeration_Array: return "string enum array";
    case PropertyType.IGeometry: return "IGeometry";
    case PropertyType.IGeometry_Array: return "IGeometry array";
    default: throw new BadPropertyType(propertyTypeNumber);
  }
}

export function formatWarningAlert(alertText: string) {
  return "[!alert text=\"" + alertText + "\" kind=\"warning\"]";
}

export function formatLink(linkString: string, linkText: string): string {
  return "[link_to " + linkString + " text=\"" + linkText + "\"]";
}

/**
 * Returns an array of paths to directories from comma or semicolon separated string of paths to directories
 * @export
 * @param {string} dirString String of directories to process
 * @returns {string[]}
 */
export function prepSearchDirs(dirString: string): string[] {
  // Replace common directory separators with the system seperators
  dirString = dirString.replace(/(\/){1}|(\\){2}|(\\){1}/g, path.sep);

  // Separate the search directories on ';' or ',' or ' ' or ', ' or '; '
  const searchDirs = dirString.split(/, |; |;|,/g);

  const searchDirPaths = new Array<string>();

  // Get the absolute file path
  for (const searchPath of searchDirs) {
    searchDirPaths.push(path.resolve(searchPath));
  }

  return searchDirPaths;
}

/**
 * Returns a proper output path for a markdown file given the output directory path
 * and input file path
 *
 * @param rawOutputPath User given path to directory for output
 * @param {string} inputPath  User given path to input file (used for output file name)
 * @returns {string} Proper output file path
 */
export function prepOutputPath(rawOutputPath: string, inputPath: string): string {
  // Replace common separators with os path separator
  let outputDir: string = path.normalize(rawOutputPath);

  // add a slash to the end if the user didn't provide one
  if (!(outputDir[outputDir.length - 1] === path.sep)) outputDir += path.sep;

  // Form the file name
  const inputPathParts = inputPath.split(/(\/){1}|(\\){2}|(\\){1}/g);
  let preppedOutputPath = outputDir + inputPathParts[inputPathParts.length - 1].slice(0, -5) + ".md";

  // Resolve the absolute file path
  preppedOutputPath = path.resolve(preppedOutputPath);

  return preppedOutputPath;
}

export class ECJsonMarkdownGenerator {
  private context: SchemaContext;
  public searchDirs: string[];

  constructor(searchDirs: string[]) {
    // Check that all the search paths exist
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
   * Writes the name of the schema to the md file at the outputMDfile.
   * @param schema Schema to grab the name from
   * @param outputMDFile The path of the markdown file to write to
   */
  private writeTitle(outputMDFile: any, schema: Schema) {
    // Write the name of the schema as an <h1>
    fs.appendFileSync(outputMDFile, "# " + schema.name + "\n\n");
    // Write the description of the schema as a <p>
    if (schema.description !== undefined) fs.appendFileSync(outputMDFile, schema.description + "\n\n");
    // Create an <h2> for "classes"
    fs.appendFileSync(outputMDFile, "## Classes\n\n");
  }

  /**
   * Writes the frontmatter to the specified file.
   * @param outputMDFile File to write the markdown to
   * @param schema Schema to get name from
   */
  private writeFrontMatter(outputMDFile: string, schema: Schema, nonReleaseFlag: boolean) {
    fs.appendFileSync(outputMDFile, "---\n");
    fs.appendFileSync(outputMDFile, "Schema: " + schema.name + "\n");
    fs.appendFileSync(outputMDFile, "This file was automatically generated via ecjson2md. Do not edit this file. Any edits made to this file will be overwritten the next time it is generated\n");
    fs.appendFileSync(outputMDFile, "---\n\n");

    // Put an alert on the page if needed
    if (nonReleaseFlag) {
      fs.appendFileSync(outputMDFile, formatWarningAlert("This documentation represents a nonreleased version of this schema") + "\n\n");
    }
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

  private getSortedItems(schema: Schema): SchemaItem[] {
    return schema.getItems().sort((c1, c2) => {
      if (c1.name > c2.name) return 1;
      else if (c1.name < c2.name) return -1;
      else return 0;
    });
  }

  /**
   * @returns A string that contains a comma separated list of constraint classes
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
  private writeRelationshipClass(outputMDFile: any, relClass: RelationshipClass) {
    // Format constraint class lists
    const sourceCoClasses = this.collectConstraintClasses(relClass.source.constraintClasses);
    const targetCoClasses = this.collectConstraintClasses(relClass.target.constraintClasses);

    // Write <strong> header
    fs.appendFileSync(outputMDFile, "**Relationship Class**\n\n");

    // Write table
    fs.appendFileSync(outputMDFile,
      "|          |    ConstraintClasses    |            Multiplicity            |\n" +
      "|:---------|:------------------------|:-----------------------------------|\n" +
      "|**Source**|" +  sourceCoClasses  + "|" + relClass.source.multiplicity + "|\n" +
      "|**Target**|" +  targetCoClasses  + "|" + relClass.target.multiplicity + "|\n");
  }

  public writeBaseClass(outputMDFile: string, baseClass: any) {
    if (baseClass !== undefined) {
      baseClass.then((result: any) => {
        const baseClassLink = result.schema.name.toLowerCase() + ".ecschema/#" + result.name.toLowerCase();
        const baseClassName = result.schema.name + ":" + result.name;

        fs.appendFileSync(outputMDFile, "**Base Class:**" + formatLink(baseClassLink, baseClassName));
      });
    }
  }

  private writeSchemaItemsTable(outputFilePath: string, schema: Schema): void {
    const items = this.getSortedItems(schema);

    if (items.length === 0) return;

    fs.appendFileSync(outputFilePath,
        "|  Typename  | Description | Display Label |   Persistence Unit  |    Precision    | Default Presentation Unit  | Alt Presentation Unit |\n" +
        "|:-----------|:------------|:--------------|:--------------------|:----------------|:---------------------------|:----------------------|");

    for (const item of items) {
      const type = item.type;
      const desc = item.description;
      const label = item.label;
      // const perstistUnits = item.persistenceUnit.unit;
      // const precision = item.precision;
      // const presUnit = item.presentationUnits[0].unit;
      // const altPresUnit = item.presentationUnits[1].unit;

      fs.appendFileSync(outputFilePath,
        "|" + type + "|" + desc  + "|" +  label +  "|"); // + perstistUnits + "|" + precision + "|" +       presUnit       + "|" +   altPresUnit   + "|");
    }

    fs.appendFileSync(outputFilePath,
        "|------------|-------------|---------------|---------------------|-----------------|----------------------------|-----------------------|");
  }

  /**
   * Writes the classes of the schema to the md file at the outputfile.
   * @param outputMDFile Markdown file to write to
   * @param schema Schema to grab the classes from
   */
  private async writeClasses(outputMDFile: any, schema: Schema) {

    const classes = this.getSortedClasses(schema);

    let isLastClass: boolean, isRelationshipClass: boolean, hasProperties: boolean, hasDescription: boolean, hasClassType: boolean, hasBaseClass: boolean;

    for (const schemaClass of classes) {
      isLastClass = isRelationshipClass = hasProperties = hasDescription = hasClassType = hasBaseClass = false;

      isLastClass = (schemaClass === classes[classes.length - 1]);
      isRelationshipClass = (schemaItemTypeToString(schemaClass.type) === "RelationshipClass");
      hasProperties = schemaClass.properties !== undefined;
      hasDescription = schemaClass.description !== undefined;
      hasClassType = schemaClass.type !== undefined;
      hasBaseClass = await schemaClass.baseClass !== undefined;

      // Write the name of the class
      fs.appendFileSync(outputMDFile, "### " + schemaClass.name + "\n");
      // Write an extra blank line iff this is not the last class or this class has a description or the class has a type or this
      // class has a baseclass or this class is a relationship class or this class has properties
      if (!isLastClass || hasDescription || hasClassType || hasBaseClass || isRelationshipClass || hasProperties)
        fs.appendFileSync(outputMDFile, "\n");

      // Write the class description if it's given
      if (hasDescription) {
        fs.appendFileSync(outputMDFile, schemaClass.description + "\n");
         // Write an extra blank line iff this is not the last class or the class has a class type or the class has a base class or
         // the class is a releationship class or the class has properties.
        if (!isLastClass || hasClassType || hasBaseClass || isRelationshipClass || hasProperties)
          fs.appendFileSync(outputMDFile, "\n");
      }

      // Write the schema item type if it is given
      if (hasClassType) {
        fs.appendFileSync(outputMDFile, "**Class Type:** " + schemaItemTypeToString(schemaClass.type) + "\n");
         // Write an extra blank line iff this is not the last class or is a relationship class or the class has a base
         // class or the class has properties
        if (!isLastClass || hasBaseClass || isRelationshipClass || hasProperties)
          fs.appendFileSync(outputMDFile, "\n");
      }

      // Write the base class if it's given
      if (schemaClass.baseClass !== undefined) {
        await schemaClass.baseClass.then((result: any) => {
          const baseClassLink = result.schema.name.toLowerCase() + ".ecschema/#" + result.name.toLowerCase();
          const baseClassName = result.schema.name + ":" + result.name;

          fs.appendFileSync(outputMDFile, "**Base Class:** " + formatLink(baseClassLink, baseClassName)  + "\n");

          // Write an extra blank line iff this is not the last class or is a relationship class or has properties
          if (!isLastClass || isRelationshipClass || hasProperties)
             fs.appendFileSync(outputMDFile, "\n");
        });
      }

      // If the class is a relationship class, write the relationship information
      if (isRelationshipClass) {
        this.writeRelationshipClass(outputMDFile, schemaClass as RelationshipClass);
        // Write an extra blank line iff this is not the last class or has properties
        if (!isLastClass || hasProperties)
          fs.appendFileSync(outputMDFile, "\n");
      }

      // If the class has no properties, end here. If it does, write the column headers and call writeClassProperties()
      if (schemaClass.properties) {
        this.writeClassProperties(outputMDFile, schemaClass);
        // Write an extra blank line iff this is not the last class
        if (!isLastClass)
          fs.appendFileSync(outputMDFile, "\n");
      }
    }
  }

  /**
   * @returns A string of the property type
   * @param property The resolved property
   */
  private propertyTypeToString(property: any): string {
    try {
      return primitiveTypeToString(property._type);
    } catch (err) {
      try {
        return property.enumeration._name._name;
      } catch (err) {
        try {
          return propertyTypeNumberToString(property._type);
        } catch (err) {
          return PLACE_HOLDER;
        }
      }
    }
  }

  /**
   * Write the markdown header for a class property table to the file specified
   * @param outputMDFile File to write to
   */
  private writePropertiesHeader(outputMDFile: string): void {
    fs.appendFileSync(outputMDFile, "**Properties**\n\n");
    fs.appendFileSync(outputMDFile,     "|    Name    |    Description    |    Type    |      Extended Type     |\n" +
                                        "|:-----------|:------------------|:-----------|:-----------------------|\n");
  }

  /**
   * Writes the property attributes as a markdown row in the file specified
   * @param outputMDFile File to write markdown to
   * @param property Property to generate the row from
   */
  private writeClassPropertiesRow(outputMDFile: string, property: any): void {
    // If the attribute is not there, return the place holder
    const helper = (( value: any ) => value !== undefined ? value : PLACE_HOLDER);

    let type = this.propertyTypeToString(property);
    // If the property type is navigation, create a link to the class that it points to
    if (type === "navigation") {
      // TODO: Add tests for this
      const targetSchema = property._relationshipClass.schemaName;
      const targetClass = property._relationshipClass.name;

      type = formatLink(targetSchema.toLowerCase() + ".ecschema/#" + targetClass.toLowerCase(), type);
    }

    const name = helper(property._name._name);

    const description = helper(property._description);
    const extendedTypeName = helper(property.extendedTypeName);

    fs.appendFileSync(outputMDFile, "|" + name + "|" + description + "|" + type + "|" + extendedTypeName + "|\n");
  }

  /**
   * Writes the properties of the class to the md file at the outputfile
   * @param outputMDFile Markdown file to write to
   * @param schemaClassProperties array of the properties
   */
  private writeClassProperties(outputMDFile: any, schemaClass: ECClass) {
    const schemaClassProperties = schemaClass.properties;

    // If the class has no properties, return
    if (!schemaClassProperties) return;

    // Write the header
    this.writePropertiesHeader(outputMDFile);

    for (const property of schemaClassProperties) {
      // const type: string = result.constructor.name; // Gets the property type. Leaving it here for now in case req. changes
      // Write the property row markdown to the file
      this.writeClassPropertiesRow(outputMDFile, property);
    }
  }

  /**
   * Loads a schema and its references into memory and drives the
   * markdown generation
   * @param schemaPath path to SchemaJson to load
   * @param outputFilePath Path to the output file to write to
   */
  public generate(schemaPath: string, outputFilePath: string, nonReleaseFlag = false): Promise<any> {
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
    let outputDir: string[] | string = outputFilePath.split(/(\/){1}|(\\){2}|(\\){1}/g);
    outputDir.pop();
    outputDir = outputDir.join(path.sep);

    // Check if the output directory exists
    if (!fs.existsSync(outputDir)) throw new ECJsonBadOutputPath(outputFilePath);

    return Schema.fromJson(schemaJson, this.context).then(
      async (result) => {
        fs.writeFileSync(outputFilePath, "");
        this.writeFrontMatter(outputFilePath, result, nonReleaseFlag);
        this.writeTitle(outputFilePath, result);
        await this.writeClasses(outputFilePath, result);
        await this.writeSchemaItemsTable(outputFilePath, result);
      });
  }
}

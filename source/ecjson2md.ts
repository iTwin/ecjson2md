/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
import * as fs from "fs";
import { SchemaContext, SchemaJsonFileLocater, Schema, ECClass, schemaItemTypeToString, RelationshipClass, PropertyType, primitiveTypeToString, SchemaItem, EntityClass, KindOfQuantity } from "@bentley/ecjs";
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
 * Returns a string containing the shortcode for a warning alert in Bemetalsmith
 * @param alertText Text to display in the alert
 */
export function formatWarningAlert(alertText: string) {
  return "[!alert text=\"" + alertText + "\" kind=\"warning\"]";
}

/**
 * Returns a string containing the shortode for a link in Bemetalsmith
 * @param linkString Link to open
 * @param linkText Text to display on link
 */
export function formatLink(linkString: string, linkText: string): string {
  return "[link_to " + linkString + " text=\"" + linkText + "\"]";
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
   * Returns a list of entity classes sorted by name.
   * @param schema The schema to pull the entity classes from
   */
  private getSortedEntityClasses(schema: Schema): ECClass[] {
    const classes = schema.getClasses();
    const entityClasses = new Array();

    // For each class, only include it if it's an EntityClass
    for (const item of classes) {
      if (item.constructor.name === "EntityClass") entityClasses.push(item);
    }

    // Sort the list of entity classes by name and return it
    return entityClasses.sort((c1, c2) => {
      if (c1.name > c2.name) return 1;
      else if (c1.name < c2.name) return -1;
      else return 0;
    });
  }

  /**
   * Returns a list of KOQ's sorted by name.
   * @param schema The schema to pull the kind of quanity items from
   */
  private getSortedKOQClasses(schema: Schema): KindOfQuantity[] {
    const items = schema.getItems();
    const koqItems = new Array();

    // For each item, only include it if it's a KOQ
    for (const item of items) {
      if (item.constructor.name === "KindOfQuantity") koqItems.push(item);
    }

    // Sort the list of KOQ's by name and return it
    return koqItems.sort((c1, c2) => {
      if (c1.name > c2.name) return 1;
      else if (c1.name < c2.name) return -1;
      else return 0;
    });
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
   * Writes a markdown table row for an EC Entity Class
   * @param outputFilePath File to write the markdown to
   * @param property Property to pull the information from
   */
  private writeEntityClassPropertiesRow(outputFilePath: string, property: any): void {
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

    fs.appendFileSync(outputFilePath, "|" + name + "|" + description + "|" + type + "|" + extendedTypeName + "|\n");
  }

  private writePropertiesTable(outputFilePath: string, schemaClass: ECClass): void {
    const properties = schemaClass.properties;

    // If the class has no item, return
    if (properties === undefined || properties.length === 0) return;

    // Write the table header
    fs.appendFileSync(outputFilePath, "**Properties**\n\n");
    fs.appendFileSync(outputFilePath,
      "|    Name    |    Description    |    Type    |      Extended Type     |\n" +
      "|:-----------|:------------------|:-----------|:-----------------------|\n");

    // Write each table row
    for (const property of properties)
      this.writeEntityClassPropertiesRow(outputFilePath, property);
  }

  /**
   * Writes the entity classes from a schema as markdown to the output file
   * @param outputFilePath Path to the file to write the markdown into
   * @param schema Schema to pull the entity class information from
   */
  private async writeEntityClasses(outputFilePath: string, schema: Schema) {
    // Get a sorted list of the entity classes in the schema
    const entityClasses = this.getSortedEntityClasses(schema);

    for (const entityClass of entityClasses) {

      // Write the name of the class
      if (entityClass.name !== undefined)
        fs.appendFileSync(outputFilePath, "### " + entityClass.name + "\n\n");

      // Write the description of the entity class
      if (entityClass.description !== undefined)
        fs.appendFileSync(outputFilePath, entityClass.description + "\n\n");

      // Write the class type
      if (entityClass.type !== undefined)
          fs.appendFileSync(outputFilePath, "**Class Type:** " + schemaItemTypeToString(entityClass.type) + "\n\n");

      // Write the base class
      if (entityClass.baseClass !== undefined) {
        if (entityClass.baseClass !== undefined) {
          await entityClass.baseClass.then((result: any) => {
            const baseClassLink = result.schema.name.toLowerCase() + ".ecschema/#" + result.name.toLowerCase();
            const baseClassName = result.schema.name + ":" + result.name;

            fs.appendFileSync(outputFilePath, "**Base Class:** " + formatLink(baseClassLink, baseClassName) + "\n\n");
          });
        }
      }

      // Write the label
      if (entityClass.label !== undefined) {
        fs.appendFileSync(outputFilePath, "**Label:** " + entityClass.label + "\n\n");
      }

      // Write the properties
      if (entityClass.properties !== undefined) {
        this.writePropertiesTable(outputFilePath, entityClass);
        fs.appendFileSync(outputFilePath, "\n");
      }
    }
  }

  /**
   * Write the information from kind of quantity schema items in a markdown file at the specified file path
   * @param outputFilePath Path to write the markdown table to
   * @param schema Schema to pull the kind of quantity items from
   */
  public writeKindOfQuantityClasses(outputFilePath: string, schema: Schema) {
    // If the attribute is not there, return the place holder
    const helper = (( value: any ) => value !== undefined ? value : PLACE_HOLDER);

    const koqItems = this.getSortedKOQClasses(schema);

    // If there are no KOQ's, return
    if (koqItems.length === 0) return;

    fs.appendFileSync(outputFilePath,
        "|  Typename  | Description | Display Label |   Persistence Unit  |    Precision    | Default Presentation Unit  | Alt Presentation Unit |\n" +
        "|:-----------|:------------|:--------------|:--------------------|:----------------|:---------------------------|:----------------------|\n");

    // tslint:disable-next-line:no-console
    console.log(koqItems);

    for (const item of koqItems) {
      const type = helper(item.type);
      const desc = helper(item.description);
      const label = helper(item.label);
      const persistUnit  = item.persistenceUnit !== undefined ? item.persistenceUnit.unit : PLACE_HOLDER;
      const precision = helper(item.precision);
      const presUnit = item.presentationUnits[0] !== undefined ? item.presentationUnits[0].unit : PLACE_HOLDER;
      const altPresUnit = item.presentationUnits[1] !== undefined ? item.presentationUnits[1].unit : PLACE_HOLDER;

      // Write the table row for the KOQ's
      fs.appendFileSync(outputFilePath,
        "|" + type + "|" + desc  + "|" +  label +  "|" + persistUnit + "|" + precision + "|" +       presUnit       + "|" +   altPresUnit   + "|\n");
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
        this.writeEntityClasses(outputFilePath, result);
        this.writeKindOfQuantityClasses(outputFilePath, result);
      });
  }
}

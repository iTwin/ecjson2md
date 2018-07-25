/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
import * as fs from "fs";
import { SchemaContext, SchemaJsonFileLocater, Schema, ECClass, schemaItemTypeToString, PropertyType, primitiveTypeToString, Enumeration, RelationshipConstraint, CustomAttributeClass, StructClass, ECClassModifier, PropertyCategory, EntityClass, KindOfQuantity, RelationshipClass, Mixin } from "@bentley/ecjs";
import { ECJsonFileNotFound, ECJsonBadJson, ECJsonBadSearchPath, ECJsonBadOutputPath, BadPropertyType } from "./Exception";
import * as path from "path";

const PLACE_HOLDER = "";

/**
 * Removes the a consecutive blank line at the end of a file if there is one
 * @param inputFilePath File that may have consecutive lines
 * @param outputFilePath File to create without consecutive lines
 */
export function removeExtraBlankLine(inputFilePath: string, outputFilePath: string) {
  const fileBuffer = fs.readFileSync(inputFilePath).toString();

  // If there are two new lines at the end of the file, remove one
  if (fileBuffer[fileBuffer.length - 1] === "\n" && fileBuffer[fileBuffer.length - 2] === "\n")
    fs.writeFileSync(outputFilePath, fileBuffer.slice(0, -1));
  // If there are no blank lines to remove and the input file is not the same as the output file, write the new file
  else if (inputFilePath !== outputFilePath)
    fs.writeFileSync(outputFilePath, fileBuffer);
}

/**
 * Returns the name of the type that corresponds to the property number.
 * @param {number} propertyTypeNumber property._type
 * @returns String of the name of the property type
 */
export function propertyTypeNumberToString(propertyTypeNumber: number): string {
  switch (propertyTypeNumber) {
    case PropertyType.Struct: return "struct";
    case PropertyType.Struct_Array: return "struct array";
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
export function formatWarningAlert(alertText: string): string {
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
  public static writeTitle(outputMDFile: any, schema: Schema) {
    // Write the name of the schema as an <h1>
    fs.appendFileSync(outputMDFile, "# " + schema.name + "\n\n");
    // Write the description of the schema as a <p>
    if (schema.description !== undefined) fs.appendFileSync(outputMDFile, schema.description + "\n\n");
  }

  /**
   * Writes the front-matter to the specified file.
   * @param outputMDFile File to write the markdown to
   * @param schema Schema to get name from
   */
  public static writeFrontMatter(outputMDFile: string, schema: Schema, nonReleaseFlag?: boolean) {
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
   * Returns a sorted list of the specified schema item
   * @param schema The schema to pull the items from
   * @param schemaItem The schema item type to sort
   */
  public static getSortedSchemaItems(schema: Schema, schemaItem: string ): any {
    const allSchemaItems = schema.getItems();

    const selectedSchemaItems = new Array();

    // For each item, only include it if it's the type that we are looking for
    for (const item of allSchemaItems) {
      if (item.constructor.name === schemaItem) selectedSchemaItems.push(item);
    }

    // Sort the list of schema items by name and return it
    return selectedSchemaItems.sort((item1, item2) => {
      if (item1.name > item2.name) return 1;
      else if (item1.name < item2.name) return -1;
      else return 0;
    });
  }

  /**
   * @returns A string of the property type
   * @param property The resolved property
   */
  public static propertyTypeToString(property: any): string {
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

  public static writeSchemaItemName(outputFilePath: string, name: string|undefined) {
    if (name === undefined) return;

    fs.appendFileSync(outputFilePath, "### " + name + "\n\n");
  }

  public static writeSchemaItemDescription(outputFilePath: string, description: string|undefined) {
    if (description === undefined) return;

    fs.appendFileSync(outputFilePath, description + "\n\n");
  }

  public static writeSchemaItemLabel(outputFilePath: string, label: string|undefined) {
    if (label === undefined) return;

    fs.appendFileSync(outputFilePath, "**Label:** " + label + "\n\n");
  }

  public static writeSchemaItemType(outputFilePath: string, type: any) {
    if (type === undefined) return;

    // TODO: Will probably have to convert the type to a string
    fs.appendFileSync(outputFilePath, "**Type:** " + schemaItemTypeToString(type) + "\n\n");
  }

  public static writeSchemaItemBaseClass(outputFilePath: string, baseClass: any) {
    if (baseClass === undefined) return;

    const baseClassLink = baseClass.schemaName.toLowerCase() + ".ecschema/#" + baseClass.name.toLowerCase();
    const baseClassName = baseClass.schemaName + ":" + baseClass.name;

    fs.appendFileSync(outputFilePath, "**Base Class:** " + formatLink(baseClassLink, baseClassName) + "\n\n");
}

  public static writeSchemaItemModifier(outputFilePath: string, modifier: ECClassModifier|undefined) {
    if (modifier === undefined) return;

    fs.appendFileSync(outputFilePath, "**Modifier:** " + modifier.toString() + "\n\n");
  }

  public static writeSchemaItemPriority(outputFilePath: string, priority: any) {
    if (priority === undefined) return;

    fs.appendFileSync(outputFilePath, "**Priority:** " + priority + "\n\n");
  }

  /**
   * Writes a markdown table row for an EC Entity Class
   * @param outputFilePath File to write the markdown to
   * @param property Property to pull the information from
   */
  private static writeEntityClassPropertiesRow(outputFilePath: string, property: any): void {
    // If the attribute is not there, return the place holder
    const helper = (( value: any ) => value !== undefined ? value : PLACE_HOLDER);

    let type = ECJsonMarkdownGenerator.propertyTypeToString(property);

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

  private static writeEntityClassPropertiesTable(outputFilePath: string, schemaClass: ECClass): void {
    const properties = schemaClass.properties;

    // If the class has no item, return
    if (properties === undefined || properties.length === 0) return;

    // Write the table header
    fs.appendFileSync(outputFilePath, "#### Properties\n\n");
    fs.appendFileSync(outputFilePath,
      "|    Name    |    Description    |    Type    |      Extended Type     |\n" +
      "|:-----------|:------------------|:-----------|:-----------------------|\n");

    // Write each table row
    for (const property of properties)
      this.writeEntityClassPropertiesRow(outputFilePath, property);
  }

  public static writeEntityClass(outputFilePath: string, entityClass: EntityClass | undefined) {
    if (entityClass === undefined) return;

    // Write the name of the class
    this.writeSchemaItemName(outputFilePath, entityClass.name);

    // Write the description of the entity class
    this.writeSchemaItemDescription(outputFilePath, entityClass.description);

    // Write the class type
    ECJsonMarkdownGenerator.writeSchemaItemType(outputFilePath, entityClass.schemaItemType);
    const test = entityClass.getBaseClassSync();
    test;
    let test2;
    if (entityClass.baseClass)
      test2 = entityClass.baseClass.name;
    test2;

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, entityClass.baseClass);

    // Write the label
    this.writeSchemaItemLabel(outputFilePath, entityClass.label);

    // Write the properties
    if (entityClass.properties !== undefined) {
      this.writeEntityClassPropertiesTable(outputFilePath, entityClass);
      fs.appendFileSync(outputFilePath, "\n");
    }
  }

  /**
   * Writes the entity classes from a schema as markdown to the output file
   * @param outputFilePath Path to the file to write the markdown into
   * @param schema Schema to pull the entity class information from
   */
  private static writeEntityClasses(outputFilePath: string, schema: Schema) {
    // Get a sorted list of the entity classes in the schema
    const entityClasses = this.getSortedSchemaItems(schema, "EntityClass");

    // If the list is empty or undefined, return
    if (!entityClasses || entityClasses.length === 0) return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, "## Entity Classes\n\n");

    for (const entityClass of entityClasses) {
      this.writeEntityClass(outputFilePath, entityClass);
    }
  }

  /**
   * Generates markdown documentation for the kind of quantity
   * @param outputFilePath path to file to append markdown documentation to
   * @param kindOfQuantity kind of quantity to generate markdown for
   */
  public static writeKindOfQuantityClass(outputFilePath: string, kindOfQuantity: KindOfQuantity|undefined) {
    if (kindOfQuantity === undefined) return;

    // Write name
    this.writeSchemaItemName(outputFilePath, kindOfQuantity.name);

    // Write description
    this.writeSchemaItemDescription(outputFilePath, kindOfQuantity.description);

    // Write type
    this.writeSchemaItemType(outputFilePath, kindOfQuantity.schemaItemType);

    // Write label
    this.writeSchemaItemLabel(outputFilePath, kindOfQuantity.label);

    // Write the precision
    if (kindOfQuantity.precision !== undefined)
      fs.appendFileSync(outputFilePath, "**Precision:** " + kindOfQuantity.precision + "\n\n");

    // Write the persistence unit
    if (kindOfQuantity.persistenceUnit !== undefined && kindOfQuantity.persistenceUnit.unit !== undefined)
      fs.appendFileSync(outputFilePath, "**Persistence Unit:** " + kindOfQuantity.persistenceUnit.unit + "\n\n");

    // Write the default presentation unit
    if (kindOfQuantity.presentationUnits[0] !== undefined && kindOfQuantity.presentationUnits[0].unit !== undefined)
      fs.appendFileSync(outputFilePath, "**Default Presentation Unit**: " + kindOfQuantity.presentationUnits[0].unit + "\n\n");

    // Write the alternate presentation units
    if (kindOfQuantity.presentationUnits[1] !== undefined && kindOfQuantity.presentationUnits[1].unit !== undefined) {
      const altUnits = kindOfQuantity.presentationUnits.slice(1);
      fs.appendFileSync(outputFilePath, "**Alternate Presentation Units**\n\n");

      for (const altUnit of altUnits) {
        if (altUnit.unit !== undefined)
          fs.appendFileSync(outputFilePath, "- " + altUnit.unit.replace(/\*/g, "\\*") + "\n");
      }
      fs.appendFileSync(outputFilePath, "\n");
    }
  }

  /**
   * Collects and generates markdown for kind of quantity schema items in a markdown file at the specified file path
   * @param outputFilePath Path to write the markdown table to
   * @param schema Schema to pull the kind of quantity items from
   */
  private static writeKindOfQuantityClasses(outputFilePath: string, schema: Schema) {
    const koqItems = this.getSortedSchemaItems(schema, "KindOfQuantity");

    // If the list is empty or undefined, return
    if (!koqItems || koqItems.length === 0) return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, "## Kind of Quantity Items\n\n");

    for (const item of koqItems)
      this.writeKindOfQuantityClass(outputFilePath, item);
  }

  /**
   * Collects and generates markdown for kind of quantity schema items in a markdown file at the specified file path as a table
   * @param outputFilePath Path to write the markdown table to
   * @param schema Schema to pull the kind of quantity items from
   */
  public static writeKindOfQuantityClassesAsTable(outputFilePath: string, schema: Schema) {
    // If the attribute is not there, return the place holder
    const helper = (( value: any ) => value !== undefined ? value : PLACE_HOLDER);

    const koqItems = this.getSortedSchemaItems(schema, "KindOfQuantity");

    // If the list is empty or undefined, return
    if (!koqItems || koqItems.length === 0) return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, "## Kind of Quantity Items\n\n");

    fs.appendFileSync(outputFilePath,
        "|  Typename  | Description | Display Label |   Persistence Unit  |    Precision    | Default Presentation Unit  | Alt Presentation Unit |\n" +
        "|:-----------|:------------|:--------------|:--------------------|:----------------|:---------------------------|:----------------------|\n");

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

  private static writeRelationshipConstraintSection(outputFilePath: string, constraint: RelationshipConstraint) {
    // Write the constraint information
    fs.appendFileSync(outputFilePath, "**isPolymorphic:** " + constraint.polymorphic + "\n\n");
    fs.appendFileSync(outputFilePath, "**roleLabel:** " + constraint.roleLabel + "\n\n");
    fs.appendFileSync(outputFilePath, "**multiplicity:** " + constraint.multiplicity + "\n\n");
    fs.appendFileSync(outputFilePath, "##### Constraint Classes\n\n");

    // If the constraint classes are undefined or there are none, return
    if (!constraint.constraintClasses || constraint.constraintClasses.length === 0) return;

    // Write the constraint classes as a list
    for (const constraintClass of constraint.constraintClasses) {
      const constraintClassLink = constraintClass.schemaName.toLowerCase() + ".ecschema/#" + constraintClass.name.toLowerCase();
      fs.appendFileSync(outputFilePath, "- " + formatLink(constraintClassLink, constraintClass.name) + "\n");
    }

    // Append another new line
    fs.appendFileSync(outputFilePath, "\n");
  }

  /**
   * Generates markdown documentation for relationship class
   * @param outputFilePath Path to file to append markdown to
   * @param relationshipClass Class to generate markdown for
   */
  public static writeRelationshipClass(outputFilePath: string, relationshipClass: RelationshipClass|undefined) {
    if (relationshipClass === undefined) return;

    // Write the name of the class
    this.writeSchemaItemName(outputFilePath, relationshipClass.name);

    // Write the description of the entity class
    this.writeSchemaItemDescription(outputFilePath, relationshipClass.description);

    // Write the class type
    this.writeSchemaItemType(outputFilePath, relationshipClass.schemaItemType);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, relationshipClass.baseClass);

    // Write the label
    this.writeSchemaItemLabel(outputFilePath, relationshipClass.label);

    // Write the strength
    if (relationshipClass.strength !== undefined) {
      fs.appendFileSync(outputFilePath, "**Strength:** " + relationshipClass.strength + "\n\n");
    }
    // Write the strength direction
    if (relationshipClass.strengthDirection !== undefined) {
      fs.appendFileSync(outputFilePath, "**strengthDirection:** " + relationshipClass.strengthDirection + "\n\n");
    }

    // Write the source section
    fs.appendFileSync(outputFilePath, "#### Source\n\n");
    // Write the relationship constraints info for the source section
    this.writeRelationshipConstraintSection(outputFilePath, relationshipClass.source);

    // Write the target section
    fs.appendFileSync(outputFilePath, "#### Target\n\n");
    // Write the relationship constraints info for the target section
    this.writeRelationshipConstraintSection(outputFilePath, relationshipClass.target);
  }

  /**
   * Collects and generates markdown documentation for relationship classes
   * @param outputFilePath Path to file to append the markdown to
   * @param schema Schema to pull relationship classes from
   */
  private static writeRelationshipClasses(outputFilePath: string, schema: Schema) {
    const relationshipClasses = this.getSortedSchemaItems(schema, "RelationshipClass");

    // If the class list is undefined or empty, return
    if (!relationshipClasses || relationshipClasses.length === 0) return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, "## Relationship Classes\n\n");

    for (const relationshipClass of relationshipClasses)
      this.writeRelationshipClass(outputFilePath, relationshipClass);
  }

  private static writeEnumerationTable(outputFilePath: string, enumeration: Enumeration) {
    const enumerators = enumeration.enumerators;

    // If the enumerators are undefined or there are none, return
    if (!enumerators || enumerators.length === 0) return;

    // If the attribute is not there, return the place holder
    const helper = (( value: any ) => value !== undefined ? value : PLACE_HOLDER);

    // Write the table header
    fs.appendFileSync(outputFilePath,
        "|    Label    |    Value    |\n" +
        "|:------------|:------------|\n");

    for (const enumerator of enumerators) {
      const label = helper(enumerator.label).replace(/\|/g, "\\|");
      const value = helper(enumerator.value);

      // Write the table row
      fs.appendFileSync(outputFilePath,
        "|" + label + "|" + value + "|\n");
    }

    fs.appendFileSync(outputFilePath, "\n");
  }

  /**
   * Generates markdown documentation for an enumeration item
   * @param outputFilePath File path to append markdown documentation to
   * @param enumerationItem Enumeration to generate markdown for
   */
  public static writeEnumerationItem(outputFilePath: string, enumerationItem: Enumeration|undefined) {
    if (enumerationItem === undefined) return;

    if (enumerationItem.name !== undefined)
        fs.appendFileSync(outputFilePath, "### " + enumerationItem.name + "\n\n");

    if (enumerationItem.description !== undefined)
      fs.appendFileSync(outputFilePath, enumerationItem.description + "\n\n");

    // Write the type
    this.writeSchemaItemType(outputFilePath, enumerationItem.schemaItemType);

    // Write the label
    this.writeSchemaItemType(outputFilePath, enumerationItem.label);

    // Write wether or not the enum is strict
    if (enumerationItem.isStrict !== undefined)
      fs.appendFileSync(outputFilePath, "**Strict:** " + enumerationItem.isStrict + "\n\n");

    // Write wether the enum is an int or string
    if (enumerationItem.isInt())
      fs.appendFileSync(outputFilePath, "**Backing Type:** int\n\n");
    if (enumerationItem.isString())
      fs.appendFileSync(outputFilePath, "**Backing Type:** string\n\n");

    // Write the enumeration table
    this.writeEnumerationTable(outputFilePath, enumerationItem);
  }

  /**
   * Collects and generates markdown documentation for enumeration items in a schema
   * @param outputFilePath File path to append markdown documentation to
   * @param schema Schema to pull enumeration items from
   */
  private static writeEnumerationItems(outputFilePath: string, schema: Schema) {
    const enumerationItems = this.getSortedSchemaItems(schema, "Enumeration");

    // If the enumeration list is undefined or empty, return
    if (!enumerationItems || enumerationItems.length === 0) return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, "## Enumeration Items\n\n");

    for (const enumerationItem of enumerationItems)
      this.writeEnumerationItem(outputFilePath, enumerationItem);
  }

  /**
   * Generates markdown documentation for a mixin class
   * @param outputFilePath Path to file to append the markdown to
   * @param mixin Mixin class to generate markdown for
   */
  public static writeMixinClass(outputFilePath: string, mixin: Mixin|undefined) {
    if (mixin === undefined) return;

    // Write the name of the mixin
    this.writeSchemaItemName(outputFilePath, mixin.name);

    // Write the description of the mixin class
    this.writeSchemaItemDescription(outputFilePath, mixin.description);

    // Write the class type
    this.writeSchemaItemType(outputFilePath, mixin.schemaItemType);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, mixin.baseClass);

    // Write the label
    this.writeSchemaItemLabel(outputFilePath, mixin.label);

    // Link to what the mixin applies to
    if (mixin.appliesTo !== undefined) {
      const appliesToLink = mixin.appliesTo.schemaName.toLowerCase() + ".ecschema/#" + mixin.appliesTo.name.toLowerCase();

      // Write a link to what the mixin applies to
      fs.appendFileSync(outputFilePath, "**appliesTo:** " + formatLink(appliesToLink, mixin.appliesTo.name) + "\n\n");
    }

    // If the properties are undefined or empty, continue with next
    if (!mixin.properties || mixin.properties.length === 0) return;

    // Write the properties header and table header
    fs.appendFileSync(outputFilePath,
        "#### Properties\n\n" +
        "|    Name    |    Label    |    Class    |    Read Only     |    Priority    |\n" +
        "|:-----------|:------------|:------------|:-----------------|:---------------|\n");

    // If the attribute is not there, return the place holder
    const helper = (( value: any ) => value !== undefined ? value : PLACE_HOLDER);

    for (const property of mixin.properties) {
      const name = helper(property.name);
      const label = helper(property.label);
      const type = helper(property.class.name);
      const isReadOnly = helper(property.isReadOnly);
      const priority = helper(property.priority);

      fs.appendFileSync(outputFilePath,
        "|" + name + "|" + label + "|" + type + "|" + isReadOnly + "|" + priority + "|\n");
    }

    fs.appendFileSync(outputFilePath, "\n");
  }

  /**
   * Collects and generates markdown documentation for mixin classes in a schema
   * @param outputFilePath Path to file to append markdown to
   * @param schema Schema to pull mixin classes from
   */
  private static writeMixinClasses(outputFilePath: string, schema: Schema) {
    const mixinClasses = this.getSortedSchemaItems(schema, "Mixin");

    // If the mixin class list is undefined or empty, return
    if (!mixinClasses || mixinClasses.length === 0) return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, "## Mixin Classes\n\n");

    for (const mixin of mixinClasses)
      this.writeMixinClass(outputFilePath, mixin);
  }

  /**
   * Generate markdown documentation for a custom attribute class
   * @param outputFilePath Path to file to append markdown to
   * @param customAttributeClass custom attribute class to generate markdown for
   */
  public static writeCustomAttributeClass(outputFilePath: string, customAttributeClass: CustomAttributeClass|undefined) {
    if (customAttributeClass === undefined) return;

    // Write the name of the class
    this.writeSchemaItemName(outputFilePath, customAttributeClass.name);

    // Write the class type
    this.writeSchemaItemType(outputFilePath, customAttributeClass.schemaItemType);

    // Write the description of the class
    this.writeSchemaItemDescription(outputFilePath, customAttributeClass.description);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, customAttributeClass.baseClass);

    // Write the modifier
    this.writeSchemaItemModifier(outputFilePath, customAttributeClass.modifier);

    // Write the properties table
    // If the properties are undefined or have length 0, return
    if (!customAttributeClass.properties || customAttributeClass.properties.length === 0) return;

    // Write the properties header and table header
    fs.appendFileSync(outputFilePath,
      "#### Properties\n\n" +
      "|    Name    |    Label    |    Class   |    Read Only     |    Priority    |\n" +
      "|:-----------|:------------|:-----------|:-----------------|:---------------|\n");

    // If the attribute is not there, return the place holder
    const helper = (( value: any ) => value !== undefined ? value : PLACE_HOLDER);

    for (const property of customAttributeClass.properties) {
      const name = helper(property.name);
      const label = helper(property.label);
      const type = helper(property.class.name);
      const isReadOnly = helper(property.isReadOnly);
      const priority = helper(property.priority);

      fs.appendFileSync(outputFilePath,
        "|" + name + "|" + label + "|" + type + "|" + isReadOnly + "|" + priority + "|\n");
    }

    fs.appendFileSync(outputFilePath, "\n");
  }

  /**
   * Collect and generate markdown documentation for custom attribute classes
   * @param outputFilePath Path to file to write the markdown to
   * @param schema Schema to putt the custom attribute classes from
   */
  private static writeCustomAttributeClasses(outputFilePath: string, schema: Schema) {
    const customAttributeClasses: CustomAttributeClass[] = this.getSortedSchemaItems(schema, "CustomAttributeClass");

    // If the mixin class list is undefined or empty, return
    if (!customAttributeClasses || customAttributeClasses.length === 0) return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, "## Custom Attribute Classes\n\n");

    for (const customAttributeClass of customAttributeClasses)
      this.writeCustomAttributeClass(outputFilePath, customAttributeClass);
  }

  /**
   * Writes markdown for a struct class0
   * @param outputFilePath Path to file to write markdown into
   * @param structClass Struct class to generate markdown for
   */
  public static writeStructClass(outputFilePath: string, structClass: StructClass|undefined) {
    if (structClass === undefined) return;

    // Write the item name
    this.writeSchemaItemName(outputFilePath, structClass.name);

    // Write the description
    this.writeSchemaItemDescription(outputFilePath, structClass.description);

    // Write the label
    this.writeSchemaItemLabel(outputFilePath, structClass.label);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, structClass.baseClass);

    // Write the type
    this.writeSchemaItemType(outputFilePath, structClass.schemaItemType);

    // Write the modifier
    this.writeSchemaItemModifier(outputFilePath, structClass.modifier);

    // Write the properties table
    // If the properties are undefined or have length 0, return
    if (!structClass.properties || structClass.properties.length === 0) return;

    // Write the properties header and table header
    fs.appendFileSync(outputFilePath,
      "#### Properties\n\n" +
      "|    Name    |    Label    |    Class   |    Read Only     |    Priority    |\n" +
      "|:-----------|:------------|:-----------|:-----------------|:---------------|\n");

    // If the attribute is not there, return the place holder
    const helper = (( value: any ) => value !== undefined ? value : PLACE_HOLDER);

    for (const property of structClass.properties) {
      const name = helper(property.name);
      const label = helper(property.label);
      const type = helper(property.class.name);
      const isReadOnly = helper(property.isReadOnly);
      const priority = helper(property.priority);

      fs.appendFileSync(outputFilePath,
        "|" + name + "|" + label + "|" + type + "|" + isReadOnly + "|" + priority + "|\n");
    }

    fs.appendFileSync(outputFilePath, "\n");
  }

  /**
   * Collects and writes markdown documentation for struct classes
   * @param outputFilePath Path to file to write the struct classes to
   * @param schema Schema to pull the struct classes from
   */
  private static writeStructClasses(outputFilePath: string, schema: Schema) {
    const structClasses: StructClass[] = this.getSortedSchemaItems(schema, "StructClass");

    // If the struct class list is undefined or empty, return
    if (!structClasses || structClasses.length === 0) return;

    for (const structClass of structClasses)  this.writeStructClass(outputFilePath, structClass);
  }

  /**
   * Writes markdown for a property category
   * @param outputFilePath Path to file to write markdown into
   * @param propertyCategory Property category to generate markdown for
   */
  public static writePropertyCategory(outputFilePath: string, propertyCategory: PropertyCategory|undefined) {
    if (propertyCategory === undefined) return;

    // Write the name
    this.writeSchemaItemName(outputFilePath, propertyCategory.name);

    // Write the description
    this.writeSchemaItemDescription(outputFilePath, propertyCategory.description);

    // Write the the label
    this.writeSchemaItemLabel(outputFilePath, propertyCategory.label);

    // Write the type
    this.writeSchemaItemType(outputFilePath, propertyCategory.schemaItemType);

    // Write the priority
    this.writeSchemaItemPriority(outputFilePath, propertyCategory.priority);
  }

  /**
   * Collects and writes markdown documentation for property categories
   * @param outputFilePath Path to file to write the property categories to
   * @param schema Schema to pull the property categories from
   */
  private static writePropertyCategories(outputFilePath: string, schema: Schema) {
    const propertyCategories: PropertyCategory[] = this.getSortedSchemaItems(schema, "PropertyCategory");

    for (const propertyCategory of propertyCategories) {
      this.writePropertyCategory(outputFilePath, propertyCategory);
    }
  }

  /**
   * Loads a schema and its references into memory and drives the
   * markdown generation
   * @param schemaPath path to SchemaJson to load
   * @param outputFilePath Path to the output file to write to
   */
  public generate(schemaPath: string, outputFilePath: string, nonReleaseFlag = false) {
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

    const schema: Schema = Schema.fromJsonSync(schemaJson, this.context);
    fs.writeFileSync(outputFilePath, "");
    ECJsonMarkdownGenerator.writeFrontMatter(outputFilePath, schema, nonReleaseFlag);
    ECJsonMarkdownGenerator.writeTitle(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeEntityClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeKindOfQuantityClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeRelationshipClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeEnumerationItems(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeMixinClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeCustomAttributeClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeStructClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writePropertyCategories(outputFilePath, schema);
    removeExtraBlankLine(outputFilePath, outputFilePath);
  }
}

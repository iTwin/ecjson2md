/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2019 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
import * as fs from "fs";
import * as path from "path";

import {
  classModifierToString, containerTypeToString, CustomAttributeClass, ECClass, ECClassModifier,
  EntityClass, Enumeration, KindOfQuantity, formatTraitsToArray, Format, formatTypeToString, FormatType,
  Mixin, OverrideFormat, primitiveTypeToString, PropertyCategory, PropertyType, RelationshipClass,
  RelationshipConstraint, Schema, SchemaContext, schemaItemTypeToString, SchemaJsonFileLocater,
  scientificTypeToString, strengthDirectionToString, strengthToString, StructClass, Unit, SchemaItemType,
  SchemaXmlFileLocater,
} from "@bentley/ecschema-metadata";
import { ECJsonFileNotFound, ECJsonBadJson, ECJsonBadSearchPath, ECJsonBadOutputPath, BadPropertyType } from "./Exception";
import { CustomAttributeSet } from "@bentley/ecschema-metadata/lib/Metadata/CustomAttribute";
import { DOMParser } from "xmldom";
import { SchemaReadHelper } from "@bentley/ecschema-metadata/lib/Deserialization/Helper";
import { XmlParser } from "@bentley/ecschema-metadata/lib/Deserialization/XmlParser";

const PLACE_HOLDER = "";

/**
 * Removes a consecutive blank line at the end of a file if there is one
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
  if (dirString.length === 0)
    return [];

  // Separate the search directories on ';' or ',' or ' ' or ', ' or '; '
  const searchDirs = dirString.split(/, |; |;|,/g);

  const searchDirPaths = new Array<string>();

  // Get the absolute file path, also replaces common separators with the OS specific ones
  for (const searchPath of searchDirs) {
    searchDirPaths.push(path.resolve(path.normalize(searchPath)));
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
 * Returns a string containing the shortcode for a badge in Bemetalsmith
 * @param badgeText Text to display in the badge
 * @param badgeKind This determines the color/styling of the badge. Options: primary, secondary, success, danger, warning, info, light, dark
 */
export function formatBadge(badgeText: string, badgeKind?: string): string {
  return `[!badge text="${badgeText}" kind="${badgeKind ? badgeKind : "primary"}"]`;
}

/**
 * Returns a string containing the shortode for a link in Bemetalsmith
 * @param linkString Link to open
 * @param linkText Text to display on link
 */
export function formatLink(linkString: string, linkText: string): string {
  return "[" + linkText + "](" + linkString + ")";
}

/**
 * Returns a string containing the
 * @param schemaName
 */
function createSchemaLink(schemaName: string): string {
  // This is assuming that all ecschemas are right next to each other.
  return "./" + schemaName.toLowerCase() + ".ecschema.md";
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

/**
 * Class used to generate markdown for a whole schema or for specific schema items (using static methods)
 */
export class ECJsonMarkdownGenerator {
  private _context: SchemaContext;

  public searchDirs: string[];

  constructor(searchDirs: string[]) {
    // Check that all the search paths exist
    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) throw new ECJsonBadSearchPath(dir);
    }

    // Add the provided directories to the locator as search paths
    const jsonlocator = new SchemaJsonFileLocater();
    jsonlocator.addSchemaSearchPaths(searchDirs);
    this.searchDirs = searchDirs;

    const xmllocator = new SchemaXmlFileLocater();
    xmllocator.addSchemaSearchPaths(searchDirs);
    this.searchDirs = searchDirs;

    // Add the locator to the context
    this._context = new SchemaContext();
    this._context.addLocater(jsonlocator);
    this._context.addLocater(xmllocator);
  }

  /**
   * @returns the context for testing purposes
   */
  public getContext() {
    return this._context;
  }

  /**
   * Writes the name of the schema to the md file at the outputMDfile.
   * @param schema Schema to grab the name from
   * @param outputMDFile The path of the markdown file to write to
   */
  public static writeSchema(outputMDFile: any, schema: Schema) {
    // Write the name of the schema as an <h1>
    fs.appendFileSync(outputMDFile, "# " + schema.name + "\n\n");

    // Write the alias of the schema
    if (schema.alias !== undefined)
      fs.appendFileSync(outputMDFile, "**alias:** " + schema.alias + "\n\n");

    // Write the version of the schema
    if (schema.readVersion !== undefined && schema.writeVersion !== undefined && schema.minorVersion !== undefined)
      fs.appendFileSync(outputMDFile, "**version:** " + schema.readVersion + "." + schema.writeVersion + "." + schema.minorVersion + "\n\n");

    // Write the description of the schema as a <p>
    if (schema.description !== undefined) fs.appendFileSync(outputMDFile, schema.description + "\n\n");

    // Write the label
    this.writeSchemaItemLabel(outputMDFile, schema.label);
  }

  /**
   * Writes the front-matter to the specified file.
   * @param outputMDFile File to write the markdown to
   * @param schema Schema to get name from
   */
  public static writeFrontMatter(outputMDFile: string, schema: Schema, nonReleaseFlag?: boolean) {
    fs.appendFileSync(outputMDFile, "---\n");
    fs.appendFileSync(outputMDFile, "noEditThisPage: true\n");
    fs.appendFileSync(outputMDFile, "Schema: " + schema.name + "\n");
    fs.appendFileSync(outputMDFile, "Warning: This file was automatically generated via ecjson2md. Do not edit this file. Any edits made to this file will be overwritten the next time it is generated.\n");
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

    const selectedSchemaItems = [];

    // For each item, only include it if it's the type that we are looking for
    for (const item of allSchemaItems) {
      if (item.constructor.name === schemaItem)
        selectedSchemaItems.push(item);
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

  /**
   * Appends markdown for the name of a schema item to the specified file path
   * @param outputFilePath Path of file to append markdown to
   * @param name Name to write markdown for
   * @param label Label to write markdown for
   * @param modifier Modifier to write markdown for
   * @param customAttributes CustomAttrbuteSet to check if the item is deprecated
   */
  public static writeSchemaItemHeader(outputFilePath: string, name: string|undefined, type: SchemaItemType, label?: string, modifier?: ECClassModifier, customAttributes?: CustomAttributeSet) {
    if (name === undefined) return;

    fs.appendFileSync(outputFilePath, `### **${name}**`);

    if (label !== undefined)
      fs.appendFileSync(outputFilePath, ` (${label})`);

    if (modifier !== undefined) {
      const modifierString = classModifierToString(modifier);
      if (modifierString !== "None")
        fs.appendFileSync(outputFilePath, ` *${modifierString}*`);
    }

    if (type !== undefined) {
      const typeString = schemaItemTypeToString(type);
      fs.appendFileSync(outputFilePath, ` ${formatBadge(typeString, "info")}`);
    }

    if (customAttributes !== undefined) {
      const customAttribute = customAttributes.get("CoreCustomAttributes.Deprecated");
      if (customAttribute !== undefined) {
        fs.appendFileSync(outputFilePath, ` ${formatBadge("Deprecated", "warning")}`);
        if (customAttribute.Description)
          fs.appendFileSync(outputFilePath, `\n\n${formatWarningAlert(customAttribute.Description)}`);
      }
    }

    fs.appendFileSync(outputFilePath, "\n\n");
  }

  /**
   * Appends markdown for the description of a schema item to the specified file path
   * @param outputFilePath Path of file to append markdown to
   * @param description Description to write markdown for
   */
  public static writeSchemaItemDescription(outputFilePath: string, description: string|undefined) {
    if (description === undefined) {
      fs.appendFileSync(outputFilePath, "**description:** &lt;No description&gt;\n\n");
      return;
    }

    fs.appendFileSync(outputFilePath, `**description:** ${description}\n\n`);
  }

  /**
   * Appends markdown for the label of a schema item to the specified file path
   * @param outputFilePath Path of file to append markdown to
   * @param label Label to write markdown for
   */
  public static writeSchemaItemLabel(outputFilePath: string, label: string|undefined) {
    if (label === undefined) return;

    fs.appendFileSync(outputFilePath, "**displayLabel:** " + label + "\n\n");
  }

  /**
   * Appends bemetalsmith link for the baseclass of a schema item to the specified file path
   * @param outputFilePath Path of file to append link to
   * @param baseClass Baseclass to write markdown for
   */
  public static writeSchemaItemBaseClass(outputFilePath: string, baseClass: any) {
    if (baseClass === undefined) return;

    let baseClassLink = "#" + baseClass.name.toLowerCase();
    if (!outputFilePath.toLowerCase().includes("\\" + baseClass.schemaName.toLowerCase() + ".ecschema.md"))
      baseClassLink = createSchemaLink(baseClass.schemaName) + baseClassLink;
    const baseClassName = baseClass.schemaName + ":" + baseClass.name;

    fs.appendFileSync(outputFilePath, "**baseClass:** " + formatLink(baseClassLink, baseClassName) + "\n\n");
  }

  /**
   * Appends markdown for the modifier of a schema item to the specified file path
   * @param outputFilePath Path of file to append markdown for modifier to
   * @param modifier Modifier to write markdown for
   */
  public static writeSchemaItemModifier(outputFilePath: string, modifier: ECClassModifier|undefined) {
    if (modifier === undefined) return;

    fs.appendFileSync(outputFilePath, "**modifier:** " + classModifierToString(modifier) + "\n\n");
  }

  /**
   * Appends markdown for priority of a schema item to the specified file path
   * @param outputFilePath Path to append markdown for priority to
   * @param priority Priority to write markdown for
   */
  public static writeSchemaItemPriority(outputFilePath: string, priority: any) {
    if (priority === undefined) return;

    fs.appendFileSync(outputFilePath, "**priority:** " + priority + "\n\n");
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
      const targetSchema = property._relationshipClass.schemaName;
      const targetClass = property._relationshipClass.name;

      type = formatLink(createSchemaLink(targetSchema) + "#" + targetClass.toLowerCase(), type);
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

  /**
   * Writes markdown documentation for an entity class
   * @param outputFilePath Path to file to append markdown to
   * @param entityClass Entity class to generate markdown for
   */
  public static writeEntityClass(outputFilePath: string, entityClass: EntityClass | undefined) {
    if (entityClass === undefined) return;

    // Write the name of the class
    this.writeSchemaItemHeader(outputFilePath, entityClass.name, entityClass.schemaItemType, entityClass.label, entityClass.modifier, entityClass.customAttributes);

    // Write the description of the entity class
    this.writeSchemaItemDescription(outputFilePath, entityClass.description);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, entityClass.baseClass);

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

    for (const entityClass of entityClasses)
      this.writeEntityClass(outputFilePath, entityClass);
  }

  /**
   * Generates markdown documentation for the kind of quantity
   * @param outputFilePath path to file to append markdown documentation to
   * @param kindOfQuantity kind of quantity to generate markdown for
   */
  public static writeKindOfQuantityClass(outputFilePath: string, kindOfQuantity: KindOfQuantity|undefined, schema: Schema) {
    if (kindOfQuantity === undefined) return;

    // Write the name of the class
    this.writeSchemaItemHeader(outputFilePath, kindOfQuantity.name, kindOfQuantity.schemaItemType, kindOfQuantity.label, undefined, undefined);

    // Write the description of the entity class
    this.writeSchemaItemDescription(outputFilePath, kindOfQuantity.description);

    // Write the relative error
    if (kindOfQuantity.relativeError !== undefined)
      fs.appendFileSync(outputFilePath, "**Relative Error:** " + kindOfQuantity.relativeError + "\n\n");

      // Write the persistence unit
    if (kindOfQuantity.persistenceUnit !== undefined)
      fs.appendFileSync(outputFilePath, "**Persistence Unit:** " + kindOfQuantity.persistenceUnit.name + "\n\n");

    if (kindOfQuantity.presentationFormats !== undefined) {
      // Write the presentation units
      if (kindOfQuantity.presentationFormats.length !== 0) {
        fs.appendFileSync(outputFilePath, "**Presentation Formats**\n\n");
        for (const pFormat of kindOfQuantity.presentationFormats) {
          let schemaName = "";
          if (pFormat instanceof OverrideFormat) {
            schemaName = pFormat.parent.schema.name;
            const formatAdditional = pFormat.precision !== pFormat.parent.precision ? `(${pFormat.precision})` : "";
            const formatClassLink = (schemaName !== schema.name ? createSchemaLink(schemaName.toLowerCase()) : "") + "#" + pFormat.parent.name.toLowerCase();
            const formatClassName = pFormat.parent.name;

            let unitOverrides = " ";
            if (pFormat.units !== pFormat.parent.units && undefined !== pFormat.units)
              for (const pfUnit of pFormat.units) {
                const unitLink = formatLink((pfUnit[0].schema.name !== schema.name ? createSchemaLink(pfUnit[0].schema.name) : "") + "#" + pfUnit[0].name.toLowerCase(), pfUnit[0].name);
                unitOverrides += `[ ${unitLink + (undefined === pfUnit[1] ? "" : "|" + pfUnit[1])} ]`;
              }

            fs.appendFileSync(outputFilePath, "- " + formatLink(formatClassLink, formatClassName) + formatAdditional + unitOverrides + "\n");
          } else {
            schemaName = pFormat.schema.name;
            const formatClassLink = (schemaName !== schema.name ? createSchemaLink(schemaName.toLowerCase()) : "") + "#" + pFormat.name.toLowerCase();
            fs.appendFileSync(outputFilePath, "- " + formatLink(formatClassLink, pFormat.name) + "\n");
          }
        }
        fs.appendFileSync(outputFilePath, "\n");
      }
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
      this.writeKindOfQuantityClass(outputFilePath, item, schema);
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
      const constraintClassLink = createSchemaLink(constraintClass.schemaName) + "#" + constraintClass.name.toLowerCase();
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
    this.writeSchemaItemHeader(outputFilePath, relationshipClass.name, relationshipClass.schemaItemType, relationshipClass.label, relationshipClass.modifier, relationshipClass.customAttributes);

    // Write the description of the entity class
    this.writeSchemaItemDescription(outputFilePath, relationshipClass.description);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, relationshipClass.baseClass);

    // Write the strength
    if (relationshipClass.strength !== undefined)
      fs.appendFileSync(outputFilePath, "**Strength:** " + strengthToString(relationshipClass.strength) + "\n\n");

    // Write the strength direction
    if (relationshipClass.strengthDirection !== undefined)
      fs.appendFileSync(outputFilePath, "**strengthDirection:** " + strengthDirectionToString(relationshipClass.strengthDirection) + "\n\n");

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

    // Write the name of the class
    this.writeSchemaItemHeader(outputFilePath, enumerationItem.name, enumerationItem.schemaItemType, enumerationItem.label, undefined, undefined);

    // Write wether the enum is an int or string
    if (enumerationItem.isInt)
      fs.appendFileSync(outputFilePath, "**Backing Type:** int\n\n");
    if (enumerationItem.isString)
      fs.appendFileSync(outputFilePath, "**Backing Type:** string\n\n");

    // Write the description of the entity class
    this.writeSchemaItemDescription(outputFilePath, enumerationItem.description);

    // Write wether or not the enum is strict
    if (enumerationItem.isStrict !== undefined)
      fs.appendFileSync(outputFilePath, "**Strict:** " + enumerationItem.isStrict + "\n\n");

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
    fs.appendFileSync(outputFilePath, "## Enumerations\n\n");

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
    this.writeSchemaItemHeader(outputFilePath, mixin.name, mixin.schemaItemType, mixin.label, mixin.modifier, mixin.customAttributes);

    // Write the description of the mixin class
    this.writeSchemaItemDescription(outputFilePath, mixin.description);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, mixin.baseClass);

    // Link to what the mixin applies to
    if (mixin.appliesTo !== undefined) {
      const appliesToLink = createSchemaLink(mixin.appliesTo.schemaName) + "#" + mixin.appliesTo.name.toLowerCase();

      // Write a link to what the mixin applies to
      fs.appendFileSync(outputFilePath, "**appliesTo:** " + formatLink(appliesToLink, mixin.appliesTo.name) + "\n\n");
    }

    // If the properties are undefined or empty, continue with next
    if (!mixin.properties || mixin.properties.length === 0) return;

    // Write the properties header and table header
    fs.appendFileSync(outputFilePath,
        "#### Properties\n\n" +
        "|    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |\n" +
        "|:-----------|:------------|:------------|:-----------|:-----------------|:---------------|\n");

    // If the attribute is not there, return the place holder
    const helper = (( value: any ) => value !== undefined ? value : PLACE_HOLDER);

    for (const property of mixin.properties) {
      const name = helper(property.name);
      const label = helper(property.label);
      const category = helper(property.category);
      const isReadOnly = helper(property.isReadOnly);
      const priority = helper(property.priority);
      const description = helper(property.description);

      fs.appendFileSync(outputFilePath,
        "|" + name + "|" + description + "|" + label + "|" + category + "|" + isReadOnly + "|" + priority + "|\n");
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

    // Write the name
    this.writeSchemaItemHeader(outputFilePath, customAttributeClass.name, customAttributeClass.schemaItemType, customAttributeClass.label, customAttributeClass.modifier, customAttributeClass.customAttributes);

    // Write the description
    this.writeSchemaItemDescription(outputFilePath, customAttributeClass.description);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, customAttributeClass.baseClass);

    // Write what it appliesTo
    if (containerTypeToString !== undefined)
      fs.appendFileSync(outputFilePath, "**Applies to:** " + containerTypeToString(customAttributeClass.containerType) + "\n\n");

    // Write the properties table
    // If the properties are undefined or have length 0, return
    if (!customAttributeClass.properties || customAttributeClass.properties.length === 0) return;

    // Write the properties header and table header
    fs.appendFileSync(outputFilePath,
      "#### Properties\n\n" +
      "|    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |\n" +
      "|:-----------|:------------|:------------|:-----------|:-----------------|:---------------|\n");

    // If the attribute is not there, return the place holder
    const helper = (( value: any ) => value !== undefined ? value : PLACE_HOLDER);

    for (const property of customAttributeClass.properties) {
      const name = helper(property.name);
      const label = helper(property.label);
      const category = helper(property.category);
      const isReadOnly = helper(property.isReadOnly);
      const priority = helper(property.priority);
      const description = helper(property.description);
      fs.appendFileSync(outputFilePath,
        "|" + name + "|" + description + "|" + label + "|" + category + "|" + isReadOnly + "|" + priority + "|\n");
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
    if (undefined === structClass) return;

    // Write the name
    this.writeSchemaItemHeader(outputFilePath, structClass.name, structClass.schemaItemType, structClass.label, structClass.modifier, structClass.customAttributes);

    // Write the description
    this.writeSchemaItemDescription(outputFilePath, structClass.description);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, structClass.baseClass);

    // Write the properties table
    // If the properties are undefined or have length 0, return
    if (!structClass.properties || structClass.properties.length === 0) return;

    // Write the properties header and table header
    fs.appendFileSync(outputFilePath,
      "#### Properties\n\n" +
      "|    Name    |  Description  |    Label    |  Category  |    Read Only     |    Priority    |\n" +
      "|:-----------|:--------------|:------------|:-----------|:-----------------|:---------------|\n");

    // If the attribute is not there, return the place holder
    const helper = (( value: any ) => value !== undefined ? value : PLACE_HOLDER);

    for (const property of structClass.properties) {
      const name = helper(property.name);
      const label = helper(property.label);
      const category = helper(property.category);
      const isReadOnly = helper(property.isReadOnly);
      const priority = helper(property.priority);
      const description = helper(property.description);

      fs.appendFileSync(outputFilePath,
        "|" + name + "|" + description + "|" + label + "|" + category + "|" + isReadOnly + "|" + priority + "|\n");
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
    this.writeSchemaItemHeader(outputFilePath, propertyCategory.name, propertyCategory.schemaItemType, propertyCategory.label, undefined, undefined);

    // Write the description
    this.writeSchemaItemDescription(outputFilePath, propertyCategory.description);

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

    for (const propertyCategory of propertyCategories)
      this.writePropertyCategory(outputFilePath, propertyCategory);
  }

  /**
   * Collects and writes markdown documentation for format classes
   * @param outputFilePath Path to file to write the format classes to
   * @param schema Schema to pull the format classes from
   */
  private static writeFormatClasses(outputFilePath: string, schema: Schema) {
      const formatClasses: Format[] = this.getSortedSchemaItems(schema, "Format");

      // If the list is empty or undefined, return
      if (!formatClasses || formatClasses.length === 0) return;

      // Write the h3 for the section
      fs.appendFileSync(outputFilePath, "## Formats\n\n");

      for (const formatClass of formatClasses) {
          this.writeFormatClass(outputFilePath, formatClass);
      }
  }

  /**
   * Writes markdown for a format class
   * @param outputFilePath Path to file to write markdown into
   * @param formatClass Format class to generate markdown for
   */
  public static writeFormatClass(outputFilePath: string, formatClass: Format | undefined) {
    if (formatClass === undefined) return;

    // Write the name
    this.writeSchemaItemHeader(outputFilePath, formatClass.name, formatClass.schemaItemType, formatClass.label, undefined, undefined);

    // Write the format type
    fs.appendFileSync(outputFilePath, "**type:** " + formatTypeToString(formatClass.type) + "\n\n");

    if (formatClass.type === FormatType.Scientific && formatClass.scientificType !== undefined)
        fs.appendFileSync(outputFilePath, "**Scientific Type:** " + scientificTypeToString(formatClass.scientificType) + "\n\n");

    if (formatClass.type === FormatType.Station && formatClass.stationOffsetSize !== undefined)
        fs.appendFileSync(outputFilePath, "**Station Offset Size:** " + formatClass.stationOffsetSize + "\n\n");

    // Write the precision
    if (formatClass.precision !== undefined)
        fs.appendFileSync(outputFilePath, "**Precision:** " + formatClass.precision + "\n\n");

    // Write format traits
    if (formatClass.formatTraits !== undefined) {
        fs.appendFileSync(outputFilePath, "**Format Traits**\n\n");
        for (const trait of formatTraitsToArray(formatClass.formatTraits))
            fs.appendFileSync(outputFilePath, "- " + trait + "\n");
        fs.appendFileSync(outputFilePath, "\n");
    }

    // Write uomSeparator
    // UGLY FORMATTING. FIX.
    if (formatClass.uomSeparator !== undefined)
        fs.appendFileSync(outputFilePath, "**uomSeparator:** `\"" + formatClass.uomSeparator + "\"`\n\n");
  }

  /**
   * Collects and writes markdown documentation for unit classes
   * @param outputFilePath Path to file to write the unit classes to
   * @param schema Schema to pull the unit classes from
   */
  private static writeUnitClasses(outputFilePath: string, schema: Schema) {
    const unitClasses: Unit[] = this.getSortedSchemaItems(schema, "Unit");

    // If the list is empty or undefined, return
    if (!unitClasses || unitClasses.length === 0) return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, "## Units\n\n");

    for (const unitClass of unitClasses)
      this.writeUnitClass(outputFilePath, unitClass);
  }

  /**
   * Writes markdown for a unit class
   * @param outputFilePath Path to file to write markdown into
   * @param unitClass Unit class to generate markdown for
   */
  public static writeUnitClass(outputFilePath: string, unitClass: Unit | undefined) {
    if (unitClass === undefined) return;

    // Write the name
    this.writeSchemaItemHeader(outputFilePath, unitClass.name, unitClass.schemaItemType, unitClass.label, undefined, undefined);

    // Write the description
    this.writeSchemaItemDescription(outputFilePath, unitClass.description);

    // Write the definition
    fs.appendFileSync(outputFilePath, "**Definition:** " + unitClass.definition + "\n\n");

    // Write the phenomenon name
    if (unitClass.phenomenon !== undefined)
      fs.appendFileSync(outputFilePath, "**Phenomenon**: " + unitClass.phenomenon.name + "\n\n");

    // Write the unit system
    if (unitClass.unitSystem !== undefined)
      fs.appendFileSync(outputFilePath, "**Unit System**: " + unitClass.unitSystem.name + "\n\n");
  }

  public xmlToSchema (schemaString: string, context: SchemaContext): Schema {
    const parser = new DOMParser();
    const document = parser.parseFromString(schemaString);
    const reader = new SchemaReadHelper(XmlParser, context);
    let schema: Schema = new Schema(context);
    schema = reader.readSchemaSync(schema, document);
    return schema;
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

    // Get the path of the directory that will contain the output md file
    let outputDir: string[] | string = outputFilePath.split(/(\/){1}|(\\){2}|(\\){1}/g);
    outputDir.pop();
    outputDir = outputDir.join(path.sep);

    // Check if the output directory exists
    if (!fs.existsSync(outputDir)) throw new ECJsonBadOutputPath(outputFilePath);

    const schemaString = fs.readFileSync(schemaPath, "utf8");
    let schemaJson: any;
    let schema;

    if (schemaPath.endsWith("json")) {
      try {
        schemaJson = JSON.parse(schemaString);
      } catch (e) {
        throw new ECJsonBadJson(schemaPath);
      }
      schema = Schema.fromJsonSync(schemaJson, this._context);
    } else if (schemaPath.endsWith("xml")) {
      schema = this.xmlToSchema(schemaString, this._context);
    }

    if (schema === undefined) {
      throw new ECJsonBadJson(schemaPath);
    }

    // Create the output file
    fs.writeFileSync(outputFilePath, "");

    // Generate all the markdown for each type of schema item
    ECJsonMarkdownGenerator.writeFrontMatter(outputFilePath, schema, nonReleaseFlag);
    ECJsonMarkdownGenerator.writeSchema(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeEntityClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeKindOfQuantityClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeRelationshipClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeEnumerationItems(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeMixinClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeCustomAttributeClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeStructClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writePropertyCategories(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeFormatClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeUnitClasses(outputFilePath, schema);

    // Remove the extra blank line
    removeExtraBlankLine(outputFilePath, outputFilePath);
  }
}

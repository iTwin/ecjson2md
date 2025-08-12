/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/

import * as fs from "fs";
import * as path from "path";

import {
  AnyClass, AnySchemaItem, classModifierToString, containerTypeToString, CustomAttributeClass, ECClassModifier, ECSchemaError,
  ECSchemaStatus, EntityClass, Enumeration, Format, InvertedUnit, KindOfQuantity, LazyLoadedECClass, Mixin, OverrideFormat, Phenomenon,
  primitiveTypeToString, Property, PropertyCategory, PropertyType, RelationshipClass, RelationshipConstraint, Schema, SchemaContext,
  SchemaItemType, strengthDirectionToString, strengthToString, StructClass, Unit, UnitSystem,
} from "@itwin/ecschema-metadata";
import { formatTraitsToArray, FormatType } from "@itwin/core-quantity";
import { SchemaJsonFileLocater, SchemaXmlFileLocater } from "@itwin/ecschema-locaters";
import { BadPropertyType, ECJsonBadJson, ECJsonBadOutputPath, ECJsonBadSearchPath, ECJsonFileNotFound } from "./Exception";
import { CustomAttributeSet } from "@itwin/ecschema-metadata/lib/cjs/Metadata/CustomAttribute";
import { DOMParser } from "@xmldom/xmldom";
import { SchemaReadHelper } from "@itwin/ecschema-metadata/lib/cjs/Deserialization/Helper";
import { XmlParser } from "@itwin/ecschema-metadata/lib/cjs/Deserialization/XmlParser";

const PLACE_HOLDER = "";

/**
 * Removes blank lines at the end of a file if there are some
 * @param inputFilePath File that may have consecutive lines
 * @param outputFilePath File to create without consecutive lines
 */
export function removeExtraBlankLines(inputFilePath: string, outputFilePath: string) {
  const fileBuffer = fs.readFileSync(inputFilePath).toString();

  const trimedFile = fileBuffer.replace(/^\s+|\s+$/g, "");
  if (inputFilePath !== outputFilePath)
    fs.writeFileSync(outputFilePath, trimedFile);
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
 * Converts a valid SchemaItemType to a display string.
 * @param schemaItemType The SchemaItemType to stringify.
 * @return A string label for the provided SchemaItemType. If the type is not valid, an empty string is returned.
 */
export function schemaItemToGroupName(schemaItemType: string): string {
  switch (schemaItemType) {
    case SchemaItemType.EntityClass: return "Entity Classes";
    case SchemaItemType.Constant: return "Constants";
    case SchemaItemType.CustomAttributeClass: return "Custom Attribute Classes";
    case SchemaItemType.Enumeration: return "Enumerations";
    case SchemaItemType.Format: return "Formats";
    case SchemaItemType.InvertedUnit: return "Inverted Units";
    case SchemaItemType.KindOfQuantity: return "Kind Of Quantities";
    case SchemaItemType.Mixin: return "Mixins";
    case SchemaItemType.Phenomenon: return "Phenomena";
    case SchemaItemType.PropertyCategory: return "Property Categories";
    case SchemaItemType.RelationshipClass: return "Relationship Classes";
    case SchemaItemType.StructClass: return "Struct Classes";
    case SchemaItemType.Unit: return "Units";
    case SchemaItemType.UnitSystem: return "Unit Systems";
    default: throw new ECSchemaError(ECSchemaStatus.InvalidSchemaItemType, "An invalid SchemaItemType has been provided.");
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
  return `[!alert text="${alertText}" kind="warning"]`;
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
  return `[${linkText}](${linkString })`;
}

/**
 * Returns a string containing the
 * @param schemaName
 */
function createSchemaLink(schemaName: string): string {
  // This is assuming that all ecschemas are right next to each other.
  return `./${schemaName.toLowerCase()}.ecschema.md`;
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
  if (!(outputDir[outputDir.length - 1] === path.sep))
    outputDir += path.sep;

  // Form the file name
  const inputPathParts = inputPath.split(/(\/){1}|(\\){2}|(\\){1}/g);
  let preppedOutputPath = `${outputDir}${inputPathParts[inputPathParts.length - 1].slice(0, -5)}.md`;

  // Resolve the absolute file path
  preppedOutputPath = path.resolve(preppedOutputPath);

  return preppedOutputPath;
}

/**
 * Returns a proper output path for a remarks file given the output directory path
 * and input file path
 *
 * @param rawOutputPath User given path to directory for output
 * @param {string} inputPath  User given path to input file (used for output file name)
 * @returns {string} Proper output file path
 */
export function prepRemarksPath(rawOutputPath: string, inputPath: string): string {
  // Replace common separators with os path separator
  let outputDir: string = path.normalize(rawOutputPath);

  // add a slash to the end of the user didn't provide one
  if (!(outputDir[outputDir.length - 1] === path.sep))
    outputDir += path.sep;

  // Form the file name
  const inputPathParts = inputPath.split(/(\/){1}|(\\){2}|(\\){1}/g);
  let preppedOutputPath = `${outputDir}${inputPathParts[inputPathParts.length - 1].slice(0, -14)}.remarks.md`;

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
      if (!fs.existsSync(dir))
        throw new ECJsonBadSearchPath(dir);
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
  public static writeSchema(outputMDFile: string, schema: Schema) {
    // Write the name of the schema as an <h1>
    fs.appendFileSync(outputMDFile, `# ${schema.name}`);

    // Write the label
    if (schema.label !== undefined)
      fs.appendFileSync(outputMDFile, ` (${schema.label})`);

    // Write the Schema badge
    fs.appendFileSync(outputMDFile, ` ${formatBadge("Schema", "Info")}\n\n`);

    // Write the alias of the schema
    if (schema.alias !== undefined)
      fs.appendFileSync(outputMDFile, `**Alias:** ${schema.alias}\n\n`);

    // Write the version of the schema
    if (schema.readVersion !== undefined && schema.writeVersion !== undefined && schema.minorVersion !== undefined)
      fs.appendFileSync(outputMDFile, `**Version:** ${schema.readVersion}.${schema.writeVersion}.${schema.minorVersion}\n\n`);

    // Write the description of the schema as a <p>
    if (schema.description !== undefined)
      fs.appendFileSync(outputMDFile, `${schema.description}\n\n`);
  }

  /**
   * Writes the front-matter to the specified file.
   * @param outputMDFile File to write the markdown to
   * @param schema Schema to get name from
   */
  public static writeFrontMatter(outputMDFile: string, schema: Schema, nonReleaseFlag?: boolean) {
    fs.appendFileSync(outputMDFile, "---\n");
    fs.appendFileSync(outputMDFile, "noEditThisPage: true\n");
    fs.appendFileSync(outputMDFile, `Schema: ${schema.name}\n`);
    fs.appendFileSync(outputMDFile, "Warning: This file was automatically generated via ecjson2md. Do not edit this file. Any edits made to this file will be overwritten the next time it is generated.\n");
    fs.appendFileSync(outputMDFile, "---\n\n");

    // Put an alert on the page if needed
    if (nonReleaseFlag) {
      fs.appendFileSync(outputMDFile, `${formatWarningAlert("This documentation represents a nonreleased version of this schema")}\n\n`);
    }
  }

  /**
   * Parses schema item name to linkable format.
   * @param notLinkableName string to parse
   */
  public static parseToLinkable(notLinkableName: string): string {
    const regex = /\ /gi;

    const lowerCased = notLinkableName.toLowerCase();
    const result = lowerCased.replace(regex, "-");

    return result;
  }
  /**
   * Generates table of contents for schema.
   * @param outputMDFile File to write the markdown to
   * @param schema Schmea to generate table of contents
   */
  public static generateTableOfContents(outputMDFile: string, schema: Schema) {
    fs.appendFileSync(outputMDFile, "## Table of contents\n");
    for (const value of Object.values(SchemaItemType)) {
      if (value) {
        const schemaItemType = value as SchemaItemType;
        const schemaItemGroupName = schemaItemToGroupName(schemaItemType);

        const schemaItemLink = this.parseToLinkable(schemaItemGroupName);
        const itemsOfType = this.getSortedSchemaItems(schema, schemaItemType);
        if (itemsOfType.length === 0) {
          continue;
        }

        fs.appendFileSync(outputMDFile, `- [${schemaItemGroupName}](#${schemaItemLink})\n`);
        for (const item of itemsOfType) {
          fs.appendFileSync(outputMDFile, `\t- [${item.name}](#${item.name.toLowerCase()})\n`);
        }
      }
    }
    fs.appendFileSync(outputMDFile, "\n");
  }

  /**
   * Returns a sorted list of the specified schema item
   * @param schema The schema to pull the items from
   * @param schemaItem The schema item type to sort
   */
  public static getSortedSchemaItems<Type extends AnySchemaItem>(schema: Schema, schemaItemType: SchemaItemType): Type[] {
    const selectedSchemaItems: Type[] = [];
    const allSchemaItems = schema.getItems();

    // For each item, only include it if it's the type that we are looking for
    for (const item of allSchemaItems) {
      if (item.schemaItemType === schemaItemType)
        selectedSchemaItems.push(item as Type);
    }

    // Sort the list of schema items by name and return it
    return selectedSchemaItems.sort((item1, item2) => {
      if (item1.name > item2.name)
        return 1;
      else if (item1.name < item2.name)
        return -1;
      else
        return 0;
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
      } catch (error) {
        try {
          return propertyTypeNumberToString(property._type);
        } catch (er) {
          return PLACE_HOLDER;
        }
      }
    }
  }

  public static indentStart(outputFilePath: string) {
    fs.appendFileSync(outputFilePath, "[!IndentStart]\n\n");
  }

  public static indentStop(outputFilePath: string) {
    fs.appendFileSync(outputFilePath, "[!IndentEnd]\n");
  }

  /**
   * Appends markdown to access the related information in iModel schema editor
   * @param schemaName Name of the schema
   * @param schemaItem Name of schema item
   * @param itemType Type of schema item
   * @param outputFilePath Path of output file
   */
  public static linkIModelSchemaEditorInfo(schemaName: string, schemaItem: string, itemType: string | undefined, outputFilePath: string) {
    const baseUrl = "https://imodelschemaeditor.bentley.com/?stage=browse&";
    if (schemaName && schemaItem && itemType && outputFilePath) {
      const linkSchemaEditor = `[<img src=".././media/imodel-schema-editor-icon.png">](${baseUrl}elementtype=${itemType}&id=${schemaName}.${schemaItem})`;
      fs.appendFileSync(outputFilePath, ` ${linkSchemaEditor}`);
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
  public static writeSchemaItemHeader(outputFilePath: string, name: string|undefined, type: SchemaItemType, schemaName: string, label?: string, modifier?: ECClassModifier, customAttributes?: CustomAttributeSet) {

    let addSchemaEditorInfo = true;

    if (name === undefined)
      return;

    fs.appendFileSync(outputFilePath, `### **${name}**`);

    if (label !== undefined)
      fs.appendFileSync(outputFilePath, ` (${label})`);

    if (modifier !== undefined) {
      const modifierString = classModifierToString(modifier);
      if (modifierString !== "None")
        fs.appendFileSync(outputFilePath, ` *${modifierString}*`);
    }

    if (type !== undefined) {
      fs.appendFileSync(outputFilePath, ` ${formatBadge(type, "info")}`);
    }

    if (customAttributes !== undefined) {
      const customAttribute = customAttributes.get("CoreCustomAttributes.Deprecated");
      if (customAttribute !== undefined) {
        fs.appendFileSync(outputFilePath, ` ${formatBadge("Deprecated", "warning")}`);
        this.linkIModelSchemaEditorInfo(schemaName, name, type, outputFilePath);
        addSchemaEditorInfo = false;
        if (customAttribute.Description)
          fs.appendFileSync(outputFilePath, `\n\n${formatWarningAlert(customAttribute.Description)}`);
      }
    }

    if (addSchemaEditorInfo)
      this.linkIModelSchemaEditorInfo(schemaName, name, type, outputFilePath);

    fs.appendFileSync(outputFilePath, "\n\n");
  }

  /**
   * Appends markdown for the description of a schema item to the specified file path
   * @param outputFilePath Path of file to append markdown to
   * @param description Description to write markdown for
   */
  public static writeSchemaItemDescription(outputFilePath: string, description: string|undefined) {
    if (description === undefined) {
      return;
    }

    fs.appendFileSync(outputFilePath, `${description}\n\n`);
  }

  /**
   * Appends markdown for the label of a schema item to the specified file path
   * @param outputFilePath Path of file to append markdown to
   * @param label Label to write markdown for
   */
  public static writeSchemaItemLabel(outputFilePath: string, label: string|undefined) {
    if (label === undefined)
      return;

    fs.appendFileSync(outputFilePath, `**Display Label:** ${label}\n\n`);
  }

  /**
   * Appends bemetalsmith link for the baseclass of a schema item to the specified file path
   * @param outputFilePath Path of file to append link to
   * @param baseClass Baseclass to write markdown for
   */
  public static writeSchemaItemBaseClass(outputFilePath: string, baseClass: LazyLoadedECClass|undefined) {
    if (baseClass === undefined)
      return;

    let baseClassLink = "#" + baseClass.name.toLowerCase();
    if (!outputFilePath.toLowerCase().includes(baseClass.schemaName.toLowerCase() + ".ecschema.md"))
      baseClassLink = createSchemaLink(baseClass.schemaName) + baseClassLink;
    const baseClassName = baseClass.schemaName + ":" + baseClass.name;

    fs.appendFileSync(outputFilePath, `**Base Class:** ${formatLink(baseClassLink, baseClassName)}\n\n`);
  }

  /**
   * Appends markdown for the modifier of a schema item to the specified file path
   * @param outputFilePath Path of file to append markdown for modifier to
   * @param modifier Modifier to write markdown for
   */
  public static writeSchemaItemModifier(outputFilePath: string, modifier: ECClassModifier|undefined) {
    if (modifier === undefined)
      return;

    fs.appendFileSync(outputFilePath, `**Modifier:** ${classModifierToString(modifier)}\n\n`);
  }

  /**
   * Appends markdown for priority of a schema item to the specified file path
   * @param outputFilePath Path to append markdown for priority to
   * @param priority Priority to write markdown for
   */
  public static writeSchemaItemPriority(outputFilePath: string, priority: number) {
    if (priority === undefined)
      return;

    fs.appendFileSync(outputFilePath, `**Priority:** ${priority}\n\n`);
  }

  /**
   * Writes a markdown table row for an EC Entity Class
   * @param outputFilePath File to write the markdown to
   * @param property Property to pull the information from
   */
  private static writePropertiesRow(outputFilePath: string, property: Property): void {
    // If the attribute is not there, return the place holder
    const helper = (( value: string|undefined ) => value !== undefined ? value : PLACE_HOLDER);

    // property type in string
    let type = ECJsonMarkdownGenerator.propertyTypeToString(property);

    // If the property type is navigation, create a link to the class that it points to
    if (property.isNavigation()) {
      const targetSchema = property.relationshipClass.schemaName;
      const targetClass = property.relationshipClass.name;

      type = formatLink(`${createSchemaLink(targetSchema)}#${targetClass.toLowerCase()}`, type);
    }

    const name = helper(property.name);
    const description = helper(property.description);
    let extendedType = "";
    if (property.isEnumeration() || property.isPrimitive())
      extendedType = helper(property.extendedTypeName);

    fs.appendFileSync(outputFilePath, `|${name}|${description}|${type}|${extendedType}|\n`);
  }

  private static writeEntityClassPropertiesTable(outputFilePath: string, entityClass: EntityClass): void {
    const entityClassProps = entityClass.getPropertiesSync(true);
    const propsIterable = entityClassProps !== undefined ? entityClassProps : [];
    const entityHeader = "|    Name    |    Description    |    Type    |      Extended Type     |\n" +
                         "|:-----------|:------------------|:-----------|:-----------------------|\n";

    const properties = [...propsIterable];
    // Print class properties
    if (properties.length !== 0) {
      fs.appendFileSync(outputFilePath, "#### Properties\n\n");
      fs.appendFileSync(outputFilePath, entityHeader);

      // Write each table row
      for (const property of properties) {
        this.writePropertiesRow(outputFilePath, property);
      }
      fs.appendFileSync(outputFilePath, "\n");
    }
    // Write inherited properties table
    if (entityClass.baseClass !== undefined) {
      this.writeInheritedProperties(outputFilePath, entityClass);
    }
  }

  /**
   * Writes markdown documentation for an entity class
   * @param outputFilePath Path to file to append markdown to
   * @param entityClass Entity class to generate markdown for
   */
  public static writeEntityClass(outputFilePath: string, entityClass: EntityClass | undefined, schemaName: string) {
    if (entityClass === undefined)
      return;

    // Write the name of the class
    this.writeSchemaItemHeader(outputFilePath, entityClass.name, entityClass.schemaItemType, schemaName, entityClass.label, entityClass.modifier, entityClass.customAttributes);

    // Begin Indentation
    this.indentStart(outputFilePath);

    // Write the description of the entity class
    this.writeSchemaItemDescription(outputFilePath, entityClass.description);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, entityClass.baseClass);

    // Write the properties
    this.writeEntityClassPropertiesTable(outputFilePath, entityClass);

    // Finish Indentation
    this.indentStop(outputFilePath);
  }

  /**
   * Writes the entity classes from a schema as markdown to the output file
   * @param outputFilePath Path to the file to write the markdown into
   * @param schema Schema to pull the entity class information from
   */
  private static writeEntityClasses(outputFilePath: string, schema: Schema) {
    // Get a sorted list of the entity classes in the schema
    const entityClasses = this.getSortedSchemaItems<EntityClass>(schema, SchemaItemType.EntityClass);

    // If the list is empty or undefined, return
    if (!entityClasses || entityClasses.length === 0)
      return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, `## ${schemaItemToGroupName(SchemaItemType.EntityClass)}\n\n`);

    for (const entityClass of entityClasses)
      this.writeEntityClass(outputFilePath, entityClass, schema.name);
  }

  /**
   * Generates markdown documentation for the kind of quantity
   * @param outputFilePath path to file to append markdown documentation to
   * @param kindOfQuantity kind of quantity to generate markdown for
   */
  public static async writeKindOfQuantityClass(outputFilePath: string, kindOfQuantity: KindOfQuantity|undefined, schema: Schema) {
    if (kindOfQuantity === undefined)
      return;

    // Write the name of the class
    this.writeSchemaItemHeader(outputFilePath, kindOfQuantity.name, kindOfQuantity.schemaItemType, schema.name, kindOfQuantity.label, undefined, undefined);

    // Begin indentation
    this.indentStart(outputFilePath);

    // Write the description of the entity class
    this.writeSchemaItemDescription(outputFilePath, kindOfQuantity.description);

    // Write the relative error
    if (kindOfQuantity.relativeError !== undefined)
      fs.appendFileSync(outputFilePath, `**Relative Error:** ${kindOfQuantity.relativeError}\n\n`);

    // Write the persistence unit
    if (kindOfQuantity.persistenceUnit !== undefined)
      fs.appendFileSync(outputFilePath, `**Persistence Unit:** ${kindOfQuantity.persistenceUnit.name}\n\n`);

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
                const loadedUnit = await pfUnit[0];
                const unitLink = formatLink((loadedUnit.schema.name !== schema.name ? createSchemaLink(loadedUnit.schema.name) : "") + "#" + loadedUnit.name.toLowerCase(), loadedUnit.name);
                unitOverrides += `[ ${unitLink + (undefined === pfUnit[1] ? "" : "|" + pfUnit[1])} ]`;
              }

            fs.appendFileSync(outputFilePath, `- ${formatLink(formatClassLink, formatClassName)}${formatAdditional}${unitOverrides}\n`);
          } else {
            schemaName = (await pFormat).schema.name;
            const formatClassLink = (schemaName !== schema.name ? createSchemaLink(schemaName.toLowerCase()) : "") + "#" + pFormat.name.toLowerCase();
            fs.appendFileSync(outputFilePath, `- ${formatLink(formatClassLink, pFormat.name)}\n`);
          }
        }
        fs.appendFileSync(outputFilePath, "\n");
      }
    }

    // Finish indentaion
    this.indentStop(outputFilePath);
  }

  /**
   * Collects and generates markdown for kind of quantity schema items in a markdown file at the specified file path
   * @param outputFilePath Path to write the markdown table to
   * @param schema Schema to pull the kind of quantity items from
   */
  private static async writeKindOfQuantityClasses(outputFilePath: string, schema: Schema) {
    const koqItems: KindOfQuantity[] = this.getSortedSchemaItems(schema, SchemaItemType.KindOfQuantity);

    // If the list is empty or undefined, return
    if (!koqItems || koqItems.length === 0)
      return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, `## ${schemaItemToGroupName(SchemaItemType.KindOfQuantity)}\n\n`);

    for (const item of koqItems)
      await this.writeKindOfQuantityClass(outputFilePath, item, schema);
  }

  private static writeRelationshipConstraintSection(outputFilePath: string, constraint: RelationshipConstraint | undefined) {
    if (constraint === undefined)
      return;
    // Begin nested indentation
    this.indentStart(outputFilePath);

    // Write the constraint information
    fs.appendFileSync(outputFilePath, `**Is Polymorphic:** ${constraint.polymorphic}\n\n`);
    fs.appendFileSync(outputFilePath, `**Role Label:** ${constraint.roleLabel}\n\n`);
    fs.appendFileSync(outputFilePath, `**Multiplicity:** ${constraint.multiplicity}\n\n`);
    fs.appendFileSync(outputFilePath, "#### Constraint Classes:\n");

    // If the constraint classes are undefined or there are none, return
    if (!constraint.constraintClasses || constraint.constraintClasses.length === 0)
      return;

    // Write the constraint classes as a list
    for (const constraintClass of constraint.constraintClasses) {
      const constraintClassLink = `${createSchemaLink(constraintClass.schemaName)}#${constraintClass.name.toLowerCase()}`;
      fs.appendFileSync(outputFilePath, `- ${formatLink(constraintClassLink, constraintClass.name)}\n`);
    }

    // Finish nested indentation
    this.indentStop(outputFilePath);
  }

  /**
   * Generates markdown documentation for relationship class
   * @param outputFilePath Path to file to append markdown to
   * @param relationshipClass Class to generate markdown for
   */
  public static writeRelationshipClass(outputFilePath: string, relationshipClass: RelationshipClass|undefined, schemaName: string) {
    if (relationshipClass === undefined)
      return;

    // Write the name of the class
    this.writeSchemaItemHeader(outputFilePath, relationshipClass.name, relationshipClass.schemaItemType, schemaName, relationshipClass.label, relationshipClass.modifier, relationshipClass.customAttributes);

    // Begin Indentation
    this.indentStart(outputFilePath);

    // Write the description of the entity class
    this.writeSchemaItemDescription(outputFilePath, relationshipClass.description);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, relationshipClass.baseClass);

    // Write the strength
    if (relationshipClass.strength !== undefined)
      fs.appendFileSync(outputFilePath, `**Strength:** ${strengthToString(relationshipClass.strength)}\n\n`);

    // Write the strength direction
    if (relationshipClass.strengthDirection !== undefined)
      fs.appendFileSync(outputFilePath, `**Strength Direction:** ${strengthDirectionToString(relationshipClass.strengthDirection)}\n\n`);

    // Write the source section
    fs.appendFileSync(outputFilePath, "#### Source\n");
    // Write the relationship constraints info for the source section
    this.writeRelationshipConstraintSection(outputFilePath, relationshipClass.source);

    // Write the target section
    fs.appendFileSync(outputFilePath, "#### Target\n");
    // Write the relationship constraints info for the target section
    this.writeRelationshipConstraintSection(outputFilePath, relationshipClass.target);

    // Finish Indentation
    this.indentStop(outputFilePath);
  }

  /**
   * Collects and generates markdown documentation for relationship classes
   * @param outputFilePath Path to file to append the markdown to
   * @param schema Schema to pull relationship classes from
   */
  private static writeRelationshipClasses(outputFilePath: string, schema: Schema) {
    const relationshipClasses: RelationshipClass[] = this.getSortedSchemaItems(schema, SchemaItemType.RelationshipClass);

    // If the class list is undefined or empty, return
    if (!relationshipClasses || relationshipClasses.length === 0)
      return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, `## ${schemaItemToGroupName(SchemaItemType.RelationshipClass)}\n\n`);

    for (const relationshipClass of relationshipClasses)
      this.writeRelationshipClass(outputFilePath, relationshipClass, schema.name);
  }

  private static writeEnumerationTable(outputFilePath: string, enumeration: Enumeration) {
    const enumerators = enumeration.enumerators;

    // If the enumerators are undefined or there are none, return
    if (!enumerators || enumerators.length === 0)
      return;

    // If the attribute is not there, return the place holder
    const helper = (( value: string | undefined ) => value !== undefined ? value : PLACE_HOLDER);

    // Write the table header
    fs.appendFileSync(outputFilePath, "\n");
    fs.appendFileSync(outputFilePath,
      "|    Label    |    Value    |    Description    |\n" +
      "|:------------|:------------|:------------------|\n");

    for (const enumerator of enumerators) {
      const label = helper(enumerator.label).replace(/\|/g, "\\|");
      const value = enumerator.value;
      const description = helper(enumerator.description).replace(/\|/g, "\\|");

      // Write the table row
      fs.appendFileSync(outputFilePath, `|${label}|${value}|${description}|\n`);
    }
    fs.appendFileSync(outputFilePath, "\n");
  }

  /**
   * Generates markdown documentation for an enumeration item
   * @param outputFilePath File path to append markdown documentation to
   * @param enumerationItem Enumeration to generate markdown for
   */
  public static writeEnumerationItem(outputFilePath: string, enumerationItem: Enumeration|undefined, schemaName: string) {
    if (enumerationItem === undefined)
      return;

    // Write the name of the class
    this.writeSchemaItemHeader(outputFilePath, enumerationItem.name, enumerationItem.schemaItemType, schemaName, enumerationItem.label, undefined, undefined);

    // Begin Indentation
    this.indentStart(outputFilePath);

    // Write wether the enum is an int or string
    if (enumerationItem.isInt)
      fs.appendFileSync(outputFilePath, "**Backing Type:** int\n\n");
    if (enumerationItem.isString)
      fs.appendFileSync(outputFilePath, "**Backing Type:** string\n\n");

    // Write the description of the entity class
    this.writeSchemaItemDescription(outputFilePath, enumerationItem.description);

    // Write wether or not the enum is strict
    if (enumerationItem.isStrict !== undefined)
      fs.appendFileSync(outputFilePath, `**Strict:** ${enumerationItem.isStrict}\n`);

    // Write the enumeration table
    this.writeEnumerationTable(outputFilePath, enumerationItem);

    // Finish Indentation
    this.indentStop(outputFilePath);
  }

  /**
   * Collects and generates markdown documentation for enumeration items in a schema
   * @param outputFilePath File path to append markdown documentation to
   * @param schema Schema to pull enumeration items from
   */
  private static writeEnumerationItems(outputFilePath: string, schema: Schema) {
    const enumerationItems: Enumeration[] = this.getSortedSchemaItems(schema, SchemaItemType.Enumeration);

    // If the enumeration list is undefined or empty, return
    if (!enumerationItems || enumerationItems.length === 0)
      return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, `## ${schemaItemToGroupName(SchemaItemType.Enumeration)}\n\n`);

    for (const enumerationItem of enumerationItems)
      this.writeEnumerationItem(outputFilePath, enumerationItem, schema.name);
  }

  /**
   * Generates markdown documentation for a mixin class
   * @param outputFilePath Path to file to append the markdown to
   * @param mixin Mixin class to generate markdown for
   */
  public static writeMixinClass(outputFilePath: string, mixin: Mixin|undefined, schemaName: string) {
    if (mixin === undefined)
      return;

    // Write the name of the mixin
    this.writeSchemaItemHeader(outputFilePath, mixin.name, mixin.schemaItemType, schemaName, mixin.label, mixin.modifier, mixin.customAttributes);

    // Begin Indentation
    this.indentStart(outputFilePath);

    // Write the description of the mixin class
    this.writeSchemaItemDescription(outputFilePath, mixin.description);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, mixin.baseClass);

    // Link to what the mixin applies to
    if (mixin.appliesTo !== undefined) {
      const appliesToLink = `${createSchemaLink(mixin.appliesTo.schemaName)}#${mixin.appliesTo.name.toLowerCase()}`;

      // Write a link to what the mixin applies to
      fs.appendFileSync(outputFilePath, `**Applies To:** ${formatLink(appliesToLink, mixin.appliesTo.name)}\n\n`);
    }

    const mixinProperties = mixin.getPropertiesSync(true);
    const propsIterable = mixinProperties !== undefined ? mixinProperties : [];
    const properties = [...propsIterable];
    // If the properties are undefined or empty, continue with next
    if (properties !== undefined && properties.length !== 0) {
      // Write the properties header and table header
      fs.appendFileSync(outputFilePath,
        "#### Properties\n\n" +
        "|    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |\n" +
        "|:-----------|:------------|:------------|:-----------|:-----------------|:---------------|\n");

      // If the attribute is not there, return the place holder
      const helper = (( value: string|undefined ) => value !== undefined ? value : PLACE_HOLDER);

      for (const property of properties) {
        const name = helper(property.name);
        const label = helper(property.label);
        // tslint:disable-next-line
        const category = property.category !== undefined ? property.category : PLACE_HOLDER;
        const isReadOnly = property.isReadOnly;
        const priority = property.priority;
        const description = helper(property.description);

        fs.appendFileSync(outputFilePath, `|${name}|${description}|${label}|${category}|${isReadOnly}|${priority}|\n`);
      }
      fs.appendFileSync(outputFilePath, "\n");
    }
    // Write inherited properties table
    if (mixin.baseClass !== undefined) {
      this.writeInheritedProperties(outputFilePath, mixin);
    }

    // Finish Indentation
    this.indentStop(outputFilePath);
  }

  /**
   * Collects and generates markdown documentation for mixin classes in a schema
   * @param outputFilePath Path to file to append markdown to
   * @param schema Schema to pull mixin classes from
   */
  private static writeMixinClasses(outputFilePath: string, schema: Schema) {
    const mixinClasses: Mixin[] = this.getSortedSchemaItems(schema, SchemaItemType.Mixin);

    // If the mixin class list is undefined or empty, return
    if (!mixinClasses || mixinClasses.length === 0)
      return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, `## ${schemaItemToGroupName(SchemaItemType.Mixin)}\n\n`);

    for (const mixin of mixinClasses)
      this.writeMixinClass(outputFilePath, mixin, schema.name);
  }

  /**
   * Generate markdown documentation for a custom attribute class
   * @param outputFilePath Path to file to append markdown to
   * @param customAttributeClass custom attribute class to generate markdown for
   */
  public static writeCustomAttributeClass(outputFilePath: string, customAttributeClass: CustomAttributeClass|undefined, schemaName: string) {
    if (customAttributeClass === undefined)
      return;

    // Write the name
    this.writeSchemaItemHeader(outputFilePath, customAttributeClass.name, customAttributeClass.schemaItemType, schemaName, customAttributeClass.label, customAttributeClass.modifier, customAttributeClass.customAttributes);

    // Begin Indentation
    this.indentStart(outputFilePath);

    // Write the description
    this.writeSchemaItemDescription(outputFilePath, customAttributeClass.description);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, customAttributeClass.baseClass);

    // Write what it appliesTo
    if (containerTypeToString !== undefined)
      fs.appendFileSync(outputFilePath, `**Applies to:** ${containerTypeToString(customAttributeClass.appliesTo)}\n`);

    // Write the properties table
    this.writeCustomAttributeTable(outputFilePath, customAttributeClass);

    // Write inherited properties table
    if (customAttributeClass.baseClass !== undefined) {
      this.writeInheritedProperties(outputFilePath, customAttributeClass);
    }

    // Finish Indentation
    this.indentStop(outputFilePath);
  }
  /**
   * Generate and write inherited properties table for schema item
   * @param outputFilePath Path to file to append markdown to
   * @param schemaClass schema class to write inherited properties for
   */
  private static writeInheritedProperties(outputFilePath: string, schemaClass: AnyClass) {
    let properties: any;
    let propsIterable;
    const schemaClassProps = schemaClass.getPropertiesSync(true);
    const header = "|    Name    |    Description    |    Type    |      Extended Type     |\n" +
                   "|:-----------|:------------------|:-----------|:-----------------------|\n";

    if (schemaClassProps !== undefined) {
      propsIterable = schemaClassProps;
      properties = [...propsIterable];
    }

    if (properties === undefined || properties.length === 0) {
      properties = [];
    }

    const allProperties = [...schemaClass.getPropertiesSync()];
    if (allProperties === undefined || allProperties.length === 0 ) {
      return;
    }
    // Write collapsable section
    fs.appendFileSync(outputFilePath, "<details>\n");
    fs.appendFileSync(outputFilePath, "<summary>Inherited properties</summary>\n\n");
    // Write the table header
    fs.appendFileSync(outputFilePath, `${header}`);

    for (const prop of allProperties) {
      if (!properties.includes(prop)) {
        this.writePropertiesRow(outputFilePath, prop);
      }
    }
    fs.appendFileSync(outputFilePath, "</details>\n\n");
  }

  private static writeCustomAttributeTable(outputFilePath: string, customAttributeClass: CustomAttributeClass) {
    const customAttributeProps = customAttributeClass.getPropertiesSync(true);
    const propsIterable = customAttributeProps !== undefined ? customAttributeProps : [];
    const tableHeader = `|    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |\n` +
                        `|:-----------|:------------|:------------|:-----------|:-----------------|:---------------|\n`;

    const properties = [...propsIterable];
    if (properties !== undefined && properties.length !== 0) {
      // Write the properties header and table header
      fs.appendFileSync(outputFilePath, "#### Properties\n\n");
      fs.appendFileSync(outputFilePath, tableHeader);

      // If the attribute is not there, return the place holder
      const helper = (( value: string|undefined ) => value !== undefined ? value : PLACE_HOLDER);

      for (const property of properties) {
        const name = helper(property.name);
        const label = helper(property.label);
        const category = property.category !== undefined ? property.category : PLACE_HOLDER;
        const isReadOnly = property.isReadOnly;
        const priority = property.priority;
        const description = helper(property.description);
        fs.appendFileSync(outputFilePath, `|${name}|${description}|${label}|${category}|${isReadOnly}|${priority}|\n`);
      }
    }
    fs.appendFileSync(outputFilePath, "\n");
  }

  /**
   * Collect and generate markdown documentation for custom attribute classes
   * @param outputFilePath Path to file to write the markdown to
   * @param schema Schema to putt the custom attribute classes from
   */
  private static writeCustomAttributeClasses(outputFilePath: string, schema: Schema) {
    const customAttributeClasses: CustomAttributeClass[] = this.getSortedSchemaItems(schema, SchemaItemType.CustomAttributeClass);

    // If the mixin class list is undefined or empty, return
    if (!customAttributeClasses || customAttributeClasses.length === 0)
      return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, `## ${schemaItemToGroupName(SchemaItemType.CustomAttributeClass)}\n\n`);

    for (const customAttributeClass of customAttributeClasses)
      this.writeCustomAttributeClass(outputFilePath, customAttributeClass, schema.name);
  }

  /**
   * Writes markdown for a struct class0
   * @param outputFilePath Path to file to write markdown into
   * @param structClass Struct class to generate markdown for
   */
  public static writeStructClass(outputFilePath: string, structClass: StructClass | undefined, schemaName: string) {
    if (structClass === undefined)
      return;
    // Write the name
    this.writeSchemaItemHeader(outputFilePath, structClass.name, structClass.schemaItemType, schemaName, structClass.label, structClass.modifier, structClass.customAttributes);

    // Begin Indentation
    this.indentStart(outputFilePath);

    // Write the description
    this.writeSchemaItemDescription(outputFilePath, structClass.description);

    // Write the base class
    this.writeSchemaItemBaseClass(outputFilePath, structClass.baseClass);

    const structClassProps = structClass.getPropertiesSync(true);
    const propsIterable = structClassProps !== undefined ? structClassProps : [];
    const properties = [...propsIterable];
    // Write the properties table
    // If the properties are undefined or have length 0, return
    if (!properties|| properties.length === 0) {
      this.indentStop(outputFilePath);
      return;
    }

    // Write the properties header and table header
    fs.appendFileSync(outputFilePath,
      "#### Properties\n\n" +
      "|    Name    |  Description  |    Label    |  Category  |    Read Only     |    Priority    |\n" +
      "|:-----------|:--------------|:------------|:-----------|:-----------------|:---------------|\n");

    // If the attribute is not there, return the place holder
    const helper = (( value: string|undefined ) => value !== undefined ? value : PLACE_HOLDER);

    for (const property of properties) {
      const name = helper(property.name);
      const label = helper(property.label);
      const category = property.category !== undefined ? property.category : PLACE_HOLDER;
      const isReadOnly = property.isReadOnly;
      const priority = property.priority;
      const description = helper(property.description);

      fs.appendFileSync(outputFilePath, `|${name}|${description}|${label}|${category}|${isReadOnly}|${priority}|\n`);
    }
    fs.appendFileSync(outputFilePath, "\n");

    // Write inherited properties table
    if (structClass.baseClass !== undefined) {
      this.writeInheritedProperties(outputFilePath, structClass);
    }

    // Finish Indentation
    this.indentStop(outputFilePath);
  }

  /**
   * Collects and writes markdown documentation for struct classes
   * @param outputFilePath Path to file to write the struct classes to
   * @param schema Schema to pull the struct classes from
   */
  private static writeStructClasses(outputFilePath: string, schema: Schema) {
    const structClasses: StructClass[] = this.getSortedSchemaItems(schema, SchemaItemType.StructClass);

    // If the struct class list is undefined or empty, return
    if (!structClasses || structClasses.length === 0)
      return;

    for (const structClass of structClasses)
      this.writeStructClass(outputFilePath, structClass, schema.name);
  }

  /**
   * Writes markdown for a property category
   * @param outputFilePath Path to file to write markdown into
   * @param propertyCategory Property category to generate markdown for
   */
  public static writePropertyCategory(outputFilePath: string, propertyCategory: PropertyCategory | undefined, schemaName: string) {
    if (propertyCategory === undefined)
      return;
    // Write the name
    this.writeSchemaItemHeader(outputFilePath, propertyCategory.name, propertyCategory.schemaItemType, schemaName, propertyCategory.label, undefined, undefined);

    // Begin Indentation
    this.indentStart(outputFilePath);

    // Write the description
    this.writeSchemaItemDescription(outputFilePath, propertyCategory.description);

    // Write the priority
    this.writeSchemaItemPriority(outputFilePath, propertyCategory.priority);

    // Finish Indentataion
    this.indentStop(outputFilePath);
  }

  /**
   * Collects and writes markdown documentation for property categories
   * @param outputFilePath Path to file to write the property categories to
   * @param schema Schema to pull the property categories from
   */
  private static writePropertyCategories(outputFilePath: string, schema: Schema) {
    const propertyCategories: PropertyCategory[] = this.getSortedSchemaItems(schema, SchemaItemType.PropertyCategory);

    for (const propertyCategory of propertyCategories)
      this.writePropertyCategory(outputFilePath, propertyCategory, schema.name);
  }

  /**
   * Collects and writes markdown documentation for format classes
   * @param outputFilePath Path to file to write the format classes to
   * @param schema Schema to pull the format classes from
   */
  private static writeFormatClasses(outputFilePath: string, schema: Schema) {
    const formatClasses: Format[] = this.getSortedSchemaItems(schema, SchemaItemType.Format);

    // If the list is empty or undefined, return
    if (!formatClasses || formatClasses.length === 0)
      return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, `## ${schemaItemToGroupName(SchemaItemType.Format)}\n\n`);

    for (const formatClass of formatClasses) {
      this.writeFormatClass(outputFilePath, formatClass, schema.name);
    }
  }

  /**
   * Writes markdown for a Format class
   * @param outputFilePath Path to file to write markdown into
   * @param formatClass Format class to generate markdown for
   */
  public static writeFormatClass(outputFilePath: string, formatClass: Format | undefined, schemaName: string) {
    if (formatClass === undefined)
      return;

    // Write the name
    this.writeSchemaItemHeader(outputFilePath, formatClass.name, formatClass.schemaItemType, schemaName, formatClass.label, undefined, undefined);

    // Begin Indentation
    this.indentStart(outputFilePath);

    // Write the format type
    fs.appendFileSync(outputFilePath, `**Type:** ${formatClass.type}\n\n`);

    if (formatClass.type === FormatType.Scientific && formatClass.scientificType !== undefined) {
      fs.appendFileSync(outputFilePath, `**Scientific Type:** ${formatClass.scientificType}\n\n`);
    }

    if (formatClass.type === FormatType.Station && formatClass.stationOffsetSize !== undefined)
      fs.appendFileSync(outputFilePath, `**Station Offset Size:** ${formatClass.stationOffsetSize}\n\n`);

    // Write the precision
    if (formatClass.precision !== undefined) {
      fs.appendFileSync(outputFilePath, `**Precision:** ${formatClass.precision}\n\n`);
    }

    // Write the showSignOption
    if (formatClass.showSignOption !== undefined)
      fs.appendFileSync(outputFilePath, `**Show Sign Option:** ${formatClass.showSignOption}\n\n`);

    // Write format traits
    if (formatClass.formatTraits !== undefined) {
      fs.appendFileSync(outputFilePath, "**Format Traits**\n");
      for (const trait of formatTraitsToArray(formatClass.formatTraits))
        fs.appendFileSync(outputFilePath, `- ${trait}\n`);
    }
    fs.appendFileSync(outputFilePath, "\n");

    // Write uomSeparator
    // UGLY FORMATTING. FIX.
    if (formatClass.uomSeparator === "") {
      fs.appendFileSync(outputFilePath, "**Separator:** None\n\n");
    } else if (formatClass.uomSeparator === " ") {
      fs.appendFileSync(outputFilePath, "**Separator:** <code> </code> (Space)\n\n");
    } else {
      fs.appendFileSync(outputFilePath, `**Separator:** ${formatClass.uomSeparator}\n\n`);
    }

    // Finish Indenation
    this.indentStop(outputFilePath);
  }

  /**
   * Collects and writes markdown documentation for unit classes
   * @param outputFilePath Path to file to write the unit classes to
   * @param schema Schema to pull the unit classes from
   */
  private static writeUnitClasses(outputFilePath: string, schema: Schema) {
    const unitClasses: Unit[] = this.getSortedSchemaItems(schema, SchemaItemType.Unit);

    // If the list is empty or undefined, return
    if (!unitClasses || unitClasses.length === 0)
      return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, `## ${schemaItemToGroupName(SchemaItemType.Unit)}\n\n`);

    for (const unitClass of unitClasses) {
      this.writeUnitClass(outputFilePath, unitClass, schema.name);
    }

    const invertedUnits: InvertedUnit[] = this.getSortedSchemaItems(schema, SchemaItemType.InvertedUnit);
    if (!invertedUnits || invertedUnits.length === 0)
      return;

    for (const invertedUnit of invertedUnits)
      this.writeInvertedUnit(outputFilePath, invertedUnit, schema.name);
  }

  public static writeInvertedUnit(outputFilePath: string, invertedUnit: InvertedUnit | undefined, schemaName: string) {
    if (undefined === invertedUnit)
      return;

    this.writeSchemaItemHeader(outputFilePath, invertedUnit.name, invertedUnit.schemaItemType, schemaName, invertedUnit.label, undefined, undefined);
    this.indentStart(outputFilePath);
    this.writeSchemaItemDescription(outputFilePath, invertedUnit.description);
    if (undefined !== invertedUnit.invertsUnit && undefined !== invertedUnit.invertsUnit.name) {
      const invertsUnit = invertedUnit.schema.getItemSync(invertedUnit.invertsUnit.name) as Unit;
      fs.appendFileSync(outputFilePath, `**Inverts Unit:** ${invertsUnit.name}\n\n`);
      if (undefined !== invertsUnit.phenomenon)
        fs.appendFileSync(outputFilePath, `**Phenomenon:** ${invertsUnit.phenomenon.name}\n\n`);
    }
    if (undefined !== invertedUnit.unitSystem)
      fs.appendFileSync(outputFilePath, `**Unit System:** ${invertedUnit.unitSystem.name}\n\n`);
    this.indentStop(outputFilePath);
  }

  /**
   * Writes markdown for a Unit class
   * @param outputFilePath Path to file to write markdown into
   * @param unitClass Unit class to generate markdown for
   */
  public static writeUnitClass(outputFilePath: string, unitClass: Unit | undefined, schemaName: string) {
    if (unitClass === undefined)
      return;

    // Write the name
    this.writeSchemaItemHeader(outputFilePath, unitClass.name, unitClass.schemaItemType, schemaName, unitClass.label, undefined, undefined);

    // Begin Indentation
    this.indentStart(outputFilePath);

    // Write the description
    this.writeSchemaItemDescription(outputFilePath, unitClass.description);

    // Write the definition
    fs.appendFileSync(outputFilePath, `**Definition:** ${unitClass.definition}\n\n`);

    // Write the phenomenon name
    if (unitClass.phenomenon !== undefined)
      fs.appendFileSync(outputFilePath, `**Phenomenon:** ${unitClass.phenomenon.name}\n\n`);

    // Write the unit system
    if (unitClass.unitSystem !== undefined)
      fs.appendFileSync(outputFilePath, `**Unit System:** ${unitClass.unitSystem.name}\n\n`);

    // Write the numerator and denominator
    if (unitClass.numerator !== 1 && unitClass.denominator === 1) {
      fs.appendFileSync(outputFilePath, `**Numerator:** ${unitClass.numerator.toString()}\n\n`);
    } else if (unitClass.denominator !== 1) {
      fs.appendFileSync(outputFilePath, `**Numerator:** ${unitClass.numerator.toString()}\n\n`);
      fs.appendFileSync(outputFilePath, `**Denominator:** ${unitClass.denominator.toString()}\n\n`);
    }

    // Write the offset
    if (unitClass.offset !== 0)
      fs.appendFileSync(outputFilePath, `**Offset:** ${unitClass.offset.toString()}\n\n`);
    //  Finish Indentation
    this.indentStop(outputFilePath);
  }

  /**
   * Collects and writes markdown documentation for phenomenon classes
   * @param outputFilePath Path to file to write the phenomenon classes to
   * @param schema Schema to pull the format classes from
   */
  private static writePhenomenonClasses(outputFilePath: string, schema: Schema) {
    const phenomenonClasses: Phenomenon[] = this.getSortedSchemaItems(schema, SchemaItemType.Phenomenon);

    // If the list is empty or undefined, return
    if (!phenomenonClasses || phenomenonClasses.length === 0)
      return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, `## ${schemaItemToGroupName(SchemaItemType.Phenomenon)}\n\n`);

    for (const phenomenonClass of phenomenonClasses) {
      this.writePhenomenonClass(outputFilePath, phenomenonClass, schema.name);
    }
  }

  /**
   * Writes markdown for a Phenomenon class
   * @param outputFilePath Path to file to write markdown into
   * @param phenomenonClass Phenomenon class to generate markdown for
   */
  public static writePhenomenonClass(outputFilePath: string, phenomenonClass: Phenomenon | undefined, schemaName: string) {
    if (phenomenonClass === undefined)
      return;

    // Write the name
    this.writeSchemaItemHeader(outputFilePath, phenomenonClass.name, phenomenonClass.schemaItemType, schemaName, undefined, undefined, undefined);

    // Begin Indentation
    this.indentStart(outputFilePath);

    // Write the description
    this.writeSchemaItemDescription(outputFilePath, undefined);

    // Write the definition
    fs.appendFileSync(outputFilePath, `**Definition:** ${phenomenonClass.definition}\n\n`);

    // Finish Indentation
    this.indentStop(outputFilePath);
  }

  /**
   * Collects and writes markdown documentation for UnitSystem classes
   * @param outputFilePath Path to file to write the UnitSystem classes to
   * @param schema Schema to pull the unit classes from
   */
  private static writeUnitSystemClasses(outputFilePath: string, schema: Schema) {
    const unitSystemClasses: UnitSystem[] = this.getSortedSchemaItems(schema, SchemaItemType.UnitSystem);

    // If the list is empty or undefined, return
    if (!unitSystemClasses || unitSystemClasses.length === 0)
      return;

    // Write the h3 for the section
    fs.appendFileSync(outputFilePath, `## ${schemaItemToGroupName(SchemaItemType.UnitSystem)}\n\n`);

    for (const unitSystemClass of unitSystemClasses) {
      this.writeUnitSystemClass(outputFilePath, unitSystemClass, schema.name);
    }
  }

  /**
   * Writes markdown for a UnitSystem class
   * @param outputFilePath Path to file to write markdown into
   * @param unitSystemClass UnitSystem class to generate markdown for
   */
  public static writeUnitSystemClass(outputFilePath: string, unitSystemClass: UnitSystem | undefined, schemaName: string) {
    if (unitSystemClass === undefined)
      return;

    // Write the name
    this.writeSchemaItemHeader(outputFilePath, unitSystemClass.name, unitSystemClass.schemaItemType, schemaName, undefined, undefined, undefined);

    // Begin Indentation
    this.indentStart(outputFilePath);

    // Write the description
    this.writeSchemaItemDescription(outputFilePath, unitSystemClass.description);

    // Finish Indentation
    this.indentStop(outputFilePath);
  }

  /**
   * Method to determine a schema from an XML file
   * @param schemaString string version of schema to be parsed
   * @param context schema context of current schema
   */
  public xmlToSchema(schemaString: string, context: SchemaContext): Schema {
    const parser = new DOMParser();
    const document = parser.parseFromString(schemaString);
    const reader = new SchemaReadHelper(XmlParser, context);
    let schema: Schema = new Schema(context);
    schema = reader.readSchemaSync(schema, document);
    return schema;
  }

  /**
   * Loads a schema and its references into memory and prepares
   * inputs for schema markdown generation
   * Method checks for the existence of both the schema and
   * output path
   * @param schemaPath path to SchemaJson to load
   * @param outputFilePath Path to the output file to write to
   */
  public genPrep(schemaPath: string, outputFilePath: string) {
    // If the schema file doesn't exist, throw an error
    if (!fs.existsSync(schemaPath))
      throw new ECJsonFileNotFound(schemaPath);

    // Get the path of the directory that will contain the output md file
    let outputDir: string[] | string = outputFilePath.split(/(\/){1}|(\\){2}|(\\){1}/g);
    outputDir.pop();
    outputDir = outputDir.join(path.sep);

    // Check if the output directory exists
    if (!fs.existsSync(outputDir))
      throw new ECJsonBadOutputPath(outputFilePath);

    const schemaString = fs.readFileSync(schemaPath, "utf8");
    let schemaJson: string;
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

    return schema;
  }

  /**
   * Loads a schema and its references into memory and drives the
   * markdown generation
   * @param schemaPath path to SchemaJson to load
   * @param outputFilePath Path to the output file to write to
   */
  public async generate(schemaPath: string, outputFilePath: string, nonReleaseFlag = false) {
    const schema = this.genPrep(schemaPath, outputFilePath);

    // Create the output file
    fs.writeFileSync(outputFilePath, "");

    // Generate all the markdown for each type of schema item
    ECJsonMarkdownGenerator.writeFrontMatter(outputFilePath, schema, nonReleaseFlag);
    ECJsonMarkdownGenerator.writeSchema(outputFilePath, schema);
    ECJsonMarkdownGenerator.generateTableOfContents(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeEntityClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeMixinClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeStructClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeCustomAttributeClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeRelationshipClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeEnumerationItems(outputFilePath, schema);
    await ECJsonMarkdownGenerator.writeKindOfQuantityClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writePropertyCategories(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeUnitClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writePhenomenonClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeUnitSystemClasses(outputFilePath, schema);
    ECJsonMarkdownGenerator.writeFormatClasses(outputFilePath, schema);

    // Remove the extra blank line
    removeExtraBlankLines(outputFilePath, outputFilePath);
  }

  public static remarksHeader(outputFilePath: string, schema: Schema, nonReleaseFlag: boolean) {
    fs.appendFileSync(outputFilePath, "---\n");
    fs.appendFileSync(outputFilePath, "noEditThisPage: true\n");
    fs.appendFileSync(outputFilePath, `remarksTarget: ${schema.name}.ecschema.md\n`);
    fs.appendFileSync(outputFilePath, "---\n\n");
    fs.appendFileSync(outputFilePath, `# ${schema.name}\n\n`);

    if (nonReleaseFlag) {
      fs.appendFileSync(outputFilePath, `${formatWarningAlert("This documentation represents a nonreleased version of this schema")}\n\n`);
    }
  }

  public static remarksClasses(outputFilePath: string, schema: Schema, schemaItemType: SchemaItemType) {
    const classItems = ECJsonMarkdownGenerator.getSortedSchemaItems(schema, schemaItemType);
    // If the list is empty or undefined, return
    if (!classItems || classItems.length === 0)
      return;

    // Write the h3 for the section
    const className = schemaItemToGroupName(schemaItemType);
    const h3 = className.replace(/([A-Z])/g, " $1").trim();
    fs.appendFileSync(outputFilePath, `## ${h3}\n\n`);

    for (const item of classItems) {
      fs.appendFileSync(outputFilePath, `### ${item.name}\n\n`);
      if (schemaItemType === SchemaItemType.RelationshipClass) {
        fs.appendFileSync(outputFilePath, `#### Source\n\n`);
        fs.appendFileSync(outputFilePath, `#### Target\n\n`);
      }
    }
  }

  /**
   * Loads a schema and its references into memory and drives the
   * remarks file generation
   * @param schemaPath path to SchemaJson to load
   * @param outputFilePath Path to the output file to write to
   */
  public genRemarks(schemaPath: string, outputFilePath: string, nonReleaseFlag = false) {
    const schema = this.genPrep(schemaPath, outputFilePath);

    // Create the output file
    fs.writeFileSync(outputFilePath, "");
    ECJsonMarkdownGenerator.remarksHeader(outputFilePath, schema, nonReleaseFlag);

    for (const value of Object.values(SchemaItemType)) {
      if (value) {
        const schemaItemType = value as SchemaItemType;
        ECJsonMarkdownGenerator.remarksClasses(outputFilePath, schema, schemaItemType);
      }
    }
  }
}

/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
export class ECJsonFileNotFound extends Error {
  public constructor(filePath?: string) {
    super("Cannot find file " + filePath);
    this.name = "ECJsonFileNotFound";
  }
}

export class ECJsonBadSearchPath extends Error {
  public constructor(filePath: string) {
    super(filePath + " is not a viable search path");
    this.name = "ECJsonBadSearchPath";
  }
}

export class ECJsonBadJson extends Error {
  public constructor(filePath: string) {
    super("The file at " + filePath + " is not a proper JSON");
    this.name = "ECJsonBadJson";
  }
}

export class ECJsonBadOutputPath extends Error {
  public constructor(filePath: string) {
    super(filePath + " is not a proper output path");
    this.name = "ECJsonBadOutputPath";
  }
}

export class ECJsonReferenceNotFound extends Error {
  public constructor(schema: string, refDirs: string[]) {
    super("The references for " + schema + " we not found in " + refDirs.toString());
    this.name = "ECJsonReferenceNotFound";
  }
}

export class BadPropertyType extends Error {
  public constructor(propertyType: number) {
    super(propertyType + " is not a recognized property type.");
  }
}

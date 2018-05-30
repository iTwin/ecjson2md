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

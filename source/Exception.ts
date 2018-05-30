export class ECJsonFileNotFound extends Error {
  public constructor(filePath?: string) {
    super("Cannot find file " + filePath);
  }
}

export class ECJsonBadJson extends Error {
  public constructor(filePath: string) {
    super("The file at " + filePath + " is not a proper JSON");
  }
}

export class BadSearchPath extends Error {
  public constructor(filePath: string) {
    super(filePath + " is a not a viable search path");
  }
}

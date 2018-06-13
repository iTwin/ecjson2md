/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
import * as chalk from "chalk";
import { ECJsonMarkdownGenerator } from "./ecjson2md";
import * as commander from "commander";

// Get cli arguments
const program = new commander.Command("ECJson2MD");
program.option("-i, --input <required>", "path to ECSchemaJson file");
program.option("-o, --output <required>", "directory to output ECSchema Markdown");
program.option("-r  --dirs <required>", "list of comma delimited directories to search in");
program.parse(process.argv);

// Prompt to use the help flag if an input was missing
if (!program.input || !program.output || !program.dirs) {
  // tslint:disable-next-line:no-console
  console.log(chalk.default.red("Invalid input. For help use '-h'"));
  process.exit();
}

// Add a slash to the end if th~e user didn't provide one
let outputDirPath = program.output;
if (!(outputDirPath[outputDirPath.length - 1] === "/")) outputDirPath += "/";

// Form the filepath for the output markdown
const inputSchemaPath = program.input;
const outputPathParts = inputSchemaPath.split("/");
const outputFilePath = outputDirPath + outputPathParts[outputPathParts.length - 1].slice(0, -5) + ".md";

// Remove any whitespace from dirs argument
let searchDir = program.dirs.replace(/\s/g, "");
// Separate the search directories
searchDir = searchDir.split(",");

// Add the search directories to the new locator and load the schema
try {
  // tslint:disable-next-line:no-console
  console.log(chalk.default.gray("Adding the search directories..."));

  // Try to add the search paths
  const mdGenerator = new ECJsonMarkdownGenerator(searchDir);

  // tslint:disable-next-line:no-console
  console.log(chalk.default.gray("Generating markdown at " + outputFilePath + "..."));

  // Try to generate the markdown
  mdGenerator.generate(inputSchemaPath, outputFilePath).then(() => {
    // tslint:disable-next-line:no-console
    console.log(chalk.default.blue("Markdown successfully generated at " + outputFilePath));
  }).catch((error) => {
    // tslint:disable-next-line:no-console
    console.log(chalk.default.red(error));
    process.exit();
  });
} catch (e) {
    // tslint:disable-next-line:no-console
    console.log(chalk.default.red(e, "\nQuitting..."));
}

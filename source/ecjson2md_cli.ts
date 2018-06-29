/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
import * as chalk from "chalk";
import { ECJsonMarkdownGenerator } from "./ecjson2md";
import * as commander from "commander";
import * as path from "path";

main();

/**
 * Returns a proper file path
 *
 * @param rawOutputPath User given path to directory for output
 * @param {string} inputPath  User given path to input file (used for output file name)
 * @returns {string} Proper file path
 */
export function prepOutputPath(rawOutputPath: string, inputPath: string): string {
  // Replace common separators with os path separator
  let outputDir: string = rawOutputPath.replace(/(\/){1}|(\\){2}|(\\){1}/g, path.sep);

  // add a slash to the end if the user didn't provide one
  if (!(outputDir[outputDir.length - 1] === path.sep)) outputDir += path.sep;

  // Form the file name
  const inputPathParts = inputPath.split(/(\/){1}|(\\){2}|(\\){1}/g);
  const preppedOutputPath = outputDir + inputPathParts[inputPathParts.length - 1].slice(0, -5) + ".md";

  return preppedOutputPath;
}

function main() {
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

  // Construct the output file path
  const outputFilePath = prepOutputPath(program.output, program.input);

  // Remove any whitespace from dirs argument
  let searchDirs = program.dirs.replace(/\s/g, "");

  // Separate the search directories
  searchDirs = searchDirs.replace(/(\/){1}|(\\){2}|(\\){1}/g, path.sep).split(/,|;/g);

  // Add the search directories to the new locator and load the schema
  try {
    // tslint:disable-next-line:no-console
    console.log(chalk.default.gray("Adding the search directories..."));

    // Try to add the search paths
    const mdGenerator = new ECJsonMarkdownGenerator(searchDirs);

    // tslint:disable-next-line:no-console
    console.log(chalk.default.gray("Generating markdown at " + path.resolve(outputFilePath) + "..."));

    // Try to generate the markdown
    mdGenerator.generate(program.input, outputFilePath).then(() => {
      // tslint:disable-next-line:no-console
      console.log(chalk.default.blue("Markdown successfully generated at " + path.resolve(outputFilePath)));
    }).catch((error) => {
      // tslint:disable-next-line:no-console
      console.log(chalk.default.red(error));
      process.exit();
    });
  } catch (e) {
      // tslint:disable-next-line:no-console
      console.log(chalk.default.red(e, "\nQuitting..."));
  }
}

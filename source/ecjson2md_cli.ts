/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2019 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
import * as chalk from "chalk";
import { ECJsonMarkdownGenerator, prepOutputPath, prepSearchDirs } from "./ecjson2md";
import * as commander from "commander";
import * as path from "path";

function main() {
  // Get cli arguments
  const program = new commander.Command("ECJson2MD");
  program.option("-i, --input <required>", "path to ECSchemaJson file");
  program.option("-o, --output <required>", "directory to output ECSchema Markdown");
  program.option("-r, --dirs [values]", "list of comma delimited directories to search in", String);
  program.option("-n, --nonrelease", "include alert about being nonrelease");
  program.parse(process.argv);

  // Prompt to use the help flag if an input was missing
  if (!program.input || !program.output) {
    // tslint:disable-next-line:no-console
    console.log(chalk.default.red("Invalid input. For help use '-h'"));
    process.exit();
  }

  // Construct the output file path
  const outputFilePath = prepOutputPath(program.output, program.input);

  // Normalize the search dirs
  let searchDirs: string[] = [];

  if (program.dirs !== undefined)
    searchDirs = prepSearchDirs(program.dirs);

  // tslint:disable-next-line:no-console
  console.log(chalk.default.gray("Adding the search directories..."));

  // Add the search directories to the new locator and load the schema
  try {
    // Try to add the search paths
    const mdGenerator = new ECJsonMarkdownGenerator(searchDirs);

    // tslint:disable-next-line:no-console
    console.log(chalk.default.gray("Generating markdown at " + path.resolve(path.normalize(outputFilePath) + "...")));

    // Try to generate the markdown
    mdGenerator.generate(program.input, outputFilePath, program.nonrelease);

  } catch (e) {
    // tslint:disable-next-line:no-console
    console.log(chalk.default.red(e, "\nQuitting..."));
  }

  // tslint:disable-next-line:no-console
  console.log(chalk.default.blue("Markdown successfully generated at " + path.resolve(path.normalize(outputFilePath))));

}

main();

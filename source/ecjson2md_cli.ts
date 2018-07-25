/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
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
  program.option("-r, --dirs <required>", "list of comma delimited directories to search in");
  program.option("-n, --nonrelease", "whether or not to include alert about being nonrelease");
  program.parse(process.argv);

  // Prompt to use the help flag if an input was missing
  if (!program.input || !program.output || !program.dirs) {
    // tslint:disable-next-line:no-console
    console.log(chalk.default.red("Invalid input. For help use '-h'"));
    process.exit();
  }

  // Construct the output file path
  const outputFilePath = prepOutputPath(program.output, program.input);

  // Normalize the search dirs
  const searchDirs = prepSearchDirs(program.dirs);

  // Add the search directories to the new locator and load the schema
  try {
    // tslint:disable-next-line:no-console
    console.log(chalk.default.gray("Adding the search directories..."));

    // Try to add the search paths
    const mdGenerator = new ECJsonMarkdownGenerator(searchDirs);

    // tslint:disable-next-line:no-console
    console.log(chalk.default.gray("Generating markdown at " + path.resolve(outputFilePath) + "..."));

    // Try to generate the markdown
    mdGenerator.generate(program.input, outputFilePath, program.nonrelease);
    // tslint:disable-next-line:no-console
    console.log(chalk.default.blue("Markdown successfully generated at " + path.resolve(outputFilePath)));

  } catch (e) {
      // tslint:disable-next-line:no-console
      console.log(chalk.default.red(e, "\nQuitting..."));
  }

}

main();

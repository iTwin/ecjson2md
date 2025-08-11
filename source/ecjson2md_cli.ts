/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/

import * as chalk from "chalk";
import { ECJsonMarkdownGenerator, prepOutputPath, prepRemarksPath, prepSearchDirs } from "./ecjson2md";
import * as commander from "commander";
import * as path from "path";

async function main() {
  // Get cli arguments
  const program = new commander.Command("ECJson2MD");
  program.option("-i, --input <required>", "path to ECSchemaJson file");
  program.option("-o, --output <required>", "directory to output ECSchema Markdown");
  program.option("-r, --dirs [values]", "list of comma delimited directories to search in", String);
  program.option("-n, --nonrelease", "include alert about being nonrelease");
  program.option("-g, --generateEmpty", "generate an empty remarks file for the schema provided");
  program.parse(process.argv);

  // Prompt to use the help flag if an input was missing
  if (!program.input || !program.output) {
    /* eslint-disable no-debugger, no-console */
    console.log(chalk.red("Invalid input. For help use '-h'"));
    process.exit();
  }

  // Normalize the search dirs
  let searchDirs: string[] = [];

  if (program.dirs !== undefined)
    searchDirs = prepSearchDirs(program.dirs);

  /* eslint-disable no-debugger, no-console */
  console.log(chalk.gray("Adding the search directories..."));

  if (program.generateEmpty) {
    // Construct the remarks file path
    const outputRemarksPath = prepRemarksPath(program.output, program.input);
    try {
      // Try to add the search paths
      const remarks = new ECJsonMarkdownGenerator(searchDirs);

      /* eslint-disable no-debugger, no-console */
      console.log(chalk.gray("Generating remarks file at " + path.resolve(path.normalize(outputRemarksPath) + "...")));
      // Try to generate remarks file
      remarks.genRemarks(program.input, outputRemarksPath, program.nonrelease);

      /* eslint-disable no-debugger, no-console */
      console.log(chalk.blue("Remarks file successfully generated at " + path.resolve(path.normalize(outputRemarksPath))));

    } catch (e: any) {
      /* eslint-disable no-debugger, no-console */
      console.log(chalk.red(e, "\nQuitting..."));
    }
  }

  // Construct the output file path
  const outputFilePath = prepOutputPath(program.output, program.input);

  // Add the search directories to the new locator and load the schema
  try {
    // Try to add the search paths
    const mdGenerator = new ECJsonMarkdownGenerator(searchDirs);

    /* eslint-disable no-debugger, no-console */
    console.log(chalk.gray("Generating markdown at " + path.resolve(path.normalize(outputFilePath) + "...")));

    // Try to generate the markdown
    await mdGenerator.generate(program.input, outputFilePath, program.nonrelease);

    /* eslint-disable no-debugger, no-console */
    console.log(chalk.blue("Markdown successfully generated at " + path.resolve(path.normalize(outputFilePath))));

  } catch (e: any) {
    /* eslint-disable no-debugger, no-console */
    console.log(chalk.red(e, "\nQuitting..."));
  }
}

main().then()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


import * as chalk from "chalk";
import * as fs from "fs-extra";
import { ECJsonMarkdown } from "./ecjson2md";
import * as commander from "commander";

// Get cli arguments
const program = new commander.Command("ec-md");
program.option("-i, --input <required>", "path to ECSchemaJson file");
program.option("-o, --output <required>", "output ECSchema Markdown directory");
program.option("-r  --dirs <required>, list of comma delimited directories to search in");
program.parse(process.argv);

// if (process.argv.length !== 2) program.help();

if (!program.input || !program.output || !program.dirs) {
  // tslint:disable-next-line:no-console
  console.log(chalk.default.red("Invalid input. For help use '-h'"));
  process.exit();
}

// Check if the output dir exists
if (!fs.existsSync(program.output)) {
  // tslint:disable-next-line:no-console
  console.log(chalk.default.red(`Cannot find output directory ${program.dirs}`));
  process.exit();
}

const inputSchemaName = program.input;
// Form the filepath for the output markdown
const outputFilePath = inputSchemaName.slice(0, inputSchemaName.length - 5) + ".md";

const searchDir = program.dirs.split(",");

// Add the search directories to the new locator and load the schema
try {
  const mdGenerator = new ECJsonMarkdown(searchDir);
  mdGenerator.loadJsonSchema(program.input, outputFilePath);
} catch (e) {
    // tslint:disable-next-line:no-console
    console.log(chalk.default.red(e, "\nQuitting..."));
}

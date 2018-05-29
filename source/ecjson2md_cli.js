"use strict";
exports.__esModule = true;
var chalk = require("chalk");
var fs = require("fs-extra");
var ecjson2md_1 = require("./ecjson2md");
var commander = require("commander");
// Get cli arguments
var program = new commander.Command("ec-md");
program.option("-i, --input <required>", "path to ECSchemaJson file");
program.option("-o, --output <required>", "output ECSchema Markdown directory");
program.option("-r  --dirs <required>, list of comma delimited directories to search in");
program.parse(process.argv);
// if (process.argv.length !== 2) program.help();
if (!program.input || !program.output || !program.dirs) {
    // tslint:disable-next-line:no-console
    console.log(chalk["default"].red("Invalid input. For help use '-h'"));
    process.exit();
}
// Check if the output dir exists
if (!fs.existsSync(program.output)) {
    // tslint:disable-next-line:no-console
    console.log(chalk["default"].red("Cannot find output directory " + program.dirs));
    process.exit();
}
// Check that the search directories exist
for (var _i = 0, _a = program.dirs.split(","); _i < _a.length; _i++) {
    var dir = _a[_i];
    if (!fs.existsSync(dir)) {
        // tslint:disable-next-line:no-console
        console.log(chalk["default"].red("Cannot find the search dir " + dir));
        process.exit();
    }
}
var inputSchemaName = program.input;
// Form the filepath for the output markdown
var outputFilePath = inputSchemaName.slice(0, inputSchemaName.length - 5) + ".md";
var searchDir = program.dirs.split(",");
// Add the search directories to the new locator
var mdGenerator = new ecjson2md_1.ECJsonMarkdown(searchDir);
mdGenerator.loadJsonSchema(JSON.parse(fs.readFileSync(program.input, "utf8")), outputFilePath);

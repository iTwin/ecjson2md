"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var fs = require("fs");
var ecjs_1 = require("@bentley/ecjs");
var ECJsonMarkdown = /** @class */ (function () {
    function ECJsonMarkdown(searchDirs) {
        // Add the provided directories to the locator as search paths
        var locator = new ecjs_1.SchemaJsonFileLocater();
        locator.addSchemaSearchPaths(searchDirs);
        // Add the locator to the context
        this.context = new ecjs_1.SchemaContext();
        this.context.addLocater(locator);
    }
    /**
     * @returns the context for testing purposes
     */
    ECJsonMarkdown.prototype.getContext = function () {
        return this.context;
    };
    /**
     * Writes the name of the schema to the md file at the outputfile.
     * @param schema Schema to grab the name from
     * @param outputFile The path of the file to write to
     */
    ECJsonMarkdown.prototype.writeName = function (schema, outputFile) {
        fs.writeFileSync(outputFile, "# " + schema.name + "\n");
        if (schema.description !== undefined)
            fs.appendFileSync(outputFile, "\n" + schema.description + "\n");
    };
    /**
     * Writes the classes of the schema to the md file at the outputfile.
     * @param schema Schema to grab the classes from
     * @param outputFile The path of the file to write to
     */
    ECJsonMarkdown.prototype.writeClasses = function (schema, outputFile) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, schemaClass;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = schema.getClasses();
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        schemaClass = _a[_i];
                        // Write the name of the class
                        fs.appendFileSync(outputFile, "\n## " + schemaClass.name + "\n\n");
                        // Write the class description if it's given
                        if (schemaClass.description !== undefined)
                            fs.appendFileSync(outputFile, schemaClass.description + "\n\n");
                        // Write the column headings
                        fs.appendFileSync(outputFile, "| Name " +
                            // "| Defined in" +
                            "| Description" +
                            "| Type " +
                            // "| Display Label " +
                            // "| Base Property " +
                            // "| Kind of Quantity " +
                            // "| Array Bounds " +
                            // "| Is Readonly " +
                            "|\n");
                        fs.appendFileSync(outputFile, "| :--- " +
                            // "| :--------- " +
                            "| :--------- " +
                            "| :--- " +
                            // "| :------------" +
                            // "| :------------"  +
                            // "| :---------------" +
                            // "| :----------- " +
                            // "| :---------- " +
                            "|\n");
                        if (!schemaClass.properties) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.writeClassProperties(schemaClass.properties, outputFile)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ECJsonMarkdown.prototype.mdHelper = function (value) {
        var replacement = "";
        return value !== undefined ? value : replacement;
    };
    /**
     * Writes the properties of the class to the md file at the outputfile.
     * @param schemaClassProperties array of the properties
     * @param outputFile The path of the file to write to
     */
    ECJsonMarkdown.prototype.writeClassProperties = function (schemaClassProperties, outputFile) {
        var _this = this;
        if (!schemaClassProperties)
            return;
        for (var _i = 0, schemaClassProperties_1 = schemaClassProperties; _i < schemaClassProperties_1.length; _i++) {
            var property = schemaClassProperties_1[_i];
            property.then(function (result) {
                // Write the table row for the property
                fs.appendFileSync(outputFile, "|"
                    + _this.mdHelper(result._name._name) + "|"
                    //          + this.mdHelper(result._definedIn)  + "|"
                    + _this.mdHelper(result._description) + "|");
                var type;
                // Try to parse the property type
                try {
                    type = ecjs_1.primitiveTypeToString(result._type);
                }
                catch (err) {
                    type = "";
                }
                fs.appendFileSync(outputFile, type + "|"
                    //          + this.mdHelper(result._label) + "|"
                    //          + this.mdHelper(result._baseClass) + "|"
                    //          + this.mdHelper(result._kindOfQuantity) + "|"
                    //          + this.mdHelper(result._minLength) + " - " + this.mdHelper(result._maxLength) + "|"
                    //          + this.mdHelper(result._isReadOnly) + "|"
                    + "\n");
            });
        }
    };
    /**
     * Loads a schema and its references into memory and drives the
     * markdown generation
     * @param schemaPath path to SchemaJson to load
     * @param outputFile Path to the output file to write to
     */
    ECJsonMarkdown.prototype.loadJsonSchema = function (schemaPath, outputFile) {
        var _this = this;
        var schemaFile = fs.readFileSync(schemaPath, "utf8");
        var schemaJson = JSON.parse(schemaFile);
        var schemaPromise = ecjs_1.Schema.fromJson(schemaJson, this.context);
        schemaPromise.then(function (result) {
            _this.writeName(result, outputFile);
            _this.writeClasses(result, outputFile);
        });
    };
    return ECJsonMarkdown;
}());
exports.ECJsonMarkdown = ECJsonMarkdown;

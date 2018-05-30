"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var ECJsonFileNotFound = /** @class */ (function (_super) {
    __extends(ECJsonFileNotFound, _super);
    function ECJsonFileNotFound(filePath) {
        return _super.call(this, "Cannot find file " + filePath) || this;
    }
    return ECJsonFileNotFound;
}(Error));
exports.ECJsonFileNotFound = ECJsonFileNotFound;
var ECJsonBadJson = /** @class */ (function (_super) {
    __extends(ECJsonBadJson, _super);
    function ECJsonBadJson(filePath) {
        return _super.call(this, "The file at " + filePath + " is not a proper JSON") || this;
    }
    return ECJsonBadJson;
}(Error));
exports.ECJsonBadJson = ECJsonBadJson;
var BadSearchPath = /** @class */ (function (_super) {
    __extends(BadSearchPath, _super);
    function BadSearchPath(filePath) {
        return _super.call(this, filePath + " is a not a viable search path") || this;
    }
    return BadSearchPath;
}(Error));
exports.BadSearchPath = BadSearchPath;

/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/

import { prepOutputPath } from "../source/ecjson2md";
import { assert } from "chai";
import * as path from "path";

describe("ecjson2md_cli", () => {
  describe("File path formatting", () => {
    describe("Output file path formatting", () => {
      it("should correctly format a path using /\'s", () => {
        const preppedPath = prepOutputPath("dir1/dir2", "file.ecschema.json");
        assert.equal(preppedPath, path.join("dir1", "dir2", "file.ecschema.md"));
      });
    });
  });
});

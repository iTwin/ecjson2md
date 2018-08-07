/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/

import { prepOutputPath, prepSearchDirs } from "../source/ecjson2md";
import { assert } from "chai";
import * as path from "path";

describe("ecjson2md_cli", () => {
  describe("File path formatting", () => {
    describe("Output file path formatting", () => {
      it("should correctly format a path using /'s", () => {
        const preppedPath = prepOutputPath("dir1/dir2/", "file.ecschema.json");
        assert.equal(preppedPath, path.resolve(path.join("dir1", "dir2", "file.ecschema.md")));
      });
    });

    describe("Search dir path formatting", () => {
      it("should correctly format search dir", () => {
        const preppedDirs = prepSearchDirs("dir1/dir2");
        assert.equal(preppedDirs[0], path.resolve(path.join("dir1", "dir2")));
      });

      it("should recognize ';' as dir separators", () => {
        const preppedDirs = prepSearchDirs("dir1,dir2,dir3");

        assert.equal(preppedDirs.length, 3);
        assert.equal(preppedDirs[0], path.resolve("dir1"));
        assert.equal(preppedDirs[1], path.resolve("dir2"));
        assert.equal(preppedDirs[2], path.resolve("dir3"));
      });

      it("should recognize ',' as dir separators", () => {
        const preppedDirs = prepSearchDirs("dir1,dir2,dir3");

        assert.equal(preppedDirs.length, 3);
        assert.equal(preppedDirs[0], path.resolve("dir1"));
        assert.equal(preppedDirs[1], path.resolve("dir2"));
        assert.equal(preppedDirs[2], path.resolve("dir3"));
      });

      it("should recognize '; ' as dir separators", () => {
        const preppedDirs = prepSearchDirs("dir1; dir2; dir3");

        assert.equal(preppedDirs.length, 3);
        assert.equal(preppedDirs[0], path.resolve("dir1"));
        assert.equal(preppedDirs[1], path.resolve("dir2"));
        assert.equal(preppedDirs[2], path.resolve("dir3"));
      });

      it("should recognize ', ' as dir separators", () => {
        const preppedDirs = prepSearchDirs("dir1, dir2, dir3");

        assert.equal(preppedDirs.length, 3);
        assert.equal(preppedDirs[0], path.resolve("dir1"));
        assert.equal(preppedDirs[1], path.resolve("dir2"));
        assert.equal(preppedDirs[2], path.resolve("dir3"));
      });
    });
  });
});

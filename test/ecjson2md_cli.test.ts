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
        assert.equal(preppedPath, path.join("dir1", "dir2", "file.ecschema.md"));
      });

      it("should correctly format a path using \\\\'s", () => {
        const preppedPath = prepOutputPath("dir1\\\\dir2\\", "file.ecschema.json");
        assert.equal(preppedPath, path.join("dir1", "dir2", "file.ecschema.md"));
      });

      it("should correctly format a path using \\'s", () => {
        const preppedPath = prepOutputPath("dir1\\dir2\\", "file.ecschema.json");
        assert.equal(preppedPath, path.join("dir1", "dir2", "file.ecschema.md"));
      });
    });

    describe("Search dir path formatting", () => {
      it("should replace all \\'s with OS path sep", () => {
        const preppedDirs = prepSearchDirs("dir1\\dir2");
        assert.equal(preppedDirs[0], path.join("dir1", "dir2"));
      });

      it("should replace all \\\\'s with OS path sep", () => {
        const preppedDirs = prepSearchDirs("dir1\\\\dir2");
        assert.equal(preppedDirs[0], path.join("dir1", "dir2"));
       });

      it("should replace all /'s with OS path sep", () => {
      const preppedDirs = prepSearchDirs("dir1/dir2");
      assert.equal(preppedDirs[0], path.join("dir1", "dir2"));
      });

      it("should replace combination of the previous with OS path sep", () => {
        const preppedDirs = prepSearchDirs("dir1/dir2\\dir3\\\\dir4");
        assert.equal(preppedDirs[0], path.join("dir1", "dir2", "dir3", "dir4"));
      });

      it("should recognize ';' as dir separators", () => {
        const preppedDirs = prepSearchDirs("dir1,dir2,dir3");

        assert.equal(preppedDirs.length, 3);
        assert.equal(preppedDirs[0], "dir1");
        assert.equal(preppedDirs[1], "dir2");
        assert.equal(preppedDirs[2], "dir3");
      });

      it("should recognize ',' as dir separators", () => {
        const preppedDirs = prepSearchDirs("dir1,dir2,dir3");

        assert.equal(preppedDirs.length, 3);
        assert.equal(preppedDirs[0], "dir1");
        assert.equal(preppedDirs[1], "dir2");
        assert.equal(preppedDirs[2], "dir3");
      });

      it("should recognize '; ' as dir separators", () => {
        const preppedDirs = prepSearchDirs("dir1; dir2; dir3");

        assert.equal(preppedDirs.length, 3);
        assert.equal(preppedDirs[0], "dir1");
        assert.equal(preppedDirs[1], "dir2");
        assert.equal(preppedDirs[2], "dir3");
      });

      it("should recognize ', ' as dir separators", () => {
        const preppedDirs = prepSearchDirs("dir1, dir2, dir3");

        assert.equal(preppedDirs.length, 3);
        assert.equal(preppedDirs[0], "dir1");
        assert.equal(preppedDirs[1], "dir2");
        assert.equal(preppedDirs[2], "dir3");
      });
    });
  });
});

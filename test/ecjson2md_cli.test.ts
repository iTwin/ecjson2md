/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/

import { ECJsonMarkdownGenerator, prepOutputPath, prepRemarksPath, prepSearchDirs  } from "../source/ecjson2md";
import { assert } from "chai";
import * as path from "path";
import * as fs from "fs";

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

  describe("-g flag", () => {
    it("should properly format the remarks.md file path", () => {
      const testDir = path.join(".", "test", "Assets", "dir");
      const inputFile = path.join(testDir, "BisCore.ecschema.json");
      const preppedRemarksPath = prepRemarksPath(testDir, inputFile);
      assert.equal(preppedRemarksPath, path.resolve(path.join(testDir, "BisCore.remarks.md")));
    });

    it("should properly prep the search dirs", () => {
      const testDir = path.join(".", "test", "Assets", "dir");
      const preppedDirs = prepSearchDirs(testDir);
      assert.equal(preppedDirs.length, 1);
      assert.equal(preppedDirs[0], path.resolve(testDir));
    });

    it("should properly generate an empty remarks file where option -r not required", () => {
      const testDir = path.join(".", "test", "Assets", "dir");
      const searchDirs = prepSearchDirs(testDir);

      const testRemarks = new ECJsonMarkdownGenerator(searchDirs);

      const output = testDir;
      const input = path.join(testDir, "ECDbMap.ecschema.json");
      const preppedRemarksPath = prepRemarksPath(output, input);

      const correctFilePath  = path.join(testDir, "ECDbMap.remarks.md");

      testRemarks.genRemarks(input, preppedRemarksPath);

      const testLines = fs.readFileSync(preppedRemarksPath).toString().split("\n");
      const correctLines = fs.readFileSync(correctFilePath).toString().split(/(?:\r\n|\r|\n)/g);
      assert.equal(testLines.length, correctLines.length);
      correctLines.map((line, i) => {
        assert.equal(testLines[i], line);
      });
    });

    it("should properly generate an empty remarks file where option -r required", () => {
      const testDir = path.join(".", "test", "Assets", "dir");
      const searchDirs = prepSearchDirs(testDir);

      const testRemarks = new ECJsonMarkdownGenerator(searchDirs);

      const output = testDir;
      const input = path.join(testDir, "BisCore.ecschema.json");
      const preppedRemarksPath = prepRemarksPath(output, input);

      const correctFilePath  = path.join(testDir, "BisCore.remarks.md");

      testRemarks.genRemarks(input, preppedRemarksPath);

      const testLines = fs.readFileSync(preppedRemarksPath).toString().split("\n");
      const correctLines = fs.readFileSync(correctFilePath).toString().split(/(?:\r\n|\r|\n)/g);
      assert.equal(testLines.length, correctLines.length);
      correctLines.map((line, i) => {
        assert.equal(testLines[i], line);
      });
    });
  });
});

import { ECJsonMarkdown } from "../source/ecjson2md";
import { assert } from "chai";

describe("ECJsonToMD", () => {
  describe("Instantiate ECJsonToD", () => {
    it("should successfully create an instance of ECJsonMarkDown", () => {
      const testECJsonMD = new ECJsonMarkdown(["./Assets"]);
      assert.isDefined(testECJsonMD);
    });
  });
});

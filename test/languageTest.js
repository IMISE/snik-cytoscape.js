import * as language from "../js/lang/language.js";
import chai from "chai";
chai.should();
const assert = chai.assert;
import log from "../../node_modules/loglevel/dist/loglevel.js";
global.log = log;

describe("language", function () {
	describe("#getStrings()", function () {
		for (const lang of ["en", "de"]) {
			it("should contain the language " + lang, () => {
				assert(language.setLanguage(lang), "Language not found.");
				assert.isAbove(Object.keys(language.getIdStrings()).length, 27);
				assert.isOk(language.getString("file"), "Key 'file' not found.");
			});
		}
	});
});

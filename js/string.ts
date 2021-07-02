/**
String handling helper methods.
@module */
/**
 * Limit the input string to the maximum length. If it is longer, it will get cut and have two dots appended to exactly achieve the maximum length.
 * @param  {string} s              potentially long input string to shorten
 * @param  {Number} [maxLength=25] maximum output string length
 * @return {string}                the abbreviated input string
 */
export function abbrv(s: string, maxLength: number = 25) {
	if (s.length < maxLength) {
		return s;
	}
	return s.substring(0, maxLength - 2) + "..";
}

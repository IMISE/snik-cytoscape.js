//import log from "../../node_modules/loglevel/dist/loglevel.js";

/** Browser version checking to warn the user if the browser may not be able to display SNIK graph properly.
Imprecise, just to cover the majority of cases.
@type{object} */
const sayswho = (function () {
	const ua = navigator.userAgent;
	let tem,
		M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
	if (/trident/i.test(M[1])) {
		tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
		return { name: "IE", version: tem[1] || "" };
	}
	if (M[1] === "Chrome") {
		tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
		if (tem !== null) {
			return { name: tem[1].replace("OPR", "Opera"), version: tem[2] };
		}
	}
	M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, "-?"];
	if ((tem = ua.match(/version\/(\d+)/i)) !== null) {
		M.splice(1, 1, tem[1]);
	}
	return { name: M[0], version: M[1] };
})();

/* eslint no-unused-vars: 0 */ // included from index
/** Alerts the user if the browser version is so old, that even the transpiled and polyfilled version is not guaranteed to work.
Only an approximation: Using some browser name and versions, may fail to warn or warn incorrectly.
@return {void} */
export function browserCheckTranspiled() {
	if ((sayswho.name === "Firefox" && sayswho.version < 50) || sayswho.name === "Internet Explorer" || (sayswho.name === "Chrome" && sayswho.version < 54)) {
		alert(`Your browser ${sayswho.name} version ${sayswho.version} may be outdated. Graph may not work properly.`);
		log.warn("Browser outdated. Graph may not work properly.");
	}
}

/* eslint no-unused-vars: 0 */ // included from index
/**Alerts the user if the browser cannot run the nontranspiled code, which uses ES6 modules.
Only an approximation: Using some browser name and versions, may fail to warn or warn incorrectly.
@return {void} */
export function browserCheckNonTranspiled() {
	if ((sayswho.name === "Firefox" && sayswho.version < 60) || sayswho.name === "Internet Explorer" || (sayswho.name === "Chrome" && sayswho.version < 61)) {
		const warning = `Your browser ${sayswho.name} version ${sayswho.version} may be outdated for the development build. Graph may not work properly. Try using the transpiled production build.`;
		alert(warning);
		log.warn("Browser outdated for the development build. Graph may not work properly. Try using the transpiled production build");
	}
}

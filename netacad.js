// ==UserScript==
// @name     netacad exam
// @include  http*://assessment.netacad.net/*
// @include  http*://127.0.0.1*
// ==/UserScript==

(async () => {
	/* IFrame crap */
	class IFrame {
		iframe = null;
		visible = false;

		constructor(src = undefined, visible = false) {
			this.iframe = document.createElement("iframe");
			this.iframe.style = "position: fixed; bottom: 5vw; left: 50%; width: 20vw; height: 20vh; transform: translate(-50%,0);"; //opacity:0.3;
			if (src) this.setSource(src);
			this.visible = visible;
			if (visible) this.setVisible(visible);
		}

		setSource(src) {
			this.iframe.src = src;
		}

		setVisible(visible) {
			this.visible = visible;
			if (visible) document.body.appendChild(this.iframe);
			else this.iframe.parentNode.removeChild(this.iframe);
		}
	}

	/* itexamanswers.net crap */
	const ITEAgetResultsRegEX = /title front-view-title(?:.*?)<a(?:.*?)href=([a-zA-Z0-9:\/\.-]*)/gm;

	function ITEAparseFirstResult(html) {
		let matches = [...html.matchAll(ITEAgetResultsRegEX)];
		if (matches.length < 1) return undefined;
		return matches[0][1];
	}

	/* cisco test crap */
	function CISCOgetQuestion() {
		if (window.location.hostname == "127.0.0.1") return document.getElementById("question").innerText.trimStart().trimEnd().split("\n").pop().trimStart().trimEnd();
		for (const e of document.getElementsByClassName("question")) {
			if (!e.className.includes("hidden")) {
				let m = e.getElementsByClassName("mattext");
				if (m.length > 0) return m[0].innerText.trimStart().trimEnd().split("\n").pop().trimStart().trimEnd();
				else return e.querySelector(".card-title").innerText.trimStart().trimEnd().split("\n").pop().trimStart().trimEnd();
			}
		}
	}

	/* other*/
	function URLObjectFromHTML(html) {
		return URL.createObjectURL(new Blob([html], { type: "text/html" }));
	}

	function httpRequest(url, method) {
		let req = new XMLHttpRequest();
		return new Promise((res, rej) => {
			req.addEventListener("load", function () {
				res(this);
			});
			req.addEventListener("error", function () {
				rej(this);
			});

			req.open(method, url);
			req.send(null);
		});
	}

	function insertStringAtIdx(idx, oStr, insStr) {
		return oStr.slice(0, idx) + insStr + oStr.slice(idx);
	}

	/* code that glues above together */

	let iframe = new IFrame();
	let disabled = false;
	let cache = "";

	async function handleActivation(k) {
		if (iframe.visible) {
			iframe.setVisible(false);
		} else {
			if (disabled) return;
			iframe.setVisible(true);
			let str;
			try {
				iframe.setSource(URLObjectFromHTML(CISCOgetQuestion()));
				if (cache.indexOf(CISCOgetQuestion()) == -1) {
					let res = await httpRequest(`https://itexamanswers.net/?s=${encodeURIComponent(CISCOgetQuestion())}`, "GET"); // search for answer
					let url = ITEAparseFirstResult(res.responseText); // parse above
					if (!url) return iframe.setSource(`https://google.com/search?q=${CISCOgetQuestion()}`);
					cache = (await httpRequest(url, "GET")).responseText; // load the page with answers

					let dp = new DOMParser();
					let doc = dp.parseFromString(cache, "text/html"); // parse the html

					doc.querySelectorAll("script").forEach((x) => {
						if (x.innerHTML.includes("ez-cookie-dialog-wrapper") || x.innerHTML.includes("ezodn") || x.innerHTML.includes("connatix") || x.innerHTML.includes("google")) x.parentNode.removeChild(x);
					});
					doc.getElementById("wpd-bubble-wrapper").remove();

					doc.querySelectorAll("span").forEach((x) => {
						if (x.style.color != "red") {
							x.remove();
						}
					});

					[...doc.getElementsByClassName("message_box")].forEach((x) => x.parentNode.removeChild(x));
					cache = "<html>" + doc.documentElement.innerHTML + "</html>";
				}
				let idx = cache.indexOf(CISCOgetQuestion()); // find the answer
				if (idx == -1) return iframe.setSource(`https://google.com/search?q=${CISCOgetQuestion()}`);
				str = insertStringAtIdx(idx, cache, `<p id="jumphere"></p>`); // add an element to jump to
				str += `<script>window.location.hash="jumphere"</script>`; // jump to the element
			} catch (error) {
				str = `${error.name}<br>${error.message}`;
			}
			iframe.setSource(URLObjectFromHTML(str));
		}
	}
	document.addEventListener("mousedown", (event) => {
		if (event.button == 1 || event.buttons == 4) {
			handleActivation();
		}
	});
	document.addEventListener("keypress", (k) => {
		if (k.key == ".") handleActivation();
		else if (k.key == "p") {
			disabled = disabled ? false : true;
			handleActivation();
		}
	});
})();

// ==UserScript==
// @name     netacad exam
// @include  http*://assessment.netacad.net/*
// @include  http*://127.0.0.1*
// ==/UserScript==

(async () => {
	class IFrame {
		iframe = null;
		visible = false;
		disabled = false;

		constructor(src = undefined, visible = false) {
			this.iframe = document.createElement("iframe");
			this.iframe.style =
				"position: fixed; bottom: 5vw; left: 50%; width: 700px; height: 200px; transform: translate(-50%,0); border: 1px solid #777; background: #fff;";
			if (src) this.setSource(src);
			if (visible) this.setVisible(visible);
		}

		setSource(src) {
			this.iframe.src = src;
		}

		setVisible(visible) {
			if (!this.disabled) {
				this.visible = visible;
				if (visible) document.body.appendChild(this.iframe);
				else this.iframe.parentNode.removeChild(this.iframe);
			}
		}
	}

	class Netacad {
		/* Returns the current netacad exam question */
		CISCOgetQuestion() {
			for (const e of document.getElementsByClassName("question")) {
				if (!e.className.includes("hidden")) {
					let m = e.getElementsByClassName("mattext");
					if (m.length > 0) return m[0].innerText.trimStart().trimEnd().split("\n").pop().trimStart().trimEnd();
					else return e.querySelector(".card-title").innerText.trimStart().trimEnd().split("\n").pop().trimStart().trimEnd();
				}
			}
		}
	}

	class ITEA {
		/* Regex to find the search query results from the itexamanswers.net */
		ITEAgetResultsRegEX = /title front-view-title(?:.*?)<a(?:.*?)href=([a-zA-Z0-9:\/\.-]*)/gm;

		/* Returns a link to the first result from itexamanswers.net query results */
		ITEAparseFirstResult(html) {
			let matches = [...html.matchAll(this.ITEAgetResultsRegEX)];
			if (matches.length < 1) return undefined;
			return matches[0][1];
		}
	}

	let iframe = new IFrame();
	let netacad = new Netacad();
	let itea = new ITEA();

	/* Creates an object to render the html to the canvas */
	function URLObjectFromHTML(html) {
		return URL.createObjectURL(new Blob([html], { type: "text/html" }));
	}

	/* Promisified XMLHttpRequest */
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

	/* Inserts html code into the specific html element */
	function insertStringAtIdx(idx, oStr, insStr) {
		return oStr.slice(0, idx) + insStr + oStr.slice(idx);
	}

	// Searches for the answer to the current question
	async function handleAnswer() {
		if (iframe.disabled) return;
		iframe.setVisible(true);
		let cache = "";
		let str;
		try {
			iframe.setSource(URLObjectFromHTML(netacad.CISCOgetQuestion()));
			if (cache.indexOf(netacad.CISCOgetQuestion()) == -1) {
				let res = await httpRequest(`https://itexamanswers.net/?s=${encodeURIComponent(netacad.CISCOgetQuestion())}`, "GET"); // search for answer on itexamanswers.net
				let url = itea.ITEAparseFirstResult(res.responseText); // return the first result from the search

				// alternative search if no results found on itexamanswers.net
				if (!url) {
					return iframe.setSource(`https://google.com/search?q=${netacad.CISCOgetQuestion()}`);
				}

				cache = (await httpRequest(url, "GET")).responseText; // load the page with answers

				/* remove bottom overlay */
				let dp = new DOMParser();
				let doc = dp.parseFromString(cache, "text/html"); // parse the html
				doc.querySelectorAll("span").forEach((x) => {
					if (x.style.color != "red") {
						x.remove();
					}
				});
				[...doc.getElementsByClassName("message_box")].forEach((x) => x.parentNode.removeChild(x));
				cache = "<html>" + doc.documentElement.innerHTML + "</html>";

				/* jumo to element with the answer */
				let idx = cache.indexOf(netacad.CISCOgetQuestion()); // find the answer
				str = insertStringAtIdx(idx, cache, `<p id="jumphere"></p>`); // add an element to jump to
				str += `<script>window.location.hash="jumphere"</script>`; // jump to the element
				iframe.setSource(URLObjectFromHTML(str));
			}
		} catch (error) {
			str = `${error.name}<br>${error.message}`;
		}

		removeOverlays();
	}

	// Removes all pop up dialogs on the loaded page
	function removeOverlays() {
		const removeOverlaysInterval = setInterval(function () {
			let overlays = iframe.iframe.contentWindow.document.body.querySelectorAll(
				"#ez-cookie-dialog-wrapper, #ezodn, #connatix, #google, #wpd-bubble-wrapper"
			);
			overlays.forEach((item) => item.remove());
			if (overlays.length > 0) {
				clearInterval(removeOverlaysInterval);
			}
		}, 1000);
	}

	/* Loads the answer to the current question */
	function refreshAnswer() {
		setTimeout(() => {
			handleAnswer();
		}, 1000);
	}

	/* Activate / Disable canvas overlay */
	function handleActivation(k) {
		if (iframe.visible) {
			iframe.setVisible(false);
		} else {
			handleAnswer();
		}
	}

	let previousButton = document.querySelectorAll("button#previous")[0];
	let nextButton = document.querySelectorAll("button#next")[0];
	previousButton.onclick = function () {
		refreshAnswer();
	};
	nextButton.onclick = function () {
		refreshAnswer();
	};

	document.addEventListener("mousedown", (event) => {
		if (event.button == 1 || event.buttons == 4) {
			handleActivation();
		}
	});
	document.addEventListener("keypress", (k) => {
		if (k.key == ".") handleActivation();
		else if (k.key == "p") {
			iframe.disabled = iframe.disabled ? false : true;
			handleActivation();
		}
	});
})();

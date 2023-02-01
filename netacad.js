// ==UserScript==
// @name     netacad exam
// @include  http*://assessment.netacad.net/*
// @include  http*://127.0.0.1*
// ==/UserScript==

(async () => {
	class IFrame {
		iframe = null;
		visible = false;

		constructor(src = undefined, visible = false) {
			this.iframe = document.createElement("iframe");
			this.iframe.style = "position: fixed; bottom: 5vw; left: 50%; width: 700px; height: 250px; transform: translate(-50%,0);"; //opacity:0.3;
			//if (src) this.setSource(src);
			//this.visible = visible;
			this.setVisible(visible);
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

	/* Regex to find the answers to question on the itexamanswers.net */
	const ITEAgetResultsRegEX = /title front-view-title(?:.*?)<a(?:.*?)href=([a-zA-Z0-9:\/\.-]*)/gm;

	/* Parses the html from the itexamanswers.net to anwsers to questions */
	function ITEAparseFirstResult(html) {
		let matches = [...html.matchAll(ITEAgetResultsRegEX)];
		if (matches.length < 1) return undefined;
		return matches[0][1];
	}

	/* Returns the array of answers to questions on the itexamanswers.net */
	function CISCOgetQuestion() {
		if (window.location.hostname == "127.0.0.1")
			return document.getElementById("question").innerText.trimStart().trimEnd().split("\n").pop().trimStart().trimEnd();
		for (const e of document.getElementsByClassName("question")) {
			if (!e.className.includes("hidden")) {
				let m = e.getElementsByClassName("mattext");
				if (m.length > 0) return m[0].innerText.trimStart().trimEnd().split("\n").pop().trimStart().trimEnd();
				else return e.querySelector(".card-title").innerText.trimStart().trimEnd().split("\n").pop().trimStart().trimEnd();
			}
		}
	}

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

	/* Inserts html code into the question array  */
	function insertStringAtIdx(idx, oStr, insStr) {
		return oStr.slice(0, idx) + insStr + oStr.slice(idx);
	}

	let iframe = new IFrame();
	let disabled = false;
	let cache = "";

	// Activate / Disable
	function handleActivation(k) {
		if (iframe.visible) {
			iframe.setVisible(false);
		} else {
			handleAnswer();
		}
	}

	// Searches for the answer to the current question
	async function handleAnswer() {
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

	let previousButton = document.querySelectorAll("button#previous")[0];
	let nextButton = document.querySelectorAll("button#next")[0];
	previousButton.onclick = function () {
		refreshAnswer();
	};
	nextButton.onclick = function () {
		refreshAnswer();
	};
	function refreshAnswer() {
		setTimeout(() => {
			handleAnswer();
		}, 1000);
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

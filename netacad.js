// ==UserScript==
// @name     netacad exam
// @include  http*://assessment.netacad.net/*
// @include  http*://127.0.0.1*
// ==/UserScript==

(async () => {
	class IFrame {
		parentDiv = null;
		iframe = null;
		visible = false;
		enabled = false;
		options = {
			autofill: false,
			autonext: false,
			minWait: 1,
			maxWait: 5,
		};

		constructor(src = undefined, visible = false) {
			this.parentDiv = document.createElement("div");
			this.parentDiv.style = "display: block; position: fixed; bottom: 65px; right: 40px; width: 700px; border: 1px solid #777; background: #fff;";
			this.iframe = document.createElement("iframe");
			this.iframe.style = "width: 100%; height: 40vh; border: 1px solid #777;";
			document.body.appendChild(this.parentDiv);
			this.parentDiv.appendChild(this.iframe);
			//controls
			let controlsElement = document.createElement("div");
			controlsElement.style = "display: grid; gap: 1rem";
			let controlsHTML =
				`
            <div>
            <div style="display: flex; gap: 2rem;">
            <div style="display: flex">
                <input id="netacadExam-autofill" type="checkbox" />
                <label for="netacadExam-autofill" style="margin: auto 0;">Autofill</label>
            </div>
            <div id="netacadExam-autofillOptions" style="display: none; gap: 2rem;">
                <div style="display: flex;">
                    <input id="netacadExam-autonext" type="checkbox" />
                    <label for="netacadExam-autonext" style="margin: auto 0;">Auto next</label>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                     <input id="netacadExam-minWait" type="number" value="` +
				this.options.minWait +
				`" style="width: 4rem;" />
                     <label for="netacadExam-minWait" style="margin: auto 0;">Min. wait</label>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                     <input id="netacadExam-maxWait" type="number" value="` +
				this.options.maxWait +
				`" style="width: 4rem;" />
                     <label for="netacadExam-maxWait" style="margin: auto 0;">Max. wait seconds</label>
                </div>
            </div>
            </div>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button id="netacadExam-hide">Hide (.)</button>
                <button id="netacadExam-disable">Disable (p)</button>
                <button id="netacadExam-updateSettings">Update settings</button>
            </div>
            `;
			controlsElement.innerHTML = controlsHTML;
			this.parentDiv.appendChild(controlsElement);
			//
			this.setEnabled(false);
			if (src) this.setSource(src);
			if (visible) this.setVisible(visible);
		}

		setSource(src) {
			this.iframe.src = src;
		}

		setEnabled(enabled) {
			this.enabled = enabled;
			if (this.enabled) {
				this.setVisible(true);
			} else {
				this.setVisible(false);
			}
		}

		setVisible(visible) {
			if (this.enabled) {
				this.visible = visible;
				if (visible) {
					this.parentDiv.style.display = "block";
				} else {
					this.parentDiv.style.display = "none";
				}
			} else {
				this.parentDiv.style.display = "none";
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

	let previousButton = document.querySelectorAll("button#previous")[0];
	let nextButton = document.querySelectorAll("button#next")[0];

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
		if (!iframe.enabled) return;
		let cache = "";
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

				/* remove trackers */
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
				let target = netacad.CISCOgetQuestion();
				let idx = cache.indexOf(target);
				while (idx != -1) {
					cache = insertStringAtIdx(idx, cache, `<p id="jumphere"></p>`); // add an element to jump to
					idx = cache.indexOf(target, idx + target.length);
				}

				cache += `<script>window.location.hash="jumphere"</script>`; // jump to the element
				iframe.setSource(URLObjectFromHTML(cache));
			}
		} catch (error) {
			str = `${error.name}<br>${error.message}`;
		}

		if (iframe.options.autofill) {
			autofill(cache);
		}
		removeOverlays();
	}

	function autofill(cache) {
		if (!iframe.enabled) return;
		try {
			let dp = new DOMParser();
			let doc = dp.parseFromString(cache, "text/html");

			let startElement = doc.querySelector("#jumphere");
			let answersElement = null;
			// Loop through all the sibling elements of the start element
			let nextElement = startElement.nextElementSibling;
			while (nextElement) {
				if (nextElement.nodeName === "UL") {
					answersElement = nextElement;
					nextElement = false;
				}
				nextElement = nextElement.nextElementSibling;
			}

			let redElements = answersElement.querySelectorAll("span[style='color:red']");
			let correctAnswerArray = [];
			for (let i = 0; i < redElements.length; i++) {
				let parentElement = redElements[i].parentNode;
				if (parentElement.tagName === "LI") {
					correctAnswerArray.push(redElements[i].textContent);
				} else if (parentElement.tagName === "STRONG") {
					correctAnswerArray.push(parentElement.textContent);
				} else {
					let siblings = parentElement.parentNode.childNodes;
					for (let j = 0; j < siblings.length; j++) {
						if (siblings[j].nodeType === Node.TEXT_NODE) {
							correctAnswerArray.push(siblings[j].textContent);
						}
					}
				}
			}

			let autofilled = false;
			if (correctAnswerArray.length > 0) {
				let currentQuestionElement = document.querySelector(".question, :not(.hidden)");
				// Search the entire question element and trigger mouse click
				let allElements = currentQuestionElement.querySelectorAll("*");
				for (let i = 0; i < allElements.length; i++) {
					let htmlText = allElements[i].textContent.trim();
					htmlText = htmlText.replace("\n", "");
					htmlText = htmlText.replace("\t", "");
					htmlText = htmlText.replace(/\r?\n|\r/g, " ").trim();
					htmlText = htmlText.replace(/\s+/g, " ");
					if (correctAnswerArray.includes(htmlText)) {
						allElements[i].click();
						autofilled = true;
					}
				}
				if (autofilled && iframe.options.autonext) {
					var waitNext = (Math.floor(Math.random() * (iframe.options.maxWait - iframe.options.minWait)) + 1) * 1000;
					setTimeout(() => {
						nextButton.click();
					}, waitNext);
				}
			}
		} catch (error) {
			console.log("failed autofill: " + error);
		}
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
		if (!iframe.enabled) return;
		setTimeout(() => {
			handleAnswer();
		}, 1000);
	}

	/* Activate / Disable canvas overlay */
	function handleActivation(k) {
		handleAnswer();
	}

	previousButton.onclick = function () {
		refreshAnswer();
	};
	nextButton.onclick = function () {
		refreshAnswer();
	};

	let controlsHideBtn = document.querySelector("button#netacadExam-hide");
	controlsHideBtn.onclick = function () {
		iframe.setVisible(false);
	};
	let controlsDisableBtn = document.querySelector("button#netacadExam-disable");
	controlsDisableBtn.onclick = function () {
		iframe.setEnabled(false);
	};
	let optionsAutofillBtn = document.querySelector("#netacadExam-autofill");
	let autofillOptionsElement = document.querySelector("#netacadExam-autofillOptions");
	let optionsAutonextBtn = document.querySelector("#netacadExam-autonext");
	let optionsMinWaitInput = document.querySelector("#netacadExam-minWait");
	let optionsMaxWaitInput = document.querySelector("#netacadExam-maxWait");
	let updateSettingsBtn = document.querySelector("button#netacadExam-updateSettings");
	optionsAutofillBtn.onclick = function () {
		if (optionsAutofillBtn.checked) {
			autofillOptionsElement.style.display = "flex";
		} else {
			autofillOptionsElement.style.display = "none";
		}
	};
	updateSettingsBtn.onclick = function () {
		let textContent = updateSettingsBtn.textContent;
		iframe.options.autofill = optionsAutofillBtn.checked;
		iframe.options.autonext = optionsAutonextBtn.checked;
		iframe.options.minWait = optionsMinWaitInput.value;
		iframe.options.maxWait = optionsMaxWaitInput.value;
		updateSettingsBtn.textContent = "Updated!";
		handleActivation();
		setTimeout(() => {
			updateSettingsBtn.textContent = textContent;
		}, 1000);
	};

	document.addEventListener("mousedown", (event) => {
		if (event.button == 1 || event.buttons == 4) {
			handleActivation();
		}
	});
	document.addEventListener("keypress", (k) => {
		if (k.key == "p") {
			iframe.setEnabled(!iframe.enabled);
			handleActivation();
		} else if (k.key == ".") {
			iframe.setVisible(!iframe.visible);
		}
	});
})();

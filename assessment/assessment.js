let previousButton2 = document.querySelectorAll("button#previous")[0];
let nextButton2 = document.querySelectorAll("button#next")[0];

let questions = ["it_210893", "it_210889", "it_210915", "it_210890", "it_210917", "it_216443", "it_223091", "it_350851", "it_223502", "it_207484"];
let actualQuestion = 0;

document.querySelector("[data-ident='" + questions[actualQuestion] + "']").classList.remove("hidden");

previousButton2.addEventListener("click", function () {
	if (actualQuestion - 1 >= 0) {
		document.querySelector("[data-ident='" + questions[actualQuestion] + "']").classList.add("hidden");
		actualQuestion--;
		document.querySelector("[data-ident='" + questions[actualQuestion] + "']").classList.remove("hidden");
	}
});
nextButton2.addEventListener("click", function () {
	if (actualQuestion + 1 < questions.length) {
		document.querySelector("[data-ident='" + questions[actualQuestion] + "']").classList.add("hidden");
		actualQuestion++;
		document.querySelector("[data-ident='" + questions[actualQuestion] + "']").classList.remove("hidden");
	}
});

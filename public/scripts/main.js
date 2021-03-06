/* jshint unused: false */

function ajax(url, cb) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			var obj = null;
			try {
				obj = JSON.parse(xhr.responseText);
			} finally {
			}
			cb(obj, xhr);
			xhr = null;
		}
	};
	xhr.send(null);
}

var univSelect, otherUnivHelp, lookupForm, studentIdInput, lookupLoader,
	univContinue, confirmLookupForm, lookupFailEl, lookupFailText,
	nameInput, emailInput,
	amountChoiceForm, fundSelect, amountInput,
	checkoutLoader;

function $(id) {
	return document.getElementById(id);
}

function showHide(el, show) {
	if (!el) throw new TypeError("Cannot show/hide empty element");
	el.className = show ? "" : "hidden";
}

function onUnivSelectChange() {
	// Show help notice for selecting other universities
	showHide(otherUnivHelp, this.value == "other");
	// Allow the user to continue if they selected a valid university
	showHide(univContinue, this.value && this.value != "other");
}

function onLookupFormSubmit(e) {
	e.preventDefault();
	var studentId = studentIdInput.value;
	var university = univSelect.value;
	showHide(lookupLoader, true);
	showHide(lookupFailEl, false);
	lookupStudentId(studentId, university, function (error, name, email) {
		showHide(lookupLoader, false);
		if (error || !name) {
			showHide(lookupFailEl, true);
			lookupFailText.innerText = error;
		} else {
			nameInput.innerText = name;
			emailInput.innerText = email;
			showHide(confirmLookupForm, true);
		}
	});
}

function lookupStudentId(studentId, university, cb) {
	var q = "student_id=" + encodeURIComponent(studentId) +
		"&university=" + encodeURIComponent(university);
	ajax("api/account_lookup?" + q, function (resp) {
		cb(resp.error, resp.name, resp.email);
	});
}

function onConfirmLookupSubmit(e) {
	e.preventDefault(e);
	var name = nameInput.innerText;
	var email = emailInput.innerText;
	// Ask for amount to make button
	showHide(amountChoiceForm, true);
}

function onConfirmLookupReset(e) {
	showHide(confirmLookupForm, false);
}

function onAmountChoiceSubmit(e) {
	e.preventDefault();
	var amount = amountInput.value;
	var fund = fundSelect.value;
	var fundName = fund ? fundSelect.selectedOptions[0].label : "";
	createCheckoutButton(fund, fundName, amount);
}

var buttons = {};

function createCheckoutButton(fund, fundName, amount) {
	var btnId = "" + fund + "_" + (+amount);
	var code = buttons[btnId];
	if (code) {
		// If we have already created a button for this amount/fund, use it
		showCheckout(code);
		return;
	}

	var studentId = studentIdInput.value;
	var university = univSelect.value;
	var fullName = nameInput.innerText;
	var q = "student_id=" + encodeURIComponent(studentId) +
		"&university=" + encodeURIComponent(university) +
		"&fund=" + encodeURIComponent(fund) +
		"&fund_name=" + encodeURIComponent(fundName) +
		"&full_name=" + encodeURIComponent(fullName) +
		"&amount=" + encodeURIComponent(amount);
	showHide(checkoutLoader, true);
	ajax("api/create_button?" + q, function (resp) {
		var btn = resp.button;
		if (!btn) {
			console.log(resp);
			throw new Error("Error getting button.");
		}
		code = btn.code;
		buttons[btnId] = code;
		addCheckout(btn);
		setTimeout(function () {
			showHide(checkoutLoader, false);
			showCheckout(code);
		}, 1500);
	});
}

function addCheckout(btn) {
	window.coinbaseButtonify(btn);
}

function showCheckout(btnCode) {
	window.coinbaseShowModal(btnCode);
}

function init() {
	univSelect = $("university-select");
	otherUnivHelp = $("other-university-help");
	univSelect.addEventListener("change", onUnivSelectChange, false);

	lookupForm = $("lookup");
	studentIdInput = $("student-id");
	lookupLoader = $("lookup-loader");
	lookupForm.addEventListener("submit", onLookupFormSubmit, false);

	univContinue = $("university-continue");
	confirmLookupForm = $("confirm-lookup");
	lookupFailEl = $("lookup-fail");
	lookupFailText = $("lookup-fail-text");

	nameInput = $("name");
	emailInput = $("email");
	confirmLookupForm.addEventListener("submit", onConfirmLookupSubmit, false);
	confirmLookupForm.addEventListener("reset", onConfirmLookupReset, false);

	amountChoiceForm = $("amount-choice");
	fundSelect = $("fund-choice");
	amountInput = $("fund-amount");
	amountChoiceForm.addEventListener("submit", onAmountChoiceSubmit, false);

	checkoutLoader = $("checkout-loader");

	onUnivSelectChange.call(univSelect);
	studentIdInput.focus();
}

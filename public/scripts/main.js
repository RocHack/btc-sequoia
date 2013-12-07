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
	nameInput, emailInput;

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
		if (error) {
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
}

function onConfirmLookupReset(e) {
	showHide(confirmLookupForm, false);
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

	// dev
	studentIdInput.value = "27597255";
	univSelect.value = "rochester";
	onUnivSelectChange.call(univSelect);
	studentIdInput.focus();
}

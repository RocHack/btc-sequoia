var univSelect, otherUnivHelp, lookupForm, studentIdInput, univContinue;

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

function onLookupFormSubmit() {
	var studentId = studentIdInput.value;
	lookupStudentId(studentId, function (error, name, email) {
		if (error) {
		}
	});
}

function init() {
	univSelect = $("university-select");
	otherUnivHelp = $("other-university-help");
	univSelect.addEventListener("change", onUnivSelectChange);

	lookupForm = $("lookup-form");
	studentIdInput = $("student-id");
	lookupForm.addEventListener("submit", onLookupFormSubmit);

	univContinue = $("university-continue");
}


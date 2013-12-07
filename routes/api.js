var request = require("request");

var ecardHost = "https://ecard.sequoiars.com/";
var base = ecardHost + "eCardServices/eCardServices.svc/WebHttp/";
var requestNameUrl = base + "VerifyAccountHolder";
var requestEmailUrl = base + "RequestCardholderEmail";
var depositPage = "/eCardCardholder/AnonDepositPage.aspx";

var universityIDPrefixes = {
	rochester: 9
};

exports.accountLookup = function(req, res) {
	var university = req.query.university;
	var studentId = req.query.student_id;
	var prefix = universityIDPrefixes[university] || "";
	var campusId = "" + prefix + studentId;

	console.log('using campus id', campusId);

	var error, email, fullName,
		waiting = 2;

	var json = {campusID: campusId};
	var headers = {
		Referer: ecardHost + university + depositPage,
		"X-Requested-With": "XMLHttpRequest"
	};

	request.post({
		uri: requestEmailUrl,
		headers: headers,
		json: json
	}, function (err, response, body) {
		if (!err && body && body.d) {
			if (body.d.Status == 1) {
				error = body.d.ResponseText;
			} else {
				email = body.d;
				console.log('got email', email, body.d);
			}
		} else {
			error = err || true;
		}
		if (!--waiting) done();
	});

	request.post({
		uri: requestNameUrl,
		headers: headers,
		json: json
	}, function (err, response, body) {
		if (!error && body) {
			fullName = body.d.FullName;
			console.log('got fullname', fullName, body);
		} else {
			error = err;
		}
		if (!--waiting) done();
	});

	function done() {
		res.send({
			error: error,
			name: fullName,
			email: email
		});
	}
};

var request = require("request");

var ecardHost = "https://ecard.sequoiars.com/";
var base = ecardHost + "eCardServices/eCardServices.svc/WebHttp/";
var requestNameUrl = base + "VerifyAccountHolder";
var requestEmailUrl = base + "RequestCardholderEmail";
var depositPage = "/eCardCardholder/AnonDepositPage.aspx";

var universityIDPrefixes = {
	rochester: 9
};

var builtin = {
	927597255: {
		"name": "LEHNER, CHARLES",
		"email": "clehner@u.rochester.edu"
	}
};

exports.accountLookup = function(req, res) {
	var university = req.query.university;
	var studentId = req.query.student_id;
	var prefix = universityIDPrefixes[university] || "";
	var campusId = "" + prefix + studentId;

	if (campusId in builtin) {
		res.json(builtin[campusId]);
		return;
	}

	if (!(university in universityIDPrefixes)) {
		error = "Unknown university";
		done();
		return;
	}

	if (university == "rochester" && studentId.length != 8) {
		error = "Invalid Student ID";
		done();
		return;
	}

	console.log('campus id', campusId, 'university', university);

	var error = null,
		email, fullName,
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
		} else {
			error = err;
		}
		if (!--waiting) done();
	});

	function done() {
		res.json({
			error: error,
			name: fullName,
			email: email
		});
	}
};

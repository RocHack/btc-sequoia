var request = require("request");
var crypto = require("crypto");
var qs = require("querystring");
var config = require("../config.json");
var coinbase = require("coinbase-api")(config.api_key);

var card = config.card;
var baseUrl = config.base_url;
var apiBase = baseUrl + "api/";

var ecardHost = "https://ecard.sequoiars.com/";
var ecardServices = ecardHost + "eCardServices/";
var base = ecardServices + "eCardServices.svc/WebHttp/";
var requestNameUrl = base + "VerifyAccountHolder";
var requestEmailUrl = base + "RequestCardholderEmail";
var depositPage = "/eCardCardholder/AnonDepositPage.aspx";
var depositUrl = "https://pg2.sequoiars.com/PaymentWebServer/PageRequest.aspx";
var confirmUrl = ecardServices + "eCardSecureServices.asmx/DepositConfirmation";
var depositResponsePage = "/eCardCardholder/AnonDepositResponsePage.aspx";

var universityIDPrefixes = {
	rochester: 9
};

var cache = {};

function hmac(str, key) {
	return crypto.createHmac("SHA256", key).update(str).digest("base64");
}

function lookupAccount(university, studentId, cb) {
	var prefix = universityIDPrefixes[university] || "";
	var campusId = "" + prefix + studentId;

	if (campusId in cache) {
		cb(cache[campusId]);
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
		var result = {
			error: error,
			name: fullName,
			email: email,
			campusID: campusId
		};
		cache[campusId] = result;
		cb(result);
	}
}

exports.accountLookup = function(req, res) {
	var university = req.query.university;
	var studentId = req.query.student_id;
	lookupAccount(university, studentId, function (stuff) {
		res.json(stuff);
	});
};

exports.createButton = function(req, res) {
	var amount = req.query.amount;
	var fund = req.query.fund;
	var fundName = req.query.fund_name;
	var fullName = req.query.full_name;
	var campusId = req.query.campus_id;
	var university = req.query.university;
	var description = fundName + " for " + fullName;
	var id = [university, campusId, fund, fundName, amount].join("_");
	id = id + "_" + hmac(id, config.secret);

	coinbase.buttons({
		"button": {
			"name": fundName,
			"type": "buy_now",
			"price_string": amount,
			"price_currency_iso": "USD",
			"custom": id,
			"callback_url": apiBase + "button_callback",
			"description": description,
			"style": "custom_large"
		}

	}, function(err, json) {
		if (err || !json.button) {
			console.err(err);
			res.json({});
			return;
		}
		var code = json.button.code;
		console.log('Generated button with code', code);
		res.json({
			button: {
				code: code
			}
		});
	});

};

exports.buttonCallback = function (req, res) {
	console.log('got callback');
	var order = req.body.order;
	if (!order) {
		console.error("Not an order callback");
		res.json({error: "Not an order"});
		return;
	}
	var id = order.custom;
	if (!id) {
		console.error("Missing Custom ID");
		res.json({error: "Missing custom ID"});
		return;
	}
	if (order.status != "completed") {
		console.error("Order not complete");
		res.json({error: "Order not complete"});
		return;
	}
	console.log("Got callback for order id", id);
	var s = id.split("_");
	var university = s[0],
		campusId = s[1],
		fund = s[2],
		fundName = s[3],
		amount = s[4],
		hash = s[5];
	if (hash != hmac(id.substr(0, id.lastIndexOf("_")), config.secret)) {
		console.error("Invalid HMAC");
		res.json({error: "Invalid hash"});
		return;
	}

	fulfillOrder(university, campusId, fund, fundName, amount);

	res.json({error: false});
};

function fulfillOrder(university, studentId, fund, fundName, amount) {
	lookupAccount(university, studentId, function (details) {
		if (details.error || !details.email) {
			console.error("Error looking up account for fulfiling order",
				details.error, university, studentId, fund);
			return;
		}

		var campusId = details.campusId;
		sequoiaDeposit(university, campusId, fund, amount, function (error) {
			if (error) {
				console.error("Error depositing to sequoia.",
					error, university, studentId, fund);
				return;
			}

			sendEmail(details.email, "Deposit complete",
				"Your funds have been deposited to your " + fundName +
				" account");
		});
	});
}

function sequoiaDeposit(university, campusId, fund, amount, cb) {
	console.log("Deposit to", university, campusId, fund);
	var form = {
		DestinationURL: ecardHost + university + depositResponsePage,
		TenderNum: fund,
		StoreNum: 1034,
		OrderID: 103474317,
		ConfirmationId: 74317,
		TransactionType: "deposit",
		CardType: "credit",
		Account: card.num,
		CVV2: card.cvv2,
		Amount: Math.round(amount * 1000),
		TargetID: campusId,
		ExpDate: card.exp,
		CustomerName: card.name,
		AddressStreet: card.address,
		AddressCity: card.city,
		AddressState: card.state,
		AddressZip: card.zip,
		AddressCountry: card.country,
		CreditCardType: card.type,
		Fee: 0,
		DepositRecipientLast4Digits: "",
		ConfirmationURL: confirmUrl
	};
	request.post({
		uri: depositUrl,
		body: form
	}, function (err, res, body) {
		if (err) {
			console.error("Deposit failed.", err, campusId, fund, amount);
			return;
		}
		var redirect = res.headers && res.headers.Location;
		if (!redirect) {
			console.error("Deposit redirect failed.", campusId, amount, body);
			return;
		}
		var result = qs.parse(redirect);
		if (result.res == "failure") {
			err = result.resText;
			console.error("Deposit failed.", err);
			cb(err);
		} else if (result.res != "success") {
			err = result.resText;
			console.error("Unknown deposit result", err);
			cb(err);
		} else {
			// success
			cb(false);
		}
	});
}

function sendEmail(to, subject, body) {
	// todo
	console.log("echo \"" + body + "\" | " +
		"mail -s \"" + subject + "\" \"" + to + "\"");
}


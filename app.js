
/**
 * Module dependencies.
 */

var express = require('express');
//var routes = require('./routes');
var api = require('./routes/api');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 8037);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

app.get('/api/account_lookup', api.accountLookup);
app.get('/api/create_button', api.createButton);
app.post('/api/button_callback', api.buttonCallback);

http.createServer(app).listen(app.get('port'), function(){
	console.log('btc-sequoia server listening on port ' + app.get('port'));
});


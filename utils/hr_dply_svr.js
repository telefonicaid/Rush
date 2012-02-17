var http = require('http');
var connect = require('connect');

connect.createServer()
.use(connect.router(function(app) {
	app.get('/:branch/:script', function(req, res, next){
		do_it(req.params.branch, req.params.script, function(error) {
				res.end(" all right!");				
		});
 	});
}))
.listen(3000);

function do_it(branch, script, next) {
 console.log("executing %s for %s", script, branch);
 next && next();
}

	
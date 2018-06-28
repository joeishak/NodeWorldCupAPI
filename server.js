// Declarations and Initializations
let express           = require('express');
let app               = express();
let http              = require('http');
let footballapi       = require('./routes/footballapi.js');
let server            = http.createServer(app);

let bodyParser        = require('body-parser');

//Use Body Parser when reading data from a request
app.use(bodyParser({limit:'500mb',extended:true,parameterLimit:50000}));
// app.use(bodyParser.json({limit: '500mb'}));
// app.use(bodyParser.urlencoded());


//Tell the server where to listen 
server.listen(8010, () => {
    console.log("World Cup API Listening On Port 8010")
});

// Setting the headers for all routes to be CORS compliant
app.use(function(req,res,next) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Credentials", "true");
res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Authorization, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
next();
});

app.use('/extract/footballapi',footballapi);

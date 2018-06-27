// Declarations and Initializations
let express           = require('express');
let app               = express();
let http              = require('http');
let footballapi       = require('./routes/footballapi.js');
let server            = http.createServer(app);

let bodyParser        = require('body-parser');

//Use Body Parser when reading data from a request
app.use(bodyParser());
app.use(bodyParser.urlencoded({extended:false}));


//Tell the server where to listen 
server.listen(802, () =>{
    console.log("Hello There listening on port 80 ")
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

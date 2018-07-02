let config = require('./config');

let mssql = require('mssql');
var connection = mssql.connect(config, function (err) {
       if (err)
           throw err; 
   });
   
   module.exports = connection; 
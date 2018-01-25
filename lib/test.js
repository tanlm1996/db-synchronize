
var mysql = require('mysql2/promise');
// create the connection to database 1
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'tanlm',
  database: 'db1'
});
// Create the connection to database 2
const connection2 = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'tanlm',
  database: 'db2'
});
var tan = require('./mapping-gen.js')
tan(connection,connection2);

# db-synchronize
Simple example:
var DBSync = require('db-sync')
var srConfig = { 
    host:"localhost",
    user: "root",
    password:"tanlm",
    database: "db1"
}
var desConfig = { 
    host:"localhost",
    user: "root",
    password:"tanlm",
    database: "db3"//TODO moi thay db2 thanh db3 de test
}

var tan = new DBSync(srConfig, desConfig);
//tan.mappingGenerate('/home/minhtan/Desktop/')
tan.mappingPath = '/home/minhtan/Desktop/db-sync/sync-demo/config';
console.log('Mapping PATH: ' +tan._mappingPath)
//tan.sync()
////tan.mappingGenerate()
//tan.schemaGen()
//tan.syncTable()//Copy all table to another database
tan.sync()
//tan.tableRelation()//generate table references config

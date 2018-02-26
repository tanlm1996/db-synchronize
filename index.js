'use strict'
//Import
const mysql = require('mysql');
const mysql_promise = require('mysql2/promise');
const graph = require('./lib/mapping-gen.js')
const mappingGenerator = graph.compareDatabases

class DBSync {
	constructor(srConfig, desConfig){
		this._srConnection = mysql.createConnection({
			host: srConfig.host,
			user: srConfig.user,
			password: srConfig.password,
			database: srConfig.database
		})
		this._desConnection = mysql.createConnection({
			host: desConfig.host,
			user: desConfig.user,
			password: desConfig.password,
			database: desConfig.database
		})
		this._srConfig = srConfig;
		this._desConfig = desConfig;
		this._mappingPath = __dirname;
		this._tasks = [];
	}
	set mappingPath(path) {
		this._mappingPath = path;
	}
	//These two get methods is just used for testing. They may be deleted after fininshed
	get source() {
		return this._srConnection;
	} 
	get destination() {
		return this._desConnection;
	} 
	sync () {
		//var config = require(_mappingPath);
		/*var config = {
    				"idStudent": "idStudent",
    				"name": "name",
    				"address": "address",
    				"class": "class"
					}*/
		const path = require('path')
		//var mapping = require(path.join(this._mappingPath,'config-gen.json'))
		var config = {
						"fromTable": "sinh_vien",
						"toTable": "sinh_vien",
						"mapping": {
							"idStudent":"idStudent",
							"name": "name",
							"address": "address",
							"class": "class"
						}
					}
		const timestamp = '2018-01-11T15:36:19.000'
		this._syncDataTable(config, timestamp)	;
		
	}
	_syncDataTable({fromTable, toTable, mapping}, timestamp) {
		var
    		datapumps = require('datapumps'),
    		Pump = datapumps.Pump,
    		MysqlMixin = datapumps.mixin.MysqlMixin,
    		pump  = new Pump();
		var target = Object.keys(mapping).map(key => mapping[key])
		//Construct query for LOADING phase
		var insert_query = 'INSERT INTO ' + toTable + '(' + target.join() + ') VALUES (?)'	
		//Construct extract query
		var extract_query = 'SELECT * FROM ' + fromTable + ' WHERE updatedAt > ?'
		this._desConnection.beginTransaction((err) =>{
			//Transfer
				pump
					.from(this._srConnection.query(extract_query, timestamp).stream())
					.mixin(MysqlMixin(this._desConnection))
					.process((student) => {
						/*return pump.query('SELECT idStudent FROM sinh_vien WHERE idStudent = ? ',student.idStudent)               
								.then (([result, fields])=> {
									if (result.length == 0) {
										let values = Object.keys(mapping).map(element => student[element]) 
										return pump.query(insert_query,
														values)
									}
									else {
										return pump.query('UPDATE sv SET ten=?, diachi=?,lop=? WHERE idSV=?',student.name,student.address,student['class'],student.idStudent)
									}
								
						})*/
							let values = Object.keys(mapping).map(element => student[element]) 
							let tasks = this._tasks;
							return pump.query(insert_query,values);

					})
					.logErrorsToConsole()
					.run()
					.then(() => {
						//pump.query('COMMIT')
						this._desConnection.commit((err)=> {
							if (err) {
								this._desConnection.rollback(()=> {throw err;})
							}
						})
						
						this._srConnection.end();//Close connection when finished
						this._desConnection.end();
						console.log("Done data sync");
					})
		})
	}
	use(success,fail) {
		this._tasks.push([success, fail])
	}
	mappingGenerate(path) { 
		this.mappingPath = path;	
		mappingGenerator(mysql_promise.createConnection(this._srConfig), mysql_promise.createConnection(this._desConfig), path)
	}
	schemaGen() {
		const result = graph.getSchema(this._srConfig, this._mappingPath);
	}
	syncTable() {
		let mappingConfig = require(this._mappingPath + '/origin-config.json');
		const result = graph.syncTable(this._srConfig, this._desConfig, mappingConfig);		
	}
	tableRelation() {
		const result = graph.tableRelation(this._srConfig)		
	}
}
module.exports = DBSync;
module.exports.DBSync = DBSync;
module.exports.default = DBSync;

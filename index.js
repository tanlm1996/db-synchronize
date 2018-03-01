'use strict'
//Import
const mysql = require('mysql');
const mysql_promise = require('mysql2/promise');
const graph = require('./lib/mapping-gen.js')
const mappingGenerator = graph.compareDatabases

class DBSync {
	constructor(srConfig, desConfig){
		this._srConfig = srConfig;
		this._desConfig = desConfig;
		this._mappingPath = __dirname;
		this._tasks = [];
	}
	set mappingPath(path) {
		this._mappingPath = path;
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
		//
		const timestamp = '2018-01-11T15:36:19.000'
		let mapping = require(path.join(this._mappingPath,'schema-config.json'))
		mapping.forEach((aConfig) => this._syncDataTable(aConfig,timestamp))	
		//this._syncDataTable(mapping[1],timestamp)
		//
		//const timestamp = '2018-01-11T15:36:19.000'
		//this._syncDataTable(config, timestamp)	;
		
	}
	_syncDataTable({fromTable, toTable, mapping, anchor_fromTable, anchor_toTable}, timestamp) {
		const srConnection = mysql.createConnection({
			host: this._srConfig.host,
			user: this._srConfig.user,
			password: this._srConfig.password,
			database: this._srConfig.database
		})
		const desConnection = mysql.createConnection({
			host: this._desConfig.host,
			user: this._desConfig.user,
			password: this._desConfig.password,
			database: this._desConfig.database
		})
		var
    		datapumps = require('datapumps'),
    		Pump = datapumps.Pump,
    		MysqlMixin = datapumps.mixin.MysqlMixin,
    		pump  = new Pump();
		const target = Object.keys(mapping).map(key => mapping[key])
		//Construct query for LOADING phase
		const insert_query = 'INSERT INTO ' + toTable + '(' + target.join() + ') VALUES (?)'
		//TODO: target.join kia dung voi anchor
		const update_query = ['UPDATE ' + toTable +' SET '+ target.join("=?, ") + '=? WHERE ' + anchor_toTable + '=?']
		//Construct extract query
		const extract_query = 'SELECT * FROM ' + fromTable + ' WHERE updatedAt > ?'
		const check_existed_statement = 'SELECT '+ anchor_toTable+' FROM '+ toTable + ' WHERE '+anchor_toTable+' = ? '	
		
		desConnection.beginTransaction((err) =>{
			//Transfer
				pump
					.from(srConnection.query(extract_query, timestamp).stream())
					.mixin(MysqlMixin(desConnection))
					.process((student) => {
						//Below is original version
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
							const values = Object.keys(mapping).map(element => student[element]) 
							//let tasks = this._tasks;
							return pump.query(check_existed_statement, student[anchor_fromTable])               
								.then(([result,fields]) => {
									if (result.length == 0) {
										return pump.query(insert_query, values);
									} else {
										values.push(student[anchor_fromTable])
										return pump.query.apply(pump, update_query.concat(values))
									}
								})
							//return pump.query(insert_query,values);

					})
					.logErrorsToConsole()
					.run()
					.then(() => {
						//pump.query('COMMIT')
						desConnection.commit((err)=> {
							if (err) {
								desConnection.rollback(()=> {throw err;})
							}
						})
						
						srConnection.end();//Close connection when finished
						desConnection.end();
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
		let mappingConfig = require(this._mappingPath + '/schema-config.json');
		const result = graph.syncTable(this._srConfig, this._desConfig, mappingConfig);		
	}
	tableRelation() {
		const result = graph.tableRelation(this._srConfig)		
	}
}
module.exports = DBSync;
module.exports.DBSync = DBSync;
module.exports.default = DBSync;

'use strict'
//Import
const mysql = require('mysql');
const mysql_promise = require('mysql2/promise');
const graph = require('./lib/mapping-gen.js')
const mappingGenerator = graph.compareDatabases
const fs = require('fs')
const os = require('os')
const readLastLines = require('read-last-lines')
const swap = require('./lib/swap.js')
const util = require('./lib/util.js')

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
		//This function get time from mysqlServer then write to log file
		//The only parameter is pathToTimeLog: path to log file
		const lastUpdateLogging = (pathToTimeLog) => {
			return mysql_promise.createConnection(this._srConfig)
					.then((conn) => {
						conn.query('SELECT CURRENT_TIMESTAMP() FROM DUAL')	
							.then(result => {
								fs.appendFileSync(pathToTimeLog, require('moment')(result[0][0]['CURRENT_TIMESTAMP()']).format('YYYY-MM-DD HH:mm:ss') + os.EOL)
								conn.end();
							})

					})
		}
		//var config = require(_mappingPath);
		/*var config = {
    				"idStudent": "idStudent",
    				"name": "name",
    				"address": "address",
    				"class": "class"
					}*/
		const path = require('path')
		//
		let timestamp;
		const pathToTimeLog = path.join(this._mappingPath, 'last-sync.log');
		if (fs.existsSync(pathToTimeLog)) {
			readLastLines.read(pathToTimeLog,1)
				.then((lines) => {
					timestamp = lines.trim();
					lastUpdateLogging(pathToTimeLog);
					let mapping = require(path.join(this._mappingPath,'schema-config.json'))
					mapping.forEach((aConfig) => this._syncDataTable(this._srConfig, this._desConfig, aConfig,timestamp, true))	
					//Reverse sync
					let mappingSwap = swap(mapping);
					mappingSwap.forEach((aConfig) => this._syncDataTable(this._desConfig, this._srConfig, aConfig,timestamp, false))	
					//console.log(mappingSwap)
					//Reverse sync
				})
				.catch((err) => console.log(err))
		} else {
			timestamp = undefined;
			lastUpdateLogging(pathToTimeLog);
			let mapping = require(path.join(this._mappingPath,'schema-config.json'))
			mapping.forEach((aConfig) => this._syncDataTable(this._srConfig, this._desConfig, aConfig,timestamp, true))	
			//TODO should enable this below code for reverse
			//Reverse sync
			let mappingSwap = swap(mapping);
			mappingSwap.forEach((aConfig) => this._syncDataTable(this._desConfig, this._srConfig, aConfig,timestamp, false))	
			//console.log(mappingSwap)
			//Reverse sync
			//TODO end
		}

		}
		_syncDataTable(srDB, desDB, {fromTable, toTable, mapping, anchor_fromTable, anchor_toTable, transformation}, timestamp, direct) {
		var transformDef = undefined
		if (transformation) {
			if (direct) {
				transformDef = transformation.forth
			} else {
				transformDef = transformation.back
			}
		}
		const srConnection = mysql.createConnection({
			host: srDB.host,
			user: srDB.user,
			password: srDB.password,
			database: srDB.database
		})
		const desConnection = mysql.createConnection({
			host: desDB.host,
			user: desDB.user,
			password: desDB.password,
			database: desDB.database
		})
		var
    		datapumps = require('datapumps'),
    		Pump = datapumps.Pump,
    		MysqlMixin = datapumps.mixin.MysqlMixin,
    		pump  = new Pump();
		const target = Object.keys(mapping).map(key => mapping[key])
		//Construct query for LOADING phase
		const insert_query = 'INSERT INTO ' + toTable + '(' + target.join() + ') VALUES (?)'
		console.log(insert_query)
		//TODO: target.join kia dung voi anchor
		const update_query = ['UPDATE ' + toTable +' SET '+ target.join("=?, ") + '=? WHERE ' + anchor_toTable + '=?']
		//Construct extract query
		let extract_query;
		if (!timestamp) {
			extract_query = 'SELECT * FROM ' + fromTable
		} else {
			extract_query = 'SELECT * FROM ' + fromTable + ' WHERE updatedAt > ?'
		}
		const check_existed_statement = 'SELECT '+ anchor_toTable+' FROM '+ toTable + ' WHERE '+anchor_toTable+' = ? '	
	
		desConnection.beginTransaction((err) =>{
			//Transfer
			desConnection.query('SET FOREIGN_KEY_CHECKS=0', () => {
				pump
					.from(srConnection.query(extract_query, timestamp).stream())
					.mixin(MysqlMixin(desConnection))
					.process((row) => {
							if (transformDef) {
								Object.keys(row).forEach(elem => {
									if (transformDef[mapping[elem]]) {
										row[elem] = util.transform(row, transformDef[mapping[elem]])
									} else {
										return
									}
								})
							}
							const values = Object.keys(mapping).map(element => row[element]) 
							//let tasks = this._tasks;
							return pump.query(check_existed_statement, row[anchor_fromTable])               
								.then(([result,fields]) => {
									if (result.length == 0) {
										return pump.query(insert_query, values);
									} else {
										values.push(row[anchor_fromTable])
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
						//desConnection.query('SET FOREIGN_KEY_CHECKS=1',{
							desConnection.end();
						//})
						console.log("Done data sync");
					})
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

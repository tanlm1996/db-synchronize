//This file compare two database and generate config for synchronization
'use strict'
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise')
/**
 * Build a config like
 * {
 * 		"fromTable": "sinh_vien",
 * 		"toTable": "sinh_vien",
 * 		"mapping": {}
 * }
**/
//If a element in arr1 exist in arr2 => result.element=element. Otherwise result.element = "";
function buildConfig(arr1, arr2){
	let result = new Object();
	arr1.forEach(function(element){
		if (arr2.findIndex(element_arr2 => element_arr2.Field == element.Field) != -1){
			result[element.Field] = element.Field;
		}else {
			result[element.Field] = "";
		}
	});	
	return result;
}
//Return a CONFIG from compare two same name table in two database
function compareTablesInTwoDatabase(connection,connection2, tableName) {
	const command = 'DESCRIBE ' + tableName;//Get information about table 
	return Promise.all([connection.then((conn) => conn.query(command)),connection2.then((conn) => conn.query(command))]) 
				.then(results =>{ var ketqua = buildConfig(results[0][0],results[1][0])
						//	console.log(ketqua);
						return ketqua;
				})

}
module.exports.compareDatabases = function mappingGenerate(connection, connection2, mapPath) {
	Promise.all([connection, connection2])//Establish connection
		.then(conns => {
			//Conns[0] is connection to database source and conns[1] is connection to database destination
			Promise.all([conns[0].query('SHOW TABLES'),conns[1].query('SHOW TABLES')])
					.then(tables => {
						var conclusion = new Array();//Result to be written to config-gen.json
						let tableListDes = tables[1][0].map(elem => elem['Tables_in_' + conns[1].connection.config.database])
						var position1 = path.join(mapPath,'config-gen.json');
						
						tableListSr.forEach(async (aTable, index, arr) => {						
							if (tableListDes.includes(aTable)){
								//conclusion[aTable] = await compareTablesInTwoDatabase(aTable)
								conclusion.push({"fromTable": aTable,
													"toTable": aTable,
													"mapping": await compareTablesInTwoDatabase(connection,connection2,aTable)
													})
							}
							if (index === arr.length-1){
								console.log('xong')
								conns[0].end();//Close connection to db source
								conns[1].end();//Close connection to db destination
								fs.writeFileSync(position1, JSON.stringify(conclusion, null, 2), 'utf-8');
							}
						})
					})
					.catch(err => console.log(err))
			//Query all relationship among entities in schema then write to config-relation.json
			Promise.all([conns[0].query("SELECT `TABLE_NAME`, `COLUMN_NAME`, `REFERENCED_TABLE_NAME`, `REFERENCED_COLUMN_NAME` FROM `information_schema`.`KEY_COLUMN_USAGE` WHERE `CONSTRAINT_SCHEMA` = 'wi_online_inventory' AND `REFERENCED_TABLE_SCHEMA` IS NOT NULL AND `REFERENCED_TABLE_NAME` IS NOT NULL AND `REFERENCED_COLUMN_NAME` IS NOT NULL")])
					.then(foreignKeys => {
							fs.writeFileSync('./config-relation.json', JSON.stringify(foreignKeys[0][0], null, 2), 'utf-8');
					})
					.catch(err => console.log(err))
		})
		.catch(err => console.log('Connection error: '+ err))
		
}
/**
 * Get all table structures in a database to get configuration
 * @param: dbConfig: database configuration for database connection
**/
const getSchema= function (dbConfig){
	mysql.createConnection(dbConfig)			
		.then((conn) => {
			conn.query('SHOW TABLES')
				.then(([tables,info])=> {
					let tableList = tables.map(elem => elem['Tables_in_' + conn.connection.config.database])
					Promise.all(tableList.map(async (aTable) => {
						const command = 'DESCRIBE ' + aTable;//Get information about table 
						return await conn.query(command);
					}))
						.then(rs => {
							const output = rs.map((elem, index) => {
								let aTableConfig = new Object();
								aTableConfig.fromTable = tableList[index];
								aTableConfig.toTable = tableList[index];
								aTableConfig.mapping = elem[0].reduce((accum, curr) => {accum[curr.Field]=curr.Field; return accum},{})
								return aTableConfig;		
							});
							fs.writeFileSync('./origin-config.json', JSON.stringify(output, null, 2), 'utf-8');
						})
					conn.end()
				})
		})
} 
const syncTable = function (srConfig, desConfig, mapConfig) {
	mysql.createConnection(srConfig)
		.then((srConn) => {
			mapConfig.map((aTableConfig) => {
					
			})
			srConn.end();
		})
}
module.exports.getSchema = getSchema;
module.exports.syncTable = syncTable;

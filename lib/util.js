function changeColumn(oldColumn, newColumnName, tableName) {
	let value_null=""
	oldColumn['Null'] == 'YES' ? value_null = 'NULL':value_null='NOT NULL'
	const value_field = oldColumn['Field']
	const value_type = oldColumn['Type']
	const value_key = oldColumn['Key']
	const value_default = oldColumn['Default']
	const value_extra = oldColumn['Extra']
	let query=""
	query = "ALTER TABLE " + tableName + " CHANGE COLUMN " + value_field + " " + newColumnName + " " + value_type + " " + value_null
	//console.log(value_default)
	//console.log(typeof value_default)
	if (value_default != null) {
		if (value_default == 'CURRENT_TIMESTAMP') {
			query += " DEFAULT " + value_default	
		} else {
			query += " DEFAULT '" + value_default + "'"
		}
	}
	query+= " " + value_extra
//	if (value_key == 'PRI') {
//		query += ', ADD PRIMARY KEY (' + newColumnName + ')'
//	} else if (value_key == 'MUL') {
//		query += ', ADD KEY (' + newColumnName + ')'
//	} else if (value_key == 'UNIQUE') {
//		query += ', ADD UNIQUE (' +newColumnName + ')'
//	}
	//console.log(query)
	return query
}
function transform(argObject, func) {
	if (func) {
		var fn = Function.apply(Function, Object.keys(argObject).concat('return ' + func))
		let result = fn.apply(fn, Object.keys(argObject).map(key=>argObject[key]))
		return result
	} else {
		return undefined
	}
}

module.exports.changeColumn = changeColumn
module.exports.transform = transform

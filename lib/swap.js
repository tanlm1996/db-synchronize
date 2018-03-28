//let config = require('../db-sync/sync-demo/config/schema-config-test.json');
function swap(json){
  var ret = {};
  for(var key in json){
    ret[json[key]] = key;
  }
	
  return ret;
}

function swapRole(conf) {
	return conf.map((aTable) => {
		//Swap fromTable va toTable
		let temp = aTable.fromTable;
		aTable.fromTable = aTable.toTable;
		aTable.toTable = temp;
		//Swap anchor_fromTable va anchor_toTable
		temp = aTable.anchor_fromTable;
		aTable.anchor_fromTable = aTable.anchor_toTable;
		aTable.anchor_toTable = temp;
		//Swap key vs its value in mapping config
		aTable.mapping = swap(aTable.mapping)	
		return aTable;
	})	
}
//console.log(config)
//console.log(swapRole(config))
module.exports = swapRole;

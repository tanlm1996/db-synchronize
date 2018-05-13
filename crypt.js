// Nodejs encryption with CTR
var crypto = require('crypto'),
    algorithm = 'aes-128-cbc',
    password = 'abc';

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}
 
function decrypt(text){
  var decipher = crypto.createDecipher(algorithm,password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}
 
//var hw = encrypt("hello world rakwjehfiwagoi3qrhgahg awekgjhaiwhg")
//console.log(hw)
// outputs hello world
console.log(decrypt(hw));
module.exports.encrypt = encrypt;
module.exports.decrypt = decrypt;

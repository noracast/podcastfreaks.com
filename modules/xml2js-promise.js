import xml2js from 'xml2js'

export default (input)=> {
  return new Promise(function(resolve, reject) {
    xml2js.parseString(input, function(err, result) {
      if (!err) {
        resolve(result)
      } else {
        reject(err)
      }
    })
  })
}
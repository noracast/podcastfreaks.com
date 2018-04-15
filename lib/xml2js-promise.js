import xml2js from 'xml2js'

export default (input, options)=> {
  return new Promise(function(resolve, reject) {
    xml2js.parseString(input, options, function(err, result) {
      if (!err) {
        resolve(result)
      } else {
        reject(err)
      }
    })
  })
}
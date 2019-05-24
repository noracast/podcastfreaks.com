exports.handler = async (event, context) => {
  console.log('submidssion created function called!')
  console.log(event)
  console.log(context)
  return {
    statusCode: 200,
    body: 'aaaa'
  };
};

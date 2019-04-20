import twitterFollowersCount from 'twitter-followers-count'

require('dotenv').config()

async function run (arg) {
  /*
  format:
    argument:
      {
        'RSS_KEY': {
          twitter: 'USERNAME',
          hashtag: 'HASHTAG'
        },
        ...
      }
    result:
      {
        'RSS_KEY': {
          followers: Number,
          hashtag_count: Number
        },
        ...
      }
  */
  let getTwitterFollowers = twitterFollowersCount({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  })


  let usernames = []
  let dict = {} // 後でusernameからの逆引きする用
  for(let key in arg) {
    if(arg[key].twitter){
      const username = arg[key].twitter
      usernames.push(username)
      dict[username] = key
    }
  }
  const followerData = await getTwitterFollowers(usernames)
  let res = {}
  for(let username in followerData) {
    const key = dict[username]
    res[key] = {
      followers: followerData[username]
    }
  }
  return res
}

export default run

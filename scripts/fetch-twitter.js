"use strict";

import TwitterFollowersCount from 'twitter-followers-count'

require('dotenv').config()

const tfc = TwitterFollowersCount({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

// Count followers
const countFollowers = async data => {
  let usernames = []
  let dict = {} // 後でusernameからの逆引きする用
  for(let key in data) {
    if(data[key].twitter){
      const username = data[key].twitter
      usernames.push(username)
      dict[username] = key
    }
  }
  const followerData = await tfc(usernames)
  let res = {}
  for(let username in followerData) {
    const key = dict[username]
    res[key] = {
      followers: followerData[username]
    }
  }
  return res
}

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

  // Count followers
  const followers = await countFollowers(arg)

  return followers
}

export default run

"use strict"

import _ from 'lodash'
import moment from 'moment'
import Twitter from 'twitter'
import TwitterFollowersCount from 'twitter-followers-count'

require('dotenv').config()

const tfc = new TwitterFollowersCount({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})
const twitter = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

const twitterSearch = (params) => {
  return new Promise((resolve, reject) => {
    twitter.get('search/tweets', params, function(error, tweets, response) {
      if (error) {
        reject(error)
      } else {
        resolve(tweets)
      }
    })
  })
}

// Count followers
const countFollowers = async data => {
  let usernames = []
  let reverseLookUpDict = {}
  for(let key in data) {
    if(data[key].twitter){
      const username = data[key].twitter
      usernames.push(username)
      reverseLookUpDict[username] = key
    }
  }
  const followerData = await tfc(usernames)
  let res = {}
  for(let username in followerData) {
    const key = reverseLookUpDict[username]
    res[key] = {
      followers: followerData[username]
    }
  }
  return res
}

// Count tweet including hash tag
const countTweets = async data => {
  let hashtags = []
  let reverseLookUpDict = {}
  for(let key in data) {
    if(data[key].hashtag){
      const hashtag = data[key].hashtag
      hashtags.push(hashtag)
      reverseLookUpDict[hashtag] = key
    }
  }

  let res = {}

  // Serial execution
  for(let hashtag of hashtags) {
    let query = hashtag
    query += ` since:${moment().add(-7, 'days').format('YYYY-MM-DD')}` // in the last 7-days
    if(process.env.TWITTER_LANG) {
      query += ` lang:${process.env.TWITTER_LANG}`
    }
    const tweetData = await twitterSearch({q: query, count: 100, result_type: 'recent'})
    const key = reverseLookUpDict[hashtag]
    res[key] = {
      tweets: tweetData.statuses.length,
      tweets_query: query
    }
  }
  return res
}

// for debug
// (async () => {
//   // do something
// })()

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
          tweets: Number
        },
        ...
      }
  */
  // Count followers
  const tweets = await countTweets(arg)

  // Count followers
  const followers = await countFollowers(arg)

  return _.merge({}, tweets, followers)
}

export default run

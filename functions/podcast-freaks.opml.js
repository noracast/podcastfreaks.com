import opml from 'opml-generator'
import rss from '../data/rss'

exports.handler = async (event, context) => {
  const header = {
      "title": "podcast-freaks channel list",
      "dateCreated": new Date(),
      "ownerName": "podcast-freaks"
  };
  const outlines = Object.keys(rss).map((channelName)=>{
    const channel = rss[channelName]
    return {
      text: "txt",
      title: channelName,
      type: "rss",
      "xmlUrl": channel.feed
    }
  })
  return {
    statusCode: 200,
    body: opml(header, outlines)
  };
};

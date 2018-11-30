import opml from 'opml-generator'

exports.handler = async (event, context) => {
  const header = {
      "title": "title-text",
      "dateCreated": new Date(2014, 2, 9),
      "ownerName": "azu"
  };
  const outlines = [
    {
      text: "txt",
      title: "title-text",
      type: "rss",
      "xmlUrl": "http://example.com/rss",
      "htmlUrl": "http://example.com/"
    },
    {
      text: "txt",
      title: "title-text",
      type: "rss",
      "xmlUrl": "http://example.com/rss",
      "htmlUrl": "http://example.com/"
    }
  ]
  return {
    statusCode: 200,
    body: opml(header, outlines)
  };
};

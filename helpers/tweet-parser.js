import axios from "axios";

export const fetchTweet = async (url) => {
  const tweetId = url.split("/").pop().split("?")[0];
  const response = await axios
    .get(`https://api.twitter.com/1.1/statuses/show.json?id=${tweetId}&tweet_mode=extended`, {
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_TOKEN}`,
      },
    })
    .then((response) => response)
    .catch((error) => console.error(url, error));
  const hasImages = response.data.extended_entities && response.data.extended_entities.media.length > 1;
  return hasImages;
};

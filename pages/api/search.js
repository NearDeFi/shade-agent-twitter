import 'dotenv/config';
import { twitter, SearchMode } from '../../utils/twitter';
import { SentimentAnalyzer, PorterStemmer } from 'natural';
import { sendNear } from '../../utils/near-provider';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
let lastTimestamp = 0; //1740006269;
let tweets = [];

console.log(process.env.TWITTER_USERNAME);

const processTweets = async () => {
    const tweet = tweets.shift();
    if (!tweet) return;

    console.log('processing tweet', {
        id: tweet.id,
        username: tweet.username,
        text: tweet.text,
        sentiment: tweet.sentiment,
        timestamp: tweet.timestamp,
        nearAccount: tweet.nearAccount,
    });

    const result = await sendNear(tweet.nearAccount, '1');
    console.log(result);
    // await twitter(
    //     'sendTweet',
    //     `😎 thanks @${tweet.username} I just sent you 1 N on testnet. Enjoy! 😎`,
    //     tweet.id,
    // );
    await sleep(15000);

    processTweets();
};

export default async function search(req, res) {
    // Search for recent tweets
    const results = await twitter(
        'searchTweets',
        process.env.TWITTER_SEARCH_TERM || 'blah',
        // '"Shade Agents" ".testnet"',
        20,
        SearchMode.Latest,
    );

    // dump the generator to array and reverse results (oldest tweet first)
    const temp = await Array.fromAsync(results);
    temp.reverse();
    // wipe out the last batch (just in case they didn't pop)
    tweets.length = 0;
    for (const tweet of temp) {
        if (tweet.timestamp <= lastTimestamp) continue;

        // lastTimestamp = tweet.timestamp;
        // get sentiment of text
        tweet.sentiment = analyzer.getSentiment(tweet.text.split(' '));
        // if it has a NEAR account
        tweet.nearAccount = tweet.text.match(/([a-zA-Z0-9]*).testnet/gim)?.[0];

        tweets.push(tweet);
    }

    // processTweets();

    res.status(200).json({
        tweets: tweets,
    });
}

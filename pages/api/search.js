import 'dotenv/config';
import { twitter, SearchMode } from '../../utils/twitter';
import { SentimentAnalyzer, PorterStemmer } from 'natural';
import { generateAddress } from '../../utils/kdf';
import { ethereum } from '../../utils/ethereum';
import { networkId } from '../../utils/near-provider';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
let lastTimestampBased = 0;
let lastTimestampShade = 0;
let tweets = [];
let isShade = false;
let processing = false;

const processTweets = async () => {
    // pull first tweet
    const tweet = tweets.shift();
    if (!tweet) {
        processing = false;
        console.log('processTweets: NO MORE TWEETS');
        return;
    }

    console.log('processTweets current:', {
        id: tweet.id,
        username: tweet.username,
        text: tweet.text,
        sentiment: tweet.sentiment,
        timestamp: tweet.timestamp,
        evmAddress: tweet.evmAddress,
    });

    // abs(sentiment * 10000) and then add decimals and convert to string
    const uint256 =
        Math.abs(parseInt(tweet.sentiment * 10000, 10)) + '000000000000000000';

    // evm call
    try {
        await ethereum.call({
            from: process.env.EVM_MINTER,
            to:
                tweet.sentiment > 0
                    ? process.env.EVM_TOKEN_ADDRESS_BASED
                    : process.env.EVM_TOKEN_ADDRESS_SHADE,
            method: 'mint',
            args: {
                address: tweet.evmAddress,
                uint256,
            },
        });
    } catch (e) {
        console.log('processTweets error sending tokens', e);
    }

    try {
        await twitter(
            'sendTweet',
            `😎 thanks @${tweet.username} I just sent you ${uint256.substring(
                0,
                4,
            )} ${
                tweet.sentiment > 0 ? 'BASED' : 'SHADE'
            } tokens on HyperLiquid. 😎`,
            tweet.id,
        );
    } catch (e) {
        console.log('processTweets error sending reply', e);
    }

    await sleep(15000);
    processTweets();
};

export default async function search(req, res) {
    const searchTerm = isShade
        ? process.env.TWITTER_SHADE
        : process.env.TWITTER_BASED;
    console.log('SEARCHING: ', searchTerm);
    // Search for recent tweets
    const results = await twitter(
        'searchTweets',
        searchTerm,
        100,
        SearchMode.Latest,
    );

    // dump the generator to array and reverse results (oldest tweet first)
    const temp = await Array.fromAsync(results);
    temp.reverse();

    console.log('SEARCH results.length', temp.length);

    // push new tweets
    for (const tweet of temp) {
        if (isShade) {
            if (tweet.timestamp <= lastTimestampShade) continue;
            lastTimestampShade = tweet.timestamp;
        } else {
            if (tweet.timestamp <= lastTimestampBased) continue;
            lastTimestampBased = tweet.timestamp;
        }

        // get sentiment of text
        tweet.sentiment = analyzer.getSentiment(tweet.text.split(' '));
        // give based sentiment if we don't really have any either way
        if (tweet.sentiment === 0) tweet.sentiment = 0.1;
        // tweet contains address
        tweet.evmAddress = tweet.text.match(/0x[a-fA-F0-9]{40}/gim)?.[0];

        if (!tweet.evmAddress) continue;

        tweets.push(tweet);
    }
    // switch search
    isShade = !isShade;

    console.log('SEARCH matching criteria', tweets.length);

    if (!processing) {
        processing = true;
        processTweets();
    }

    res.status(200).json({
        finished: true,
    });
}

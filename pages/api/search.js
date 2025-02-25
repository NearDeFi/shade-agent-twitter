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

console.log('TWITTER_USERNAME', process.env.TWITTER_USERNAME);
console.log('Running on NEAR', networkId);

const processTweets = async () => {
    const tweet = tweets.shift();
    if (!tweet) return;

    console.log('processing tweet', {
        id: tweet.id,
        username: tweet.username,
        text: tweet.text,
        sentiment: tweet.sentiment,
        timestamp: tweet.timestamp,
        evmAddress: tweet.evmAddress,
    });

    // get evm address to send from
    const { address } = await generateAddress({
        publicKey:
            networkId === 'testnet'
                ? process.env.MPC_PUBLIC_KEY_TESTNET
                : process.env.MPC_PUBLIC_KEY_MAINNET,
        accountId: process.env.NEXT_PUBLIC_contractId,
        path: 'shadeagent007',
        chain: 'evm',
    });

    const uint256 =
        (tweet.sentiment * 10000).toString().split('.')[0] +
        '000000000000000000';

    // make evm call
    await ethereum.call({
        from: address,
        to: isShade
            ? process.env.EVM_TOKEN_ADDRESS_SHADE
            : process.env.EVM_TOKEN_ADDRESS_BASED,
        args: {
            address:
                tweet.evmAddress ||
                '0xFa3D3ffd922ac4b520B7E3354F51Af37728A2fE3',
            uint256,
        },
    });

    await twitter(
        'sendTweet',
        `😎 thanks @${tweet.username} I just sent you ${uint256} ${
            isShade ? 'SHADE' : 'BASED'
        } tokens. 😎`,
        tweet.id,
    );

    await sleep(15000);

    processTweets();
};

export default async function search(req, res) {
    const searchTerm = isShade
        ? process.env.TWITTER_SHADE
        : process.env.TWITTER_BASED;
    console.log('searching for tweets matching', searchTerm);
    // Search for recent tweets
    const results = await twitter(
        'searchTweets',
        searchTerm,
        20,
        SearchMode.Latest,
    );

    // dump the generator to array and reverse results (oldest tweet first)
    const temp = await Array.fromAsync(results);
    temp.reverse();

    console.log('tweet results.length', temp.length);

    // push new tweets
    for (const tweet of temp) {
        if (tweet.timestamp <= lastTimestamp) continue;
        if (isShade) {
            lastTimestampShade = tweet.timestamp;
        } else {
            lastTimestampBased = tweet.timestamp;
        }

        // get sentiment of text
        tweet.sentiment = analyzer.getSentiment(tweet.text.split(' '));
        // give based sentiment if we don't really have any either way
        if (tweet.sentiment === 0) tweet.sentiment = 0.1;
        // tweet contains address
        tweet.evmAddress = tweet.text.match(/0x[a-fA-F0-9]{40}/gim)?.[0];
        // tweet.nearTestnetAccount = tweet.text.match(
        //     /([a-zA-Z0-9]*).testnet/gim,
        // )?.[0];
        // tweet.nearMainnetAccount =
        //     tweet.text.match(/([a-zA-Z0-9]*).near/gim)?.[0];

        if (!tweet.evmAddress) continue;

        tweets.push(tweet);
    }
    // switch from based to shade search terms
    isShade = !isShade;

    console.log('tweets matching criteria.length', tweets.length);

    processTweets();

    res.status(200).json({
        finished: true,
    });
}

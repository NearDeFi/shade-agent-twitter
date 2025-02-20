import { Scraper, SearchMode as _SearchMode } from 'agent-twitter-client';
export const SearchMode = _SearchMode;

let cookiesBaked = false;
const bakeCookies = async () => {
    if (cookiesBaked) return;

    const cookieStrings = [
        {
            key: 'auth_token',
            value: process.env.TWITTER_AUTH_TOKEN,
            domain: '.twitter.com',
        },
        {
            key: 'ct0',
            value: process.env.TWITTER_CT0,
            domain: '.twitter.com',
        },
        {
            key: 'guest_id',
            value: process.env.TWITTER_GUEST_ID,
            domain: '.twitter.com',
        },
    ].map(
        (cookie) =>
            `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${
                cookie.path
            }; ${cookie.secure ? 'Secure' : ''}; ${
                cookie.httpOnly ? 'HttpOnly' : ''
            }; SameSite=${cookie.sameSite || 'Lax'}`,
    );

    await scraper.setCookies(cookieStrings);
    cookiesBaked = true;
};

const scraper = new Scraper();

export const twitter = async (method, ...args) => {
    await bakeCookies();

    return scraper[method](...args);
};

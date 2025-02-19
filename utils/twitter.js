import { Scraper, SearchMode as _SearchMode } from 'agent-twitter-client';
export const SearchMode = _SearchMode;

let cookiesBaked = false;
const bakeCookies = async () => {
    if (cookiesBaked) return;

    const cookieStrings = [
        {
            key: 'auth_token',
            value: '574b94bd76502951bb0e7095cb9806584cc71830',
            domain: '.twitter.com',
        },
        {
            key: 'ct0',
            value: 'b4733cf7bd342566a47574f9650be130e36df6613cb5d384bf663fa11b47cb6ae2051ab6fdf02bdbaf170b87dc07ed9561ff68a2e41d061c7fbcf5f1410f942832f88e10d73c239cf5c2d61e203a5658',
            domain: '.twitter.com',
        },
        {
            key: 'guest_id',
            value: 'v1%3A173999405056446121',
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

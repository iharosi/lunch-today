'use strict';

const _ = require('lodash');
const url = require('url');
const moment = require('moment');
const request = require('request-promise-native');
const fbGrapApiUrl = 'https://graph.facebook.com/v2.12';
const fbId = '494549960697458';
const defaultOptions = {
    qs: {
        access_token: process.env.FB_ACCESS_TOKEN // eslint-disable-line camelcase
    },
    headers: {
        'User-Agent': [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6)',
            'AppleWebKit/604.5.6 (KHTML, like Gecko)',
            'Version/11.0.3 Safari/604.5.6'
        ].join(' ')
    },
    json: true
};

const getDataFromPost = (fbPosts) => {
    let todayPosts;
    let payload = {
        postUrl: null,
        menu: []
    };

    if (fbPosts && fbPosts.data) {
        todayPosts = fbPosts.data
            .filter((post) => {
                return post.message.indexOf('Leveseink') >= 0;
            })
            .filter((post) => {
                return moment().isSame(moment(post.created_time), 'day');
            });
    }

    if (todayPosts.length) {
        payload.postUrl = todayPosts[0].permalink_url;
        payload.menu = payload.menu.concat(todayPosts[0].message
            .slice(todayPosts[0].message.indexOf('Leveseink'))
            .split('\n')
            .filter((line, index, array) => {
                let keep = true;
                let previous = array[index - 1];

                if (line.charAt() !== '-' && previous && previous.charAt() === '-') {
                    keep = false;
                }

                return keep;
            }));
    }

    return payload;
};

const getDataFromPage = (page) => {
    return {
        name: _.get(page, 'name', null)
    };
};

const getDataFromPicture = (picture) => {
    return {
        logo: _.get(picture, 'data.url', null)
    };
};

const fetch = () => {
    return new Promise((resolve, reject) => {
        let optionForPosts = {
            uri: url.resolve(fbGrapApiUrl, 'posts'),
            qs: {
                id: fbId,
                fields: 'created_time,message,permalink_url',
                limit: 5
            }
        };
        let optionForPage = {
            uri: url.resolve(fbGrapApiUrl, fbId)
        };
        let optionForPicture = {
            uri: url.resolve(fbGrapApiUrl, `${fbId}/picture`),
            qs: {
                redirect: false,
                type: 'large'
            }
        };

        Promise.all([
            request(_.merge({}, defaultOptions, optionForPosts)),
            request(_.merge({}, defaultOptions, optionForPage)),
            request(_.merge({}, defaultOptions, optionForPicture))
        ]).then((responses) => {
            return _.merge(
                {},
                getDataFromPost(responses[0]),
                getDataFromPage(responses[1]),
                getDataFromPicture(responses[2])
            );
        }).then((payload) => {
            resolve({
                id: 'foodie',
                name: payload.name,
                logo: payload.logo,
                url: payload.postUrl,
                menu: payload.menu,
                lastUpdated: moment().format()
            });
        })
        .catch(reject);
    });
};

module.exports.fetch = fetch;

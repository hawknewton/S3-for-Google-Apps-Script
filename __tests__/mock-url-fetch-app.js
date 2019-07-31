const debug = require('util').debuglog('mock-url-fetch-app');
const request = require('sync-request');

const fetch = (url, params) => {
  debug(`${params.method}: ${url}`, params);

  const headers = params.headers;

  if(params.contentType) {
    headers['Content-Type'] = params.contentType;
  }

  const response = request(params.method, url, { headers: headers, body: params.payload });
  debug('Got status code:',  response.statusCode);
  debug(Buffer.from(response.body).toString());

  return {
    getResponseCode: () => response.statusCode,
    getHeaders: () => response.headers,
    getContentText: () => Buffer.from(response.body)
  }
};


module.exports = {
  fetch,
  getRequest: () => {}
};

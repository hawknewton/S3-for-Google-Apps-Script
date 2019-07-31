const debug = require('util').debuglog('mock-utilities');
const crypto = require('crypto');
const util = require('util');

const base64Encode = (data) => {
  const str = new Buffer.from(data).toString('base64');
  debug(`Got base64 encoded string [${data}]: ${str}`);

  return str;
};

const computeDigest = (algorithm, data, charset) => {
  var alg;

  if(algorithm == 'MD5') {
    alg = 'md5';
  } else if(algorithm == 'SHA_256') {
    alg = 'sha256';
  } else {
    throw('I only know how to SHA_256 and MD5');
  }

  if(charset != 'UTF_8') {
    throw('I only know UTF_8');
  }

  const result = crypto.createHash(alg).update(data).digest();

  debug(`computed md5 digest [${data}]: ${result}`);
  return result
};

const computeHmacSignature = (algorithm, value, key, charSet) => {
  debug(`${algorithm}, ${value}, ${key}, ${charSet}`);

  var alg;

  if(algorithm == 'HMAC_SHA_1') {
    alg = 'sha1';
  } else if(algorithm == 'HMAC_SHA_256') {
    alg = 'sha256'
  } else  {
    throw('I only know HMAC_SHA_1 and HMAC_SHA_256');
  }

  if(charSet != 'UTF_8') {
    throw('I only speak UTF_8');
  }

  const hmac = crypto.createHmac(alg, key);
  hmac.write(value);
  hmac.end();

  return hmac.read();
};

const pad = (number) => {
  if (number < 10) {
    return '0' + number;
  }
  return number;
};

const formatDate = (date, tz, format) => {
  return date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z';
};

const formatString = (format, etc) => {
  return util.format.apply(util, arguments);
};

const newBlob = (obj, type) => {
  return {
    obj: obj,
    type: type,
    copyBlob: jest.fn(),
    getDataAsString: () => obj,
    getContentType: () => type,
  };
};

module.exports = {
  Charset: { UTF_8: 'UTF_8' },
  DigestAlgorithm: { MD5: 'MD5', SHA_256: 'SHA_256' },
  MacAlgorithm: { HMAC_SHA_1: 'HMAC_SHA_1', HMAC_SHA_256: 'HMAC_SHA_256' },
  base64Encode,
  computeDigest,
  computeHmacSignature,
  formatDate,
  formatString,
  newBlob
};

const debug = require('util').debuglog('mock-utilities');
const crypto = require('crypto');
const util = require('util');

const base64Encode = (data) => {
  const str = new Buffer.from(data).toString('base64');
  debug(`Got base64 encoded string [${data}]: ${str}`);

  return str;
};

const computeDigest = (algorithm, data, charset) => {
  if(algorithm != 'MD5') {
    throw('I only know how to MD5');
  }

  if(charset != 'UTF_8') {
    throw('I only know UTF_8');
  }

  const result = crypto.createHash('md5').update(data).digest();

  debug(`computed md5 digest [${data}]: ${result}`);
  return result
};

const computeHmacSignature = (algorithm, value, key, charSet) => {
  debug(`${algorithm}, ${value}, ${key}, ${charSet}`);

  if(algorithm != 'HMAC_SHA_1') {
    throw('I only know HMAC_SHA_1');
  }

  if(charSet != 'UTF_8') {
    throw('I only speak UTF_8');
  }

  const hmac = crypto.createHmac('sha1', key);
  hmac.write(value);
  hmac.end();

  return hmac.read();
};

const formatDate = (format, etc) => {
  return util.format.apply(util, arguments);
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
  DigestAlgorithm: { MD5: 'MD5' },
  MacAlgorithm: { HMAC_SHA_1: 'HMAC_SHA_1' },
  base64Encode,
  computeDigest,
  computeHmacSignature,
  formatDate,
  formatString,
  newBlob
};

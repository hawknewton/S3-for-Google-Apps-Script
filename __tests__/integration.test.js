require('dotenv').config();
const gas = require('gas-local');
const debug = require('util').debuglog('s3');
const AWS = require('aws-sdk');

const mockUtilities = require('./mock-utilities');
const mockUrlFetchApp = require('./mock-url-fetch-app');

const mocks = {
  Utilities: mockUtilities,
  UrlFetchApp: mockUrlFetchApp,
  __proto__: gas.globalMockDefault
};

const glib = gas.require('./src', mocks);

test('Upload an object', async () => {
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const testBucket = process.env.TEST_S3_BUCKET;

  const S3 = glib.S3;

  const service = new S3(awsAccessKeyId, awsSecretAccessKey);
  service.putObject(testBucket, 'test-object', mockUtilities.newBlob('blah', 'text/plain'));

  //  const client = new AWS.S3({accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey});
  //  const response = await client.getObject({Bucket: testBucket, Key: 'test-object'}).promise();
  //
  //  debug(response);
  //  expect(response.ContentLength).toEqual('text/plain');
});

/* constructs an S3Request to an S3 service
 *
 * @constructor
 * @param {S3} service S3 service to which this request will be sent
 */
function S3Request(service) {
  this.service = service;

  this.httpMethod = "GET";
  this.contentType = "";
  this.content = ""; //content of the HTTP request
  this.bucket = ""; //gets turned into host (bucketName.s3.amazonaws.com)
  this.objectName = "";
  this.headers = {};

  this.date = new Date();
}

/* sets contenetType of the request
 * @param {string} contentType mime-type, based on RFC, indicated how content is encoded
 * @throws {string} message if invalid input
 * @return {S3Request} this request, for chaining
 */
S3Request.prototype.setContentType = function (contentType) {
  if (typeof contentType != 'string') throw 'contentType must be passed as a string';
  this.contentType = contentType;
  return this;
};

S3Request.prototype.getContentType = function () {
  if (this.contentType) {
    return this.contentType;
  } else {
    //if no contentType has been explicitly set, default based on HTTP methods
    if (this.httpMethod == "PUT" || this.httpMethod == "POST") {
      //UrlFetchApp defaults to this for these HTTP methods
      return "application/x-www-form-urlencoded";
    }
  }
  return "";
}


/* sets content of request
 * @param {string} content request content encoded as a string
 * @throws {string} message if invalid input
 * @return {S3Request} this request, for chaining
 */
S3Request.prototype.setContent = function(content) {
  if (typeof content != 'string') throw 'content must be passed as a string'
  this.content = content;
  return this;
};

/* sets Http method for request
 * @param {string} method http method for request
 * @throws {string} message if invalid input
 * @return {S3Request} this request, for chaining
 */
S3Request.prototype.setHttpMethod = function(method) {
  if (typeof method != 'string') throw "http method must be string";
  this.httpMethod = method;
  return this;
};

/* sets bucket name for the request
 * @param {string} bucket name of bucket on which request operates
 * @throws {string} message if invalid input
 * @return {S3Request} this request, for chaining
 */
S3Request.prototype.setBucket = function(bucket) {
  if (typeof bucket != 'string') throw "bucket name must be string";
  this.bucket = bucket;
  return this;
};
/* sets objectName (key) for request
 * @param {string} objectName name that uniquely identifies object within bucket
 * @throws {string} message if invalid input
 * @return {S3Request} this request, for chaining
 */
S3Request.prototype.setObjectName = function(objectName) {
  if (typeof objectName != 'string') throw "objectName must be string";
  this.objectName = objectName;
  return this;
};


/* adds HTTP header to S3 request (see AWS S3 REST api documentation for possible values)
 *
 * @param {string} name Header name
 * @param {string} value Header value
 * @throws {string} message if invalid input
 * @return {S3Request} this object, for chaining
 */
S3Request.prototype.addHeader = function(name, value) {
  if (typeof name != 'string') throw "header name must be string";
  if (typeof value != 'string') throw "header value must be string";
  this.headers[name] = value;
  return this;
};

/* gets Url for S3 request
 * @return {string} url to which request will be sent
 */
S3Request.prototype.getUrl = function() {
  return "http://" + this.getHostName_() + '/' + this.objectName;
};
/* executes the S3 request and returns HttpResponse
 *
 * Supported options:
 *   logRequests - log requests (and responses) will be logged to Apps Script's Logger. default false.
 *   echoRequestToUrl - also send the request to this URL (useful for debugging Apps Script weirdness)
 *
 * @param {Object} options object with properties corresponding to option values; see documentation
 * @throws {Object} AwsError on failure
 * @returns {goog.UrlFetchApp.HttpResponse}
 */
S3Request.prototype.execute = function(options) {
  options = options || {};

  const contentHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, this.content, Utilities.Charset.UTF_8);
  this.headers['x-amz-content-sha256'] = this.toHexString_(contentHash);

  if(this.getContentType()) {
    this.headers['Content-Type'] = this.getContentType();
  }

  this.headers.Authorization = this.getAuthHeader_();
  this.headers.Date = this.date.toUTCString();
  var params = {
    method: this.httpMethod,
    payload: this.content,
    headers: this.headers,
    muteHttpExceptions: true //get error content in the response
  }

  //only add a ContentType header if non-empty (although should be OK either way)
  if (this.getContentType()) {
    params.contentType = this.getContentType();
  }

  var response = UrlFetchApp.fetch(this.getUrl(), params);

  //debugging stuff
  var request = UrlFetchApp.getRequest(this.getUrl(), params);

  //Log request and response
  this.lastExchangeLog = this.service.logExchange_(request, response);
  if (options.logRequests) {
    Logger.log(this.service.getLastExchangeLog());
  }

  //used in case you want to peak at the actual raw HTTP request coming out of Google's UrlFetchApp infrastructure
  if (options.echoRequestToUrl) {
    UrlFetchApp.fetch(options.echoRequestToUrl, params);
  }

  //check for error codes (AWS uses variants of 200s for flavors of success)
  if (response.getResponseCode() > 299) {
    //convert XML error response from AWS into JS object, and give it a name
    var error = {};
    error.name = "AwsError";
    try {
      var errorXmlElements = XmlService.parse(response.getContentText()).getRootElement().getChildren();

      for (i in errorXmlElements) {
        var name = errorXmlElements[i].getName();
        name = name.charAt(0).toLowerCase() + name.slice(1);
        error[name] = errorXmlElements[i].getText();
      }
      error.toString = function() { return "AWS Error - "+this.code+": "+this.message; };

      error.httpRequestLog = this.service.getLastExchangeLog();
    } catch (e) {
      //error parsing XML error response from AWS (will obscure actual error)
      error.message = "AWS returned HTTP code " + response.getResponseCode() + ", but error content could not be parsed."
      error.toString = function () { return this.message; };
      error.httpRequestLog = this.service.getLastExchangeLog();
    }

    throw error;
  }

  return response;
};


/* computes Authorization Header value for S3 request
 * reference http://docs.aws.amazon.com/AmazonS3/latest/dev/RESTAuthentication.html
 *
 * @private
 * @return {string} base64 encoded HMAC-SHA1 signature of request (see AWS Rest auth docs for details)
 */
S3Request.prototype.getAuthHeader_ = function () {
  const signingKey = this.getSigningKey_();
  const signature = this.toHexString_(Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, this.getStringToSign(), signingKey, Utilities.Charset.UTF_8));

  return 'AWS4-HMAC-SHA256 ' +
    'Credential=' + this.service.accessKeyId +
    '/' + this.getUTCDate_() +
    '/' + this.service.region +
    '/s3/aws4_request,SignedHeaders=' +
    this.getSortedHeaderNames_().join(';') +
    ',Signature=' + signature;
};

S3Request.prototype.getCanonicalRequest = function() {
  var requestStr = this.httpMethod + "\n";
  requestStr += "/" + this.objectName + "\n";

  // No query string
  requestStr += "\n";

  const lowerCaseHeaders = this.getLowerCaseHeaders_();
  const sortedHeaderNames = this.getSortedHeaderNames_();

  const contentHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, this.content, Utilities.Charset.UTF_8);

  requestStr += sortedHeaderNames.map(function(name) { return name + ':' + lowerCaseHeaders[name] }).join("\n");
  requestStr += "\n\n" + sortedHeaderNames.join(';') + "\n"
  return requestStr + this.toHexString_(contentHash);
};

S3Request.prototype.getStringToSign = function() {
  var stringToSign = "AWS4-HMAC-SHA256\n";
  stringToSign += this.date.toUTCString() + "\n";
  stringToSign += this.getUTCDate_() + '/' + this.service.region + "/s3/aws4_request\n";
  stringToSign += this.toHexString_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, this.getCanonicalRequest(), Utilities.Charset.UTF_8));

  return stringToSign;
};

S3Request.prototype.getUTCDate_ = function(err) {
  function pad(num) {
    if(num < 10) {
      return '0' + num;
    }
    return num;
  }

  return this.date.getUTCFullYear().toString() + pad(this.date.getUTCMonth() + 1) + pad(this.date.getUTCDate());
};

S3Request.prototype.getSigningKey_ = function() {
  const dateKey = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, this.getUTCDate_(), 'AWS4' + this.service.secretAccessKey, Utilities.Charset.UTF_8);
  const dateRegionKey = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, this.service.region, dateKey, Utilities.Charset.UTF_8);
  const dateRegionServiceKey = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, 's3', dateRegionKey, Utilities.Charset.UTF_8);
  return Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, 'aws4_request', dateRegionServiceKey, Utilities.Charset.UTF_8);
};

S3Request.prototype.getLowerCaseHeaders_ = function() {
  const lowerCaseHeaders = {};
  for(var name in this.headers) {
    lowerCaseHeaders[name.toLowerCase()] = this.headers[name];
  }
  lowerCaseHeaders.host = this.getHostName_();

  return lowerCaseHeaders;
};

S3Request.prototype.getSortedHeaderNames_ = function() {
  return Object.keys(this.getLowerCaseHeaders_()).sort();
};

S3Request.prototype.toHexString_ = function(arr) {
  var s = '';
  arr.forEach(function(byte) {
    s += ('0' + (byte & 0xFF).toString(16)).slice(-2);
  });
  return s;
};

S3Request.prototype.getHostName_ = function() {
  return this.bucket.toLowerCase() + '.s3.' + this.service.region + '.amazonaws.com'
};

'use strict';

require('dotenv').config();
var jwksClient = require('jwks-rsa');
var jwt = require('jsonwebtoken');
var fs = require('fs');


var policyDocumentFilename = 'policyDocument.json';
var policyDocument;
try {
    policyDocument = JSON.parse(fs.readFileSync( __dirname + '/' + policyDocumentFilename, 'utf8'));
} catch (e) {
    if (e.code === 'ENOENT') {
        console.error('Expected ' + policyDocumentFilename + ' to be included in Lambda deployment package');
        // fallthrough
    }
    throw e;
}



// extract and return the Bearer Token from the Lambda event parameters
var getToken = function( params ) {
    var token;
    
    if ( ! params.type || params.type !== 'TOKEN' ) {
        throw new Error( "Expected 'event.type' parameter to have value TOKEN" );
    }

    var tokenString = params.authorizationToken;
    if ( !tokenString ) {
        throw new Error( "Expected 'event.authorizationToken' parameter to be set" );
    }
    
    var match = tokenString.match( /^Bearer (.*)$/ );
    if ( ! match || match.length < 2 ) {
        throw new Error( "Invalid Authorization token - '" + tokenString + "' does not match 'Bearer .*'" );
    }
    return match[1];
}



module.exports.authenticate = function (params, cb) {
    console.log(params);
    var token = getToken(params);


var client = jwksClient({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10, // Default value
  jwksUri: 'https://' + process.env.AUTH0_DOMAIN + '/.well-known/jwks.json'
});

var decoded = jwt.decode(token, {complete: true});
//console.log(decoded.header);
//console.log(decoded.payload)

var kid = decoded.header.kid;

client.getSigningKey(kid, function(err, key) {
  var signingKey = key.publicKey || key.rsaPublicKey;


  jwt.verify(token, signingKey, { audience: process.env.AUDIENCE, issuer: 'https://' + process.env.AUTH0_DOMAIN + '/' }, 
  function(err, decoded) {
  if(err){
    cb(err);
  }
  else {
    
      cb(null, {
        principalId     : decoded.sub,
        policyDocument  : policyDocument
    });
  }
});
  
});


    
}

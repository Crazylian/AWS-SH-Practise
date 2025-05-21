// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
const docClient = new AWS.DynamoDB.DocumentClient()

exports.getByIdHandler = async(event, context) => {
  return AWSXRay.captureAsyncFunc('## Handler', async(subsegment) => {
    let response, id
    try {
      if (event.httpMethod !== 'GET') {
        throw new Error(`getById only accept GET method, you tried: ${event.httpMethod}`)
      }

      id = event.pathParameters.id
      const item = await getItemById(id, subsegment)

      response = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(item)
      }
      //Tracing
      subsegment.addAnnotation('ItemID', id)
      subsegment.addAnnotation('Status', 'SUCCESS')
    }
    catch (err) {

      response = {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      }
      //Tracing
      subsegment.addAnnotation('ItemID', id)
      subsegment.addAnnotation('Status', 'FAILED')
    }
    finally {
      subsegment.close()
    }
    return response
  }, AWSXRay.getSegment());
}


const getItemById = async(id, segment) => {
  return AWSXRay.captureAsyncFunc('## getItemData', async(subsegment) => {
    let response
    try {
      var params = {
        TableName: process.env.SAMPLE_TABLE,
        Key: { id: id }
      }

      response = await docClient.get(params).promise()
      //Tracing
      subsegment.addMetadata('Item', response)
    }
    catch (err) {
      throw err
    }
    finally {
      subsegment.close()
    }
    return response
  }, segment);
}


// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
const docClient = new AWS.DynamoDB.DocumentClient()

exports.getAllItemsHandler = async (event, context) => {
    return AWSXRay.captureAsyncFunc('## Handler', async (subsegment) => {
        let response
        try {
            if (event.httpMethod !== 'GET') {
                throw new Error(`getAllItems only accept GET method, you tried: ${event.httpMethod}`)
            }

            const items = await getAllItems(subsegment)
            if(items != null){
                console.log('We have a valid response from getAllItems method call');
                response = {
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(items)
                }
                //Tracing
                subsegment.addAnnotation('ItemsCount', items.Count)
                subsegment.addAnnotation('Status', 'SUCCESS')
            }
            else{
                 console.error('Response is not valid from getAllItems method call')
                 subsegment.addAnnotation('Status', 'FAILED')
                 subsegment.addAnnotation('Error', 'Response is not valid from getAllItems method call')
                 response = {
                    statusCode: 500,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    }
            }
                 
            }
        } catch (err) {
            //Tracing
            subsegment.addAnnotation('Status', 'FAILED')
            response = {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            }
        } finally {
            subsegment.close()
        }
        return response
    }, AWSXRay.getSegment());
}


const getAllItems = async (segment) => {
    return AWSXRay.captureAsyncFunc('## getAllItemsData', async (subsegment) => {
        let response = null
        try {
            var params = {
                TableName: process.env.SAMPLE_TABLE
            }
            
            //Tracing
            if(response != null){
                subsegment.addMetadata('items', response)
            }
        } catch (err) {
            throw err
        } finally {
            subsegment.close()
        }
        return response
    }, segment);
}

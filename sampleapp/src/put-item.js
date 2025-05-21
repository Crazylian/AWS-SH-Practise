// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
const docClient = new AWS.DynamoDB.DocumentClient()

exports.putItemHandler = async (event, context) => {
    return AWSXRay.captureAsyncFunc('## Handler', async (subsegment) => {
        let response
        try {
            if (event.httpMethod !== 'POST') {
                throw new Error(`PutItem only accept POST method, you tried: ${event.httpMethod}`)
            }

            const item = await putItem(event, subsegment)

            response = {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(item)
            }
            //Tracing
            subsegment.addAnnotation('ItemID', JSON.parse(event.body).id)
            subsegment.addAnnotation('Status', 'SUCCESS')
        } catch (err) {
            //Tracing
            subsegment.addAnnotation('ItemID', JSON.parse(event.body).id)
            subsegment.addAnnotation('Status', 'FAILED')
            response = {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(err)
            }
        } finally {
            subsegment.close()
        }
        return response
    }, AWSXRay.getSegment());
}

const putItem = async (event, segment) => {
    return AWSXRay.captureAsyncFunc('## putItemData', async (subsegment) => {
        let response
        try {
            const body = JSON.parse(event.body)
            const id = body.id
            const name = body.name

            var params = {
                TableName: process.env.SAMPLE_TABLE,
                Item: { id: id, name: name }
            }

            response = await docClient.put(params).promise()

            //Tracing
            subsegment.addMetadata('Item Payload', params)
        } catch (err) {
            throw err
        } finally {
            subsegment.close()
        }
        return response
    }, segment);
}



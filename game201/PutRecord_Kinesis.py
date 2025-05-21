import csv
import json
import boto3
import time
import string
import random

def generate(stream_name, kinesis_client):
    with open("./sample.csv", encoding='utf-8') as csvf:
        csvReader = csv.DictReader(csvf)
        for rows in csvReader:
            partitionaKey = ''.join(random.choices(string.ascii_uppercase + string.digits, k = 20))
            jsonMsg = json.dumps(rows)
            res = kinesis_client.put_record(StreamName = stream_name,
                                      Data = jsonMsg,
                                      PartitionKey = partitionaKey)
            print(res)
            print(jsonMsg)
            time.sleep(3)

if __name__ == '__main__':
    generate('datastream-prod', boto3.client('kinesis',aws_access_key_id="AK",aws_secret_access_key="SK",aws_session_token="TOKEN",region_name="us-east-1"))

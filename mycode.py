# 导入 Flask 类
from flask import Flask,request
import pymysql
import boto3


# 创建应用实例
app = Flask(__name__) 

client = boto3.client('dynamodb',region_name="us-east-1")
db = pymysql.connect(host='unicorndb.cluster-c05ggkw84v5s.us-east-1.rds.amazonaws.com',
                    user='unicorndb',
                    password='unicorndb',
                    database='unicorndb')

@app.route('/')
def hello():
    return 'Hello World!'

@app.route('/post_data1',methods=['POST']) 
def post_data1():
    data = request.json
    id=data.get('id')
    value=data.get('value')

    db = pymysql.connect(host='unicorndb.cluster-c05ggkw84v5s.us-east-1.rds.amazonaws.com',
                    user='unicorndb',
                    password='unicorndb',
                    database='unicorndb')
    
    cursor = db.cursor()
    cursor.execute('INSERT INTO unicorndb VALUES (%s,%s)',(id,value))
    db.commit()
    db.close
    return {"statusCode":200}

@app.route('/post_data2',methods=['POST']) 
def post_data2():
    data = request.json
    id=data.get('id')
    value=data.get('value')
    client.put_item(
        TableName='unicorndb',
        Item = {
            'id': {'S': id},
            'value': {'S': value}
        }
    )
    return {"statusCode":200}

@app.route('/get_value',methods=['GET'])
def get_value():
    id = request.args.get('id')

    response = client.get_item(
        TableName = 'unicorndb',
        Key = {
            "id": {'S': id}
            }
        )
    
    response=response['Item']['value']['S']
    print(response)

    db = pymysql.connect(host='unicorndb.cluster-c05ggkw84v5s.us-east-1.rds.amazonaws.com',
                        user='unicorndb',
                        password='unicorndb',
                        database='unicorndb')
    cursor = db.cursor()
    cursor.execute("SELECT `value` FROM unicorndb WHERE unicorndb.id = %s",(id))
    result = cursor.fetchone()[0]
    print(result)

    re = int(response)+int(result)

    return {"message":f"{re}"},200


# 启动服务
if __name__ == '__main__':
    app.run(host='0.0.0.0',port=8080)
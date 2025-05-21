# 导入 Flask 类
from flask import Flask,request
import pymysql
import boto3


# 创建应用实例
app = Flask(__name__) # 'Flask' 参数是 应用程序模块 或 包 的名称
                      # __name__是适用于大多数情况的便捷快捷方式
client = boto3.client('dynamodb',region_name="us-east-1")
db = pymysql.connect(host='unicorndb.cluster-c05ggkw84v5s.us-east-1.rds.amazonaws.com',
                     user='unicorndb',
                     password='unicorndb',
                     database='unicorndb')

# 路由 (装饰器)
@app.route('/')           # route()装饰器告诉 Flask 什么路径触发下面的功能
def hello():
   # 该函数返回我们想要在浏览器中显示的消息内容
   return 'Hello World!'
   # 默认类型 HTML, 因此字符串中的 HTML 将被浏览器渲染
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
      TableName='unicorndb2',
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
      TableName = 'unicorndb2',
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
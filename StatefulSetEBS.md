# Kubernetes StatefulSet 与 AWS EBS 全面指南

## 目录
1. [StatefulSet 基本概念](#statefulset-基本概念)
2. [AWS EBS 概述](#aws-ebs-概述)
3. [EKS 中的 EBS 集成](#eks-中的-ebs-集成)
4. [应用场景](#应用场景)
5. [实际案例](#实际案例)
6. [考试重点](#考试重点)

## StatefulSet 基本概念

### 什么是 StatefulSet？

StatefulSet 是 Kubernetes 中用于管理有状态应用程序的工作负载 API 对象。与 Deployment 不同，StatefulSet 为每个 Pod 维护一个固定的标识，这些标识在重新调度时也会保持不变。StatefulSet 保证了 Pod 的顺序性和唯一性，使其非常适合需要以下一项或多项要求的应用程序：

- 稳定、唯一的网络标识符
- 稳定、持久的存储
- 有序、优雅的部署和扩展
- 有序、优雅的删除和终止
- 有序的自动滚动更新

### StatefulSet 的关键特性

1. **稳定的网络标识**：
   - 每个 Pod 获得一个基于 StatefulSet 名称和索引的固定主机名
   - 格式为：`<statefulset-name>-<ordinal-index>`
   - 通过 Headless Service 提供稳定的网络标识

2. **有序部署和扩展**：
   - Pod 按顺序创建（从 0 到 N-1）
   - 每个 Pod 必须处于 Running 和 Ready 状态后，才会创建下一个 Pod
   - 缩减时按相反顺序（从 N-1 到 0）

3. **持久存储**：
   - 使用 PersistentVolumeClaim 为每个 Pod 提供持久存储
   - 即使 Pod 重新调度，存储也会保持不变
   - 删除 StatefulSet 不会删除关联的卷

4. **更新策略**：
   - RollingUpdate：按顺序更新 Pod（默认）
   - OnDelete：只有在手动删除 Pod 时才会创建新的 Pod

### StatefulSet 与 Deployment 的比较

| 特性 | StatefulSet | Deployment |
|------|------------|------------|
| Pod 标识 | 固定、有序 | 随机、无序 |
| 网络标识 | 稳定、可预测 | 动态分配 |
| 存储 | 持久、与 Pod 标识关联 | 通常是临时的 |
| 扩展顺序 | 有序（0 到 N-1） | 并行、无序 |
| 更新方式 | 有序滚动更新 | 默认使用 RollingUpdate |
| 使用场景 | 有状态应用（数据库、分布式系统） | 无状态应用（Web 服务器、API 服务） |

### StatefulSet 的组件

1. **Headless Service**：
   - 没有 Cluster IP 的服务
   - 为每个 Pod 创建 DNS 记录
   - 允许直接访问特定的 Pod

2. **VolumeClaimTemplate**：
   - 为每个 Pod 自动创建 PVC
   - 确保每个 Pod 有自己的存储
   - PVC 命名格式：`<volumeclaimtemplate-name>-<statefulset-name>-<ordinal-index>`

3. **Pod 模板**：
   - 定义 Pod 的规格
   - 包含容器、资源请求和限制
   - 引用 VolumeClaimTemplate 创建的卷

## AWS EBS 概述

### 什么是 AWS EBS？

Amazon Elastic Block Store (EBS) 是 AWS 提供的高性能块存储服务，专为 EC2 实例设计。EBS 卷可以独立于实例的生命周期而存在，提供持久化的块级存储。

### EBS 的主要特点

1. **卷类型**：
   - **通用型 SSD (gp2/gp3)**：平衡价格和性能
   - **预置 IOPS SSD (io1/io2)**：高性能工作负载
   - **吞吐量优化型 HDD (st1)**：大数据、数据仓库
   - **Cold HDD (sc1)**：不常访问的数据
   - **磁性卷 (standard)**：旧一代卷类型

2. **性能特性**：
   - **IOPS**：每秒输入/输出操作数
   - **吞吐量**：每秒传输的数据量
   - **延迟**：完成 I/O 操作所需的时间

3. **可用性和耐久性**：
   - 在可用区内自动复制
   - 99.999% 的可用性设计
   - 年故障率 (AFR) 为 0.1-0.2%

4. **快照和备份**：
   - 增量快照存储在 S3
   - 可跨区域复制
   - 支持自动快照生命周期管理

5. **加密**：
   - 支持静态数据加密
   - 使用 AWS KMS 管理密钥
   - 支持加密快照

### EBS 的限制

1. **可用区限制**：
   - EBS 卷只能挂载到同一可用区的实例
   - 需要跨可用区复制数据时，需使用快照

2. **挂载限制**：
   - 一个 EBS 卷只能挂载到一个 EC2 实例（不支持多重挂载，io2 Block Express 除外）
   - 一个 EC2 实例可以挂载多个 EBS 卷

3. **性能限制**：
   - 不同卷类型有不同的 IOPS 和吞吐量限制
   - 实例类型也会影响 EBS 性能

## EKS 中的 EBS 集成

### EBS CSI 驱动程序

EBS CSI (Container Storage Interface) 驱动程序是 Kubernetes 与 AWS EBS 之间的桥梁，它允许 Kubernetes 集群使用 EBS 卷作为持久存储。

**主要功能**：
- 动态配置 EBS 卷
- 支持卷快照和恢复
- 支持卷大小调整
- 与 IAM 角色服务账户 (IRSA) 集成

### 架构组件

1. **CSI 控制器**：
   - 处理卷的创建和删除
   - 实现 CSI 控制器服务
   - 通常作为 Deployment 运行

2. **CSI 节点**：
   - 处理卷的挂载和卸载
   - 实现 CSI 节点服务
   - 作为 DaemonSet 运行在每个节点上

3. **StorageClass**：
   - 指定 EBS 作为存储提供者
   - 配置 EBS 特定参数，如卷类型、大小等

### IAM 权限

EBS CSI 驱动程序需要以下 IAM 权限：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateSnapshot",
        "ec2:AttachVolume",
        "ec2:DetachVolume",
        "ec2:ModifyVolume",
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeInstances",
        "ec2:DescribeSnapshots",
        "ec2:DescribeTags",
        "ec2:DescribeVolumes",
        "ec2:DescribeVolumesModifications"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateTags"
      ],
      "Resource": [
        "arn:aws:ec2:*:*:volume/*",
        "arn:aws:ec2:*:*:snapshot/*"
      ],
      "Condition": {
        "StringEquals": {
          "ec2:CreateAction": [
            "CreateVolume",
            "CreateSnapshot"
          ]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DeleteTags"
      ],
      "Resource": [
        "arn:aws:ec2:*:*:volume/*",
        "arn:aws:ec2:*:*:snapshot/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVolume"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "aws:RequestTag/ebs.csi.aws.com/cluster": "true"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVolume"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "aws:RequestTag/CSIVolumeName": "*"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DeleteVolume"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "ec2:ResourceTag/ebs.csi.aws.com/cluster": "true"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DeleteVolume"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "ec2:ResourceTag/CSIVolumeName": "*"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DeleteVolume"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "ec2:ResourceTag/kubernetes.io/created-for/pvc/name": "*"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DeleteSnapshot"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "ec2:ResourceTag/CSIVolumeSnapshotName": "*"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DeleteSnapshot"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "ec2:ResourceTag/ebs.csi.aws.com/cluster": "true"
        }
      }
    }
  ]
}
```

### EBS 与 StatefulSet 的结合

在 EKS 中，StatefulSet 通常与 EBS 卷结合使用，为有状态应用提供持久存储：

1. **VolumeClaimTemplate**：
   - 定义 PVC 规范，引用使用 EBS CSI 驱动程序的 StorageClass
   - 为每个 StatefulSet Pod 创建独立的 EBS 卷
   - 确保卷与 Pod 的生命周期解耦

2. **节点亲和性**：
   - EBS 卷只能挂载到同一可用区的节点
   - 可以使用 Pod 亲和性和反亲和性确保 Pod 分布在不同可用区

3. **拓扑感知**：
   - 使用拓扑感知的卷配置，确保 EBS 卷在正确的可用区创建
   - 避免跨可用区挂载问题

## 应用场景

### 1. 数据库部署

**场景**：在 Kubernetes 中部署关系型数据库（如 MySQL、PostgreSQL）或 NoSQL 数据库（如 MongoDB、Cassandra）。

**挑战**：
- 需要持久化存储
- 需要稳定的网络标识
- 需要有序部署和扩展
- 需要高性能 I/O

**StatefulSet 与 EBS 解决方案**：
- 使用 StatefulSet 确保 Pod 有稳定的标识
- 为每个 Pod 配置独立的 EBS 卷
- 使用 Headless Service 提供稳定的网络访问
- 选择适当的 EBS 卷类型（如 io1/io2）以满足性能需求

**示例应用**：
- MySQL 主从复制集群
- MongoDB 副本集
- Elasticsearch 集群

### 2. 分布式系统

**场景**：部署需要协调和状态共享的分布式系统。

**挑战**：
- 节点间需要稳定的通信
- 每个节点需要自己的状态存储
- 需要有序启动和配置
- 系统可能需要选举和共识机制

**StatefulSet 与 EBS 解决方案**：
- 使用 StatefulSet 提供有序部署
- 利用稳定的网络标识简化节点发现
- 为每个节点提供独立的 EBS 卷
- 使用 Pod 反亲和性确保节点分布在不同的物理主机

**示例应用**：
- ZooKeeper 集群
- Kafka 集群
- etcd 集群

### 3. 有状态的消息队列

**场景**：部署需要持久化消息的消息队列系统。

**挑战**：
- 消息需要持久化存储
- 队列服务需要稳定的网络标识
- 可能需要有序的扩展和缩减
- 需要高吞吐量和低延迟

**StatefulSet 与 EBS 解决方案**：
- 使用 StatefulSet 管理队列服务器
- 为每个服务器配置 EBS 卷存储消息
- 使用 gp3 或 io2 卷类型提供高吞吐量
- 实施适当的备份策略保护消息数据

**示例应用**：
- RabbitMQ 集群
- Apache Pulsar
- NATS Streaming

### 4. 缓存系统

**场景**：部署需要持久化数据的分布式缓存系统。

**挑战**：
- 缓存数据需要在重启后保留
- 需要稳定的节点标识进行分片
- 需要高性能存储
- 可能需要动态扩展

**StatefulSet 与 EBS 解决方案**：
- 使用 StatefulSet 管理缓存节点
- 配置 EBS 卷存储持久化数据
- 使用 Headless Service 实现稳定的节点发现
- 选择性能适合的 EBS 卷类型

**示例应用**：
- Redis 集群
- Memcached（带持久化）
- Hazelcast

### 5. CI/CD 和构建系统

**场景**：部署需要持久工作区的 CI/CD 工具和构建系统。

**挑战**：
- 构建缓存需要持久化
- 构建历史需要保留
- 可能需要大量存储空间
- 需要适当的 I/O 性能

**StatefulSet 与 EBS 解决方案**：
- 使用 StatefulSet 部署构建服务器
- 为每个服务器配置 EBS 卷存储缓存和历史
- 使用 gp3 卷类型平衡成本和性能
- 实施卷快照策略进行备份

**示例应用**：
- Jenkins 构建服务器
- GitLab Runner
- Drone CI
## 实际案例

### 案例 1: 部署 MySQL 主从复制集群

**场景**：使用 StatefulSet 和 EBS 卷部署一个 MySQL 主从复制集群。

**步骤**：

1. 安装 EBS CSI 驱动程序：

```bash
# 创建 IAM 策略
aws iam create-policy \
  --policy-name AmazonEKS_EBS_CSI_Driver_Policy \
  --policy-document file://ebs-csi-policy.json

# 创建服务账户
eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa \
  --namespace kube-system \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/AmazonEKS_EBS_CSI_Driver_Policy \
  --approve \
  --override-existing-serviceaccounts

# 安装 EBS CSI 驱动程序
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=master"
```

2. 创建 StorageClass：

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-sc
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: gp3
  encrypted: "true"
  fsType: ext4
```

3. 创建 ConfigMap 用于 MySQL 配置：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config
data:
  master.cnf: |
    [mysqld]
    log-bin=mysql-bin
    server-id=1
  slave.cnf: |
    [mysqld]
    server-id=2
```

4. 创建 Secret 用于 MySQL 密码：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secret
type: Opaque
data:
  root-password: cGFzc3dvcmQ=  # "password" 的 base64 编码
  replication-password: cmVwbGljYXRpb24=  # "replication" 的 base64 编码
```

5. 创建 Headless Service：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  labels:
    app: mysql
spec:
  ports:
  - port: 3306
    name: mysql
  clusterIP: None
  selector:
    app: mysql
```

6. 创建 StatefulSet：

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  selector:
    matchLabels:
      app: mysql
  serviceName: mysql
  replicas: 2
  template:
    metadata:
      labels:
        app: mysql
    spec:
      initContainers:
      - name: init-mysql
        image: mysql:5.7
        command:
        - bash
        - "-c"
        - |
          set -ex
          # 根据 Pod 序号生成适当的配置
          [[ $HOSTNAME =~ -([0-9]+)$ ]] || exit 1
          ordinal=${BASH_REMATCH[1]}
          if [[ $ordinal -eq 0 ]]; then
            cp /mnt/config-map/master.cnf /etc/mysql/conf.d/
          else
            cp /mnt/config-map/slave.cnf /etc/mysql/conf.d/
          fi
        volumeMounts:
        - name: conf
          mountPath: /etc/mysql/conf.d
        - name: config-map
          mountPath: /mnt/config-map
      - name: clone-data
        image: busybox
        command:
        - /bin/sh
        - -c
        - |
          set -ex
          # 只有从节点需要克隆数据
          [[ $HOSTNAME =~ -([0-9]+)$ ]] || exit 1
          ordinal=${BASH_REMATCH[1]}
          if [[ $ordinal -eq 0 ]]; then
            exit 0
          fi
          # 克隆数据前确保主节点已就绪
          until nslookup mysql-0.mysql; do
            echo "Waiting for mysql-0.mysql to be ready"
            sleep 2
          done
          # 如果数据目录为空，从主节点克隆数据
          if [ ! "$(ls -A /var/lib/mysql)" ]; then
            echo "Cloning data from master"
            # 这里简化了克隆过程，实际应使用 mysqldump 或其他工具
            touch /var/lib/mysql/cloned
          fi
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
      containers:
      - name: mysql
        image: mysql:5.7
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: root-password
        ports:
        - name: mysql
          containerPort: 3306
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
        - name: conf
          mountPath: /etc/mysql/conf.d
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
        livenessProbe:
          exec:
            command: ["mysqladmin", "ping", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
        readinessProbe:
          exec:
            command: ["mysql", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}", "-e", "SELECT 1"]
          initialDelaySeconds: 5
          periodSeconds: 2
          timeoutSeconds: 1
      volumes:
      - name: conf
        emptyDir: {}
      - name: config-map
        configMap:
          name: mysql-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: ebs-sc
      resources:
        requests:
          storage: 10Gi
```

7. 配置主从复制：

```bash
# 在主节点创建复制用户
kubectl exec -it mysql-0 -- mysql -uroot -p$(kubectl get secret mysql-secret -o jsonpath="{.data.root-password}" | base64 --decode) -e "CREATE USER 'replication'@'%' IDENTIFIED BY 'replication'; GRANT REPLICATION SLAVE ON *.* TO 'replication'@'%';"

# 获取主节点二进制日志信息
MASTER_STATUS=$(kubectl exec -it mysql-0 -- mysql -uroot -p$(kubectl get secret mysql-secret -o jsonpath="{.data.root-password}" | base64 --decode) -e "SHOW MASTER STATUS\G")
MASTER_LOG_FILE=$(echo "$MASTER_STATUS" | grep File | awk '{print $2}')
MASTER_LOG_POS=$(echo "$MASTER_STATUS" | grep Position | awk '{print $2}')

# 配置从节点复制
kubectl exec -it mysql-1 -- mysql -uroot -p$(kubectl get secret mysql-secret -o jsonpath="{.data.root-password}" | base64 --decode) -e "CHANGE MASTER TO MASTER_HOST='mysql-0.mysql', MASTER_USER='replication', MASTER_PASSWORD='replication', MASTER_LOG_FILE='$MASTER_LOG_FILE', MASTER_LOG_POS=$MASTER_LOG_POS; START SLAVE;"

# 验证复制状态
kubectl exec -it mysql-1 -- mysql -uroot -p$(kubectl get secret mysql-secret -o jsonpath="{.data.root-password}" | base64 --decode) -e "SHOW SLAVE STATUS\G"
```

8. 测试主从复制：

```bash
# 在主节点创建数据库和表
kubectl exec -it mysql-0 -- mysql -uroot -p$(kubectl get secret mysql-secret -o jsonpath="{.data.root-password}" | base64 --decode) -e "CREATE DATABASE test; USE test; CREATE TABLE messages (message VARCHAR(100)); INSERT INTO messages VALUES ('Hello from StatefulSet');"

# 在从节点验证数据
kubectl exec -it mysql-1 -- mysql -uroot -p$(kubectl get secret mysql-secret -o jsonpath="{.data.root-password}" | base64 --decode) -e "USE test; SELECT * FROM messages;"
```

### 案例 2: 部署 Elasticsearch 集群

**场景**：使用 StatefulSet 和 EBS 卷部署一个三节点 Elasticsearch 集群。

**步骤**：

1. 创建 StorageClass（如果尚未创建）：

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-sc
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
```

2. 创建 ConfigMap 用于 Elasticsearch 配置：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: elasticsearch-config
data:
  elasticsearch.yml: |
    cluster.name: es-cluster
    network.host: 0.0.0.0
    discovery.seed_hosts: ["elasticsearch-0.elasticsearch", "elasticsearch-1.elasticsearch", "elasticsearch-2.elasticsearch"]
    cluster.initial_master_nodes: ["elasticsearch-0", "elasticsearch-1", "elasticsearch-2"]
    bootstrap.memory_lock: false
    xpack.security.enabled: false
    xpack.monitoring.collection.enabled: true
```

3. 创建 Headless Service：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  labels:
    app: elasticsearch
spec:
  ports:
  - port: 9200
    name: rest
  - port: 9300
    name: inter-node
  clusterIP: None
  selector:
    app: elasticsearch
```

4. 创建 StatefulSet：

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      initContainers:
      - name: fix-permissions
        image: busybox
        command: ["sh", "-c", "chown -R 1000:1000 /usr/share/elasticsearch/data"]
        securityContext:
          privileged: true
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
      - name: increase-vm-max-map
        image: busybox
        command: ["sysctl", "-w", "vm.max_map_count=262144"]
        securityContext:
          privileged: true
      - name: increase-fd-ulimit
        image: busybox
        command: ["sh", "-c", "ulimit -n 65536"]
        securityContext:
          privileged: true
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:7.13.0
        resources:
          limits:
            cpu: 1000m
            memory: 2Gi
          requests:
            cpu: 500m
            memory: 1Gi
        ports:
        - containerPort: 9200
          name: rest
        - containerPort: 9300
          name: inter-node
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
        - name: config
          mountPath: /usr/share/elasticsearch/config/elasticsearch.yml
          subPath: elasticsearch.yml
        env:
        - name: ES_JAVA_OPTS
          value: "-Xms1g -Xmx1g"
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        readinessProbe:
          httpGet:
            path: /_cluster/health
            port: 9200
          initialDelaySeconds: 20
          timeoutSeconds: 5
        livenessProbe:
          httpGet:
            path: /_cluster/health?local=true
            port: 9200
          initialDelaySeconds: 60
          timeoutSeconds: 5
      volumes:
      - name: config
        configMap:
          name: elasticsearch-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: ebs-sc
      resources:
        requests:
          storage: 30Gi
```

5. 创建 Elasticsearch 客户端服务：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch-client
  labels:
    app: elasticsearch
spec:
  selector:
    app: elasticsearch
  ports:
  - port: 9200
    name: rest
  type: LoadBalancer
```

6. 验证集群状态：

```bash
# 等待所有 Pod 就绪
kubectl get pods -l app=elasticsearch -w

# 获取客户端服务的 URL
ES_URL=$(kubectl get svc elasticsearch-client -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# 检查集群健康状态
curl -X GET "http://$ES_URL:9200/_cluster/health?pretty"

# 检查节点信息
curl -X GET "http://$ES_URL:9200/_cat/nodes?v"
```

7. 测试数据持久性：

```bash
# 创建索引和文档
curl -X PUT "http://$ES_URL:9200/test-index"
curl -X POST "http://$ES_URL:9200/test-index/_doc/1" -H 'Content-Type: application/json' -d '{"message": "Hello from StatefulSet with EBS"}'

# 删除并重新创建一个 Pod
kubectl delete pod elasticsearch-0
kubectl get pods -l app=elasticsearch -w

# 验证数据是否保留
curl -X GET "http://$ES_URL:9200/test-index/_doc/1?pretty"
```

### 案例 3: 部署 Kafka 集群

**场景**：使用 StatefulSet 和 EBS 卷部署一个 Kafka 集群，包括 ZooKeeper 集群。

**步骤**：

1. 部署 ZooKeeper 集群：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: zookeeper-headless
spec:
  clusterIP: None
  selector:
    app: zookeeper
  ports:
  - port: 2181
    name: client
  - port: 2888
    name: server
  - port: 3888
    name: leader-election
---
apiVersion: v1
kind: Service
metadata:
  name: zookeeper
spec:
  selector:
    app: zookeeper
  ports:
  - port: 2181
    name: client
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zookeeper
spec:
  serviceName: zookeeper-headless
  replicas: 3
  selector:
    matchLabels:
      app: zookeeper
  template:
    metadata:
      labels:
        app: zookeeper
    spec:
      containers:
      - name: zookeeper
        image: confluentinc/cp-zookeeper:6.2.0
        ports:
        - containerPort: 2181
          name: client
        - containerPort: 2888
          name: server
        - containerPort: 3888
          name: leader-election
        env:
        - name: ZOOKEEPER_CLIENT_PORT
          value: "2181"
        - name: ZOOKEEPER_TICK_TIME
          value: "2000"
        - name: ZOOKEEPER_INIT_LIMIT
          value: "5"
        - name: ZOOKEEPER_SYNC_LIMIT
          value: "2"
        - name: ZOOKEEPER_SERVER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: ZOOKEEPER_SERVERS
          value: "zookeeper-0.zookeeper-headless:2888:3888;zookeeper-1.zookeeper-headless:2888:3888;zookeeper-2.zookeeper-headless:2888:3888"
        volumeMounts:
        - name: data
          mountPath: /var/lib/zookeeper/data
        - name: log
          mountPath: /var/lib/zookeeper/log
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: ebs-sc
      resources:
        requests:
          storage: 10Gi
  - metadata:
      name: log
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: ebs-sc
      resources:
        requests:
          storage: 10Gi
```

2. 部署 Kafka 集群：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka-headless
spec:
  clusterIP: None
  selector:
    app: kafka
  ports:
  - port: 9092
    name: kafka
---
apiVersion: v1
kind: Service
metadata:
  name: kafka
spec:
  selector:
    app: kafka
  ports:
  - port: 9092
    name: kafka
  type: ClusterIP
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
spec:
  serviceName: kafka-headless
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: confluentinc/cp-kafka:6.2.0
        ports:
        - containerPort: 9092
          name: kafka
        env:
        - name: KAFKA_BROKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: KAFKA_ZOOKEEPER_CONNECT
          value: "zookeeper:2181"
        - name: KAFKA_ADVERTISED_LISTENERS
          value: "PLAINTEXT://$(POD_NAME).kafka-headless:9092"
        - name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
          value: "PLAINTEXT:PLAINTEXT"
        - name: KAFKA_INTER_BROKER_LISTENER_NAME
          value: "PLAINTEXT"
        - name: KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR
          value: "3"
        - name: KAFKA_DEFAULT_REPLICATION_FACTOR
          value: "3"
        - name: KAFKA_MIN_INSYNC_REPLICAS
          value: "2"
        - name: KAFKA_LOG_DIRS
          value: "/var/lib/kafka/data"
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: data
          mountPath: /var/lib/kafka/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: ebs-sc
      resources:
        requests:
          storage: 50Gi
```

3. 创建测试 Pod：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kafka-test-client
spec:
  containers:
  - name: kafka-test-client
    image: confluentinc/cp-kafka:6.2.0
    command:
    - sh
    - -c
    - "exec tail -f /dev/null"
```

4. 测试 Kafka 集群：

```bash
# 进入测试 Pod
kubectl exec -it kafka-test-client -- bash

# 创建测试主题
kafka-topics --create --topic test-topic --bootstrap-server kafka:9092 --replication-factor 3 --partitions 3

# 查看主题信息
kafka-topics --describe --topic test-topic --bootstrap-server kafka:9092

# 生产消息
kafka-console-producer --topic test-topic --bootstrap-server kafka:9092 <<EOF
Hello from StatefulSet with EBS
This is a test message
EOF

# 消费消息
kafka-console-consumer --topic test-topic --from-beginning --bootstrap-server kafka:9092 --max-messages 2
```

5. 测试持久性：

```bash
# 删除并重新创建一个 Kafka Pod
kubectl delete pod kafka-0
kubectl get pods -l app=kafka -w

# 验证数据是否保留
kubectl exec -it kafka-test-client -- kafka-console-consumer --topic test-topic --from-beginning --bootstrap-server kafka:9092 --max-messages 2
```
## 考试重点

### Kubernetes 认证考试

#### CKA (Certified Kubernetes Administrator)

1. **StatefulSet 管理**
   - 创建和配置 StatefulSet
   - 理解 StatefulSet 的工作原理和特性
   - 排查 StatefulSet 问题
   - 管理 StatefulSet 的更新和扩展

2. **持久卷管理**
   - 配置 StorageClass 和动态卷配置
   - 理解 PersistentVolume 和 PersistentVolumeClaim
   - 管理卷的生命周期
   - 排查存储相关问题

3. **CSI 驱动程序**
   - 部署和配置 EBS CSI 驱动程序
   - 理解 CSI 架构和组件
   - 排查 CSI 相关问题
   - 管理 CSI 卷快照

#### CKAD (Certified Kubernetes Application Developer)

1. **StatefulSet 应用设计**
   - 为有状态应用程序设计 StatefulSet
   - 配置 VolumeClaimTemplates
   - 使用 Headless Service
   - 实施有序部署和扩展

2. **持久存储配置**
   - 创建和使用 PersistentVolumeClaim
   - 配置卷挂载和子路径
   - 理解存储类和访问模式
   - 处理存储相关的应用程序需求

#### CKS (Certified Kubernetes Security Specialist)

1. **StatefulSet 安全**
   - 配置 Pod 安全上下文
   - 实施网络策略保护 StatefulSet
   - 保护有状态应用程序的敏感数据
   - 审计 StatefulSet 访问

2. **存储安全**
   - 配置 EBS 卷加密
   - 管理存储访问权限
   - 保护存储中的敏感数据
   - 实施存储安全最佳实践

### AWS 认证考试

#### AWS Certified EKS Specialist

1. **EBS 与 EKS 集成**
   - 配置 EBS CSI 驱动程序
   - 管理 EBS 卷生命周期
   - 排查 EBS 挂载问题
   - 优化 EBS 性能

2. **多可用区部署**
   - 设计跨可用区的 StatefulSet
   - 理解 EBS 卷的可用区限制
   - 配置拓扑感知的卷配置
   - 实施高可用性策略

3. **IAM 与存储集成**
   - 配置 IRSA 用于 EBS CSI 驱动程序
   - 管理 EBS 卷权限
   - 实施最小权限 IAM 策略
   - 排查权限问题

#### AWS Certified Solutions Architect

1. **存储架构设计**
   - 选择适当的 EBS 卷类型
   - 设计高可用性存储解决方案
   - 优化成本和性能
   - 实施备份和恢复策略

2. **EBS 性能优化**
   - 选择适当的 EBS 卷类型和大小
   - 配置 IOPS 和吞吐量
   - 理解 EBS 性能限制
   - 监控和调优 EBS 性能

### 重要考点

1. **StatefulSet 基础**
   - StatefulSet 的核心特性（稳定网络标识、有序部署、持久存储）
   - StatefulSet 与 Deployment 的区别
   - StatefulSet 的更新策略（RollingUpdate、OnDelete）
   - StatefulSet 的扩展和缩减行为

2. **EBS 卷类型和性能**
   - 不同 EBS 卷类型的特点和用例
   - IOPS 和吞吐量配置
   - EBS 卷大小和性能的关系
   - EBS 卷限制和配额

3. **EBS CSI 驱动程序**
   - 安装和配置 EBS CSI 驱动程序
   - 创建和管理 StorageClass
   - 动态卷配置
   - 卷快照和恢复

4. **高可用性设计**
   - 跨可用区部署 StatefulSet
   - 处理 EBS 卷的可用区限制
   - 配置 Pod 反亲和性
   - 实施备份和恢复策略

5. **性能优化**
   - 选择适当的 EBS 卷类型
   - 配置适当的资源请求和限制
   - 监控和调优存储性能
   - 处理存储瓶颈

### 实战练习题

1. 使用 StatefulSet 和 EBS 卷部署一个 3 节点的 PostgreSQL 集群，包括一个主节点和两个只读副本
2. 配置 EBS CSI 驱动程序，并创建一个使用 gp3 卷类型的 StorageClass，然后部署一个使用该 StorageClass 的 StatefulSet
3. 实现一个 StatefulSet 的备份和恢复解决方案，使用 EBS 快照保护数据
4. 设计一个跨可用区的 StatefulSet 部署，确保高可用性，并处理 EBS 卷的可用区限制
5. 排查并解决一个 StatefulSet 中的 Pod 无法挂载 EBS 卷的问题


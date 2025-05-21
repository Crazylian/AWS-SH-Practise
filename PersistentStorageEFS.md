# Kubernetes 持久存储与 AWS EFS 全面指南

## 目录
1. [持久存储基本概念](#持久存储基本概念)
2. [AWS EFS 概述](#aws-efs-概述)
3. [EKS 中的 EFS 集成](#eks-中的-efs-集成)
4. [应用场景](#应用场景)
5. [实际案例](#实际案例)
6. [考试重点](#考试重点)

## 持久存储基本概念

### 什么是持久存储？

持久存储（Persistent Storage）是一种数据存储机制，它确保数据在 Pod 生命周期之外持续存在。在 Kubernetes 中，容器本身是无状态的，当容器重启或 Pod 重新调度时，容器内的数据会丢失。持久存储解决了这个问题，使应用程序能够保存和访问持久化的数据。

### Kubernetes 存储架构

Kubernetes 提供了一个抽象的存储系统，主要包括以下组件：

1. **PersistentVolume (PV)**：
   - 集群中的存储资源，由管理员预先配置或动态配置
   - 与底层存储提供商（如 AWS EFS）的实际实现相关联
   - 具有独立于使用它的 Pod 的生命周期

2. **PersistentVolumeClaim (PVC)**：
   - 用户对存储的请求
   - 指定所需的存储大小、访问模式等
   - 绑定到满足其要求的 PV

3. **StorageClass**：
   - 定义存储的"类"，如性能特征、备份策略等
   - 支持动态配置 PV
   - 指定存储的供应者（provisioner）

4. **卷（Volume）**：
   - Pod 中容器可以访问的目录
   - 可以由多种后端支持，包括临时存储和持久存储

### 访问模式

Kubernetes 支持以下访问模式：

1. **ReadWriteOnce (RWO)**：
   - 卷可以被单个节点以读写方式挂载
   - 适用于大多数有状态应用

2. **ReadOnlyMany (ROX)**：
   - 卷可以被多个节点以只读方式挂载
   - 适用于静态内容分发

3. **ReadWriteMany (RWX)**：
   - 卷可以被多个节点以读写方式挂载
   - 适用于共享数据的应用，如 CMS、协作工具

4. **ReadWriteOncePod (RWOP)**：
   - 卷只能被单个 Pod 以读写方式挂载
   - 提供比 RWO 更严格的访问控制

### 回收策略

当 PVC 被删除时，PV 可以采取以下回收策略：

1. **Retain**：
   - 保留 PV 及其数据
   - 需要管理员手动回收

2. **Delete**：
   - 删除 PV 及其关联的存储资产
   - 数据将被永久删除

3. **Recycle**（已弃用）：
   - 基本擦除（rm -rf /volume/*）并使 PV 可再次使用

## AWS EFS 概述

### 什么是 AWS EFS？

Amazon Elastic File System (EFS) 是一种完全托管的弹性 NFS 文件系统，专为 AWS 云服务和本地资源设计。它提供了简单、可扩展的文件存储，可以与 Amazon EC2 实例、容器和无服务器应用程序一起使用。

### EFS 的主要特点

1. **弹性扩展**：
   - 自动扩展和缩减，无需预配置
   - 可扩展到 PB 级存储
   - 按使用量付费

2. **高可用性和耐久性**：
   - 数据跨多个可用区存储
   - 99.999999999%（11 个 9）的耐久性
   - 内置冗余

3. **性能模式**：
   - 通用性能模式：适用于大多数工作负载
   - 最大 I/O 性能模式：适用于高并发工作负载

4. **吞吐量模式**：
   - 突发吞吐量：基于文件系统大小的基准吞吐量，可突发
   - 预配置吞吐量：固定吞吐量，不受文件系统大小限制
   - 弹性吞吐量：自动扩展吞吐量以满足工作负载需求

5. **存储类**：
   - 标准存储类：适用于频繁访问的数据
   - 不频繁访问 (IA) 存储类：成本更低，适用于不常访问的数据
   - 一区域存储类：数据仅存储在一个可用区，成本更低

6. **安全性**：
   - 加密（传输中和静态）
   - IAM 和基于资源的策略
   - 网络访问控制

### EFS 访问点

EFS 访问点是 EFS 文件系统的应用程序特定入口点，可以：

- 强制使用特定的 POSIX 用户和组
- 强制使用特定的根目录
- 简化文件系统权限管理
- 限制对文件系统特定部分的访问

## EKS 中的 EFS 集成

### EFS CSI 驱动程序

EFS CSI (Container Storage Interface) 驱动程序是 Kubernetes 与 AWS EFS 之间的桥梁，它允许 Kubernetes 集群使用 EFS 作为持久存储。

**主要功能**：
- 动态配置 EFS 访问点
- 支持静态配置的 EFS 文件系统
- 支持 ReadWriteMany 访问模式
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
   - 指定 EFS 作为存储提供者
   - 配置 EFS 特定参数

4. **PersistentVolume 和 PersistentVolumeClaim**：
   - 表示 EFS 文件系统或访问点
   - 定义存储需求和访问模式

### IAM 权限

EFS CSI 驱动程序需要以下 IAM 权限：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:DescribeAccessPoints",
        "elasticfilesystem:DescribeFileSystems",
        "elasticfilesystem:DescribeMountTargets",
        "elasticfilesystem:CreateAccessPoint",
        "elasticfilesystem:DeleteAccessPoint",
        "ec2:DescribeAvailabilityZones"
      ],
      "Resource": "*"
    }
  ]
}
```

## 应用场景

### 1. 共享文件存储

**场景**：多个 Pod 需要访问相同的文件集，如内容管理系统、媒体处理应用。

**挑战**：
- 需要 ReadWriteMany 访问模式
- 文件锁定和并发访问
- 一致性要求

**EFS 解决方案**：
- 原生支持 ReadWriteMany 访问模式
- NFS 协议提供文件锁定机制
- 强一致性模型
- 自动扩展以适应增长的数据集

**示例应用**：
- WordPress 多实例部署
- 媒体处理流水线
- 共享配置文件

### 2. 有状态应用程序

**场景**：需要持久存储的应用程序，如数据库、消息队列。

**挑战**：
- 数据持久性要求
- 性能需求
- 备份和恢复

**EFS 解决方案**：
- 高耐久性（11 个 9）
- 可选的高性能配置
- 与 AWS Backup 集成
- 支持 StatefulSet 部署

**示例应用**：
- 轻量级数据库（注意：对于高性能数据库，EBS 可能更合适）
- 消息队列
- 缓存服务

### 3. CI/CD 和构建环境

**场景**：持续集成/持续部署流水线需要共享构建缓存和制品。

**挑战**：
- 多个构建节点需要访问相同的数据
- 缓存共享以提高构建速度
- 构建制品存储

**EFS 解决方案**：
- 多节点并发访问
- 高吞吐量支持快速构建
- 弹性扩展适应增长的缓存和制品

**示例应用**：
- Jenkins 构建集群
- Maven/Gradle 缓存
- Docker 层缓存

### 4. 日志和监控数据

**场景**：集中式日志存储和监控数据收集。

**挑战**：
- 高写入吞吐量
- 长期数据保留
- 成本优化

**EFS 解决方案**：
- 高吞吐量写入能力
- 不频繁访问 (IA) 存储类降低成本
- 生命周期管理自动转移数据

**示例应用**：
- ELK/EFK 日志堆栈
- Prometheus 长期存储
- 审计日志存档

### 5. 多区域和混合云部署

**场景**：跨多个区域或混合云环境的应用程序需要共享数据。

**挑战**：
- 数据一致性
- 跨区域访问
- 混合云连接

**EFS 解决方案**：
- AWS Transit Gateway 和 VPC 对等互连支持
- AWS Direct Connect 集成
- AWS DataSync 用于数据迁移和同步

**示例应用**：
- 全球内容分发
- 灾难恢复设置
- 混合云应用程序
## 实际案例

### 案例 1: 在 EKS 上部署和配置 EFS CSI 驱动程序

**场景**：在 Amazon EKS 集群上配置 EFS CSI 驱动程序，以便使用 EFS 作为持久存储。

**步骤**：

1. 创建 EFS 文件系统：

```bash
# 获取 VPC ID
VPC_ID=$(aws eks describe-cluster \
    --name my-cluster \
    --query "cluster.resourcesVpcConfig.vpcId" \
    --output text)

# 获取 CIDR 块
CIDR_BLOCK=$(aws ec2 describe-vpcs \
    --vpc-ids $VPC_ID \
    --query "Vpcs[].CidrBlock" \
    --output text)

# 创建安全组
SECURITY_GROUP_ID=$(aws ec2 create-security-group \
    --group-name MyEfsSecurityGroup \
    --description "Security group for EFS in EKS" \
    --vpc-id $VPC_ID \
    --output text)

# 添加入站规则
aws ec2 authorize-security-group-ingress \
    --group-id $SECURITY_GROUP_ID \
    --protocol tcp \
    --port 2049 \
    --cidr $CIDR_BLOCK

# 创建 EFS 文件系统
FILE_SYSTEM_ID=$(aws efs create-file-system \
    --performance-mode generalPurpose \
    --throughput-mode bursting \
    --encrypted \
    --tags Key=Name,Value=MyEKSEFS \
    --query "FileSystemId" \
    --output text)

# 获取子网 ID
SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query "Subnets[*].SubnetId" \
    --output text)

# 为每个子网创建挂载目标
for SUBNET_ID in $SUBNET_IDS; do
    aws efs create-mount-target \
        --file-system-id $FILE_SYSTEM_ID \
        --subnet-id $SUBNET_ID \
        --security-groups $SECURITY_GROUP_ID
done

echo "EFS File System ID: $FILE_SYSTEM_ID"
```

2. 创建 IAM 策略和角色：

```bash
# 创建 IAM 策略
cat > efs-csi-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:DescribeAccessPoints",
        "elasticfilesystem:DescribeFileSystems",
        "elasticfilesystem:DescribeMountTargets",
        "elasticfilesystem:CreateAccessPoint",
        "elasticfilesystem:DeleteAccessPoint",
        "ec2:DescribeAvailabilityZones"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
    --policy-name AmazonEKS_EFS_CSI_Driver_Policy \
    --policy-document file://efs-csi-policy.json

# 创建服务账户
eksctl create iamserviceaccount \
    --cluster my-cluster \
    --namespace kube-system \
    --name efs-csi-controller-sa \
    --attach-policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/AmazonEKS_EFS_CSI_Driver_Policy \
    --approve \
    --override-existing-serviceaccounts
```

3. 使用 Helm 安装 EFS CSI 驱动程序：

```bash
# 添加 Helm 仓库
helm repo add aws-efs-csi-driver https://kubernetes-sigs.github.io/aws-efs-csi-driver/
helm repo update

# 安装 EFS CSI 驱动程序
helm upgrade -i aws-efs-csi-driver aws-efs-csi-driver/aws-efs-csi-driver \
    --namespace kube-system \
    --set controller.serviceAccount.create=false \
    --set controller.serviceAccount.name=efs-csi-controller-sa
```

4. 验证安装：

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-efs-csi-driver
```

5. 创建 StorageClass：

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-sc
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-0123456789abcdef0  # 替换为您的 EFS 文件系统 ID
  directoryPerms: "700"
  gidRangeStart: "1000"
  gidRangeEnd: "2000"
  basePath: "/dynamic_provisioning"
```

6. 创建 PVC：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: efs-claim
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 5Gi
```

7. 创建使用 PVC 的 Pod：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: efs-app
spec:
  containers:
  - name: app
    image: centos
    command: ["/bin/sh"]
    args: ["-c", "while true; do echo $(date) >> /data/out.txt; sleep 5; done"]
    volumeMounts:
    - name: persistent-storage
      mountPath: /data
  volumes:
  - name: persistent-storage
    persistentVolumeClaim:
      claimName: efs-claim
```

8. 验证 EFS 挂载：

```bash
kubectl exec -it efs-app -- df -h /data
kubectl exec -it efs-app -- cat /data/out.txt
```

### 案例 2: 使用 EFS 实现共享配置存储

**场景**：多个应用程序需要访问共享配置文件，这些文件需要在应用程序重启或重新调度时保持一致。

**步骤**：

1. 创建静态 PV 和 PVC：

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-config-pv
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0123456789abcdef0:/configs  # 替换为您的 EFS 文件系统 ID
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: efs-config-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 5Gi
```

2. 创建配置管理 Pod：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: config-manager
spec:
  containers:
  - name: config-manager
    image: nginx
    command: ["/bin/sh", "-c"]
    args:
    - |
      echo "database_url=mysql://user:password@mysql-service:3306/db" > /configs/app.properties
      echo "redis_url=redis://redis-service:6379" >> /configs/app.properties
      echo "api_key=secret-api-key" >> /configs/app.properties
      nginx -g "daemon off;"
    volumeMounts:
    - name: config-volume
      mountPath: /configs
  volumes:
  - name: config-volume
    persistentVolumeClaim:
      claimName: efs-config-pvc
```

3. 创建使用配置的应用程序部署：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: app
        image: my-app:1.0
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
          readOnly: true
      volumes:
      - name: config-volume
        persistentVolumeClaim:
          claimName: efs-config-pvc
```

4. 验证配置共享：

```bash
# 查看配置文件
kubectl exec -it $(kubectl get pod -l app=my-app -o jsonpath="{.items[0].metadata.name}") -- cat /app/config/app.properties

# 更新配置文件
kubectl exec -it config-manager -- /bin/sh -c 'echo "new_setting=value" >> /configs/app.properties'

# 验证所有 Pod 都能看到更新
for pod in $(kubectl get pod -l app=my-app -o jsonpath="{.items[*].metadata.name}"); do
  echo "Checking $pod:"
  kubectl exec -it $pod -- cat /app/config/app.properties | grep new_setting
done
```

### 案例 3: 使用 EFS 实现 WordPress 多实例部署

**场景**：部署一个高可用的 WordPress 站点，多个 WordPress 实例共享相同的文件系统。

**步骤**：

1. 创建 EFS StorageClass 和 PVC：

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs-wordpress-sc
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-0123456789abcdef0  # 替换为您的 EFS 文件系统 ID
  directoryPerms: "755"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: wordpress-efs-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-wordpress-sc
  resources:
    requests:
      storage: 10Gi
```

2. 部署 MySQL 数据库：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secret
type: Opaque
data:
  password: cGFzc3dvcmQ=  # "password" 的 base64 编码
---
apiVersion: v1
kind: Service
metadata:
  name: wordpress-mysql
spec:
  ports:
  - port: 3306
  selector:
    app: wordpress-mysql
  clusterIP: None
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wordpress-mysql
spec:
  selector:
    matchLabels:
      app: wordpress-mysql
  template:
    metadata:
      labels:
        app: wordpress-mysql
    spec:
      containers:
      - image: mysql:5.7
        name: mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: password
        ports:
        - containerPort: 3306
          name: mysql
        volumeMounts:
        - name: mysql-persistent-storage
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-persistent-storage
        persistentVolumeClaim:
          claimName: mysql-pvc  # 需要单独创建 MySQL 的 PVC
```

3. 部署 WordPress：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wordpress
spec:
  replicas: 3
  selector:
    matchLabels:
      app: wordpress
  template:
    metadata:
      labels:
        app: wordpress
    spec:
      containers:
      - image: wordpress:latest
        name: wordpress
        env:
        - name: WORDPRESS_DB_HOST
          value: wordpress-mysql
        - name: WORDPRESS_DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: password
        ports:
        - containerPort: 80
          name: wordpress
        volumeMounts:
        - name: wordpress-persistent-storage
          mountPath: /var/www/html
      volumes:
      - name: wordpress-persistent-storage
        persistentVolumeClaim:
          claimName: wordpress-efs-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: wordpress
spec:
  selector:
    app: wordpress
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

4. 验证部署：

```bash
# 获取 WordPress 服务的外部 IP
kubectl get svc wordpress

# 检查 WordPress Pod 是否共享相同的文件系统
kubectl exec -it $(kubectl get pod -l app=wordpress -o jsonpath="{.items[0].metadata.name}") -- touch /var/www/html/test-file.txt

for pod in $(kubectl get pod -l app=wordpress -o jsonpath="{.items[*].metadata.name}"); do
  echo "Checking $pod:"
  kubectl exec -it $pod -- ls -la /var/www/html/test-file.txt
done
```

### 案例 4: 使用 EFS 访问点实现多租户隔离

**场景**：在同一个 EFS 文件系统上为不同团队或应用程序提供隔离的存储空间。

**步骤**：

1. 创建 EFS 访问点：

```bash
# 为团队 A 创建访问点
TEAM_A_AP_ID=$(aws efs create-access-point \
    --file-system-id fs-0123456789abcdef0 \
    --posix-user Uid=1000,Gid=1000 \
    --root-directory "Path=/team-a,CreationInfo={OwnerUid=1000,OwnerGid=1000,Permissions=755}" \
    --query "AccessPointId" \
    --output text)

# 为团队 B 创建访问点
TEAM_B_AP_ID=$(aws efs create-access-point \
    --file-system-id fs-0123456789abcdef0 \
    --posix-user Uid=2000,Gid=2000 \
    --root-directory "Path=/team-b,CreationInfo={OwnerUid=2000,OwnerGid=2000,Permissions=755}" \
    --query "AccessPointId" \
    --output text)

echo "Team A Access Point ID: $TEAM_A_AP_ID"
echo "Team B Access Point ID: $TEAM_B_AP_ID"
```

2. 为团队 A 创建 PV 和 PVC：

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: team-a-pv
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-team-a
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0123456789abcdef0::fsap-0abc123def456789a  # 替换为您的 EFS 文件系统 ID 和团队 A 的访问点 ID
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: team-a-pvc
  namespace: team-a
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-team-a
  resources:
    requests:
      storage: 5Gi
```

3. 为团队 B 创建 PV 和 PVC：

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: team-b-pv
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-team-b
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0123456789abcdef0::fsap-0def456789abc123b  # 替换为您的 EFS 文件系统 ID 和团队 B 的访问点 ID
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: team-b-pvc
  namespace: team-b
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-team-b
  resources:
    requests:
      storage: 5Gi
```

4. 部署团队 A 的应用：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: team-a-app
  namespace: team-a
spec:
  replicas: 2
  selector:
    matchLabels:
      app: team-a-app
  template:
    metadata:
      labels:
        app: team-a-app
    spec:
      containers:
      - name: app
        image: nginx
        volumeMounts:
        - name: efs-volume
          mountPath: /data
      volumes:
      - name: efs-volume
        persistentVolumeClaim:
          claimName: team-a-pvc
```

5. 部署团队 B 的应用：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: team-b-app
  namespace: team-b
spec:
  replicas: 2
  selector:
    matchLabels:
      app: team-b-app
  template:
    metadata:
      labels:
        app: team-b-app
    spec:
      containers:
      - name: app
        image: nginx
        volumeMounts:
        - name: efs-volume
          mountPath: /data
      volumes:
      - name: efs-volume
        persistentVolumeClaim:
          claimName: team-b-pvc
```

6. 验证隔离：

```bash
# 在团队 A 的 Pod 中创建文件
kubectl exec -it -n team-a $(kubectl get pod -n team-a -l app=team-a-app -o jsonpath="{.items[0].metadata.name}") -- sh -c "echo 'Team A data' > /data/test.txt"

# 在团队 B 的 Pod 中创建文件
kubectl exec -it -n team-b $(kubectl get pod -n team-b -l app=team-b-app -o jsonpath="{.items[0].metadata.name}") -- sh -c "echo 'Team B data' > /data/test.txt"

# 验证团队 A 只能看到自己的文件
kubectl exec -it -n team-a $(kubectl get pod -n team-a -l app=team-a-app -o jsonpath="{.items[0].metadata.name}") -- ls -la /data

# 验证团队 B 只能看到自己的文件
kubectl exec -it -n team-b $(kubectl get pod -n team-b -l app=team-b-app -o jsonpath="{.items[0].metadata.name}") -- ls -la /data
```

### 案例 5: 使用 EFS 实现 Jenkins 持久构建工作区

**场景**：部署 Jenkins 服务器，使用 EFS 存储构建工作区，确保构建数据在 Pod 重启后保持不变。

**步骤**：

1. 创建 PVC：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: jenkins-home-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 20Gi
```

2. 部署 Jenkins：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jenkins
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jenkins
  template:
    metadata:
      labels:
        app: jenkins
    spec:
      serviceAccountName: jenkins  # 需要创建适当的服务账户
      containers:
      - name: jenkins
        image: jenkins/jenkins:lts
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 50000
          name: jnlp
        volumeMounts:
        - name: jenkins-home
          mountPath: /var/jenkins_home
        readinessProbe:
          httpGet:
            path: /login
            port: 8080
          initialDelaySeconds: 60
          timeoutSeconds: 5
      volumes:
      - name: jenkins-home
        persistentVolumeClaim:
          claimName: jenkins-home-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: jenkins
spec:
  selector:
    app: jenkins
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: jnlp
    port: 50000
    targetPort: 50000
  type: LoadBalancer
```

3. 创建 Jenkins 构建节点部署：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jenkins-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jenkins-agent
  template:
    metadata:
      labels:
        app: jenkins-agent
    spec:
      containers:
      - name: jenkins-agent
        image: jenkins/inbound-agent:latest
        env:
        - name: JENKINS_URL
          value: http://jenkins:8080
        - name: JENKINS_SECRET
          value: your-jenkins-secret  # 应该使用 Secret 资源
        - name: JENKINS_AGENT_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: jenkins-workspace
          mountPath: /home/jenkins/workspace
      volumes:
      - name: jenkins-workspace
        persistentVolumeClaim:
          claimName: jenkins-home-pvc
```

4. 验证 Jenkins 持久性：

```bash
# 获取 Jenkins 服务的 URL
JENKINS_URL=$(kubectl get svc jenkins -o jsonpath="{.status.loadBalancer.ingress[0].hostname}")

# 访问 Jenkins 并设置作业

# 删除并重新创建 Jenkins Pod
kubectl delete pod -l app=jenkins
kubectl get pod -l app=jenkins -w

# 验证作业和构建历史是否保留
```
## 考试重点

### Kubernetes 认证考试

#### CKA (Certified Kubernetes Administrator)

1. **持久卷管理**
   - 创建和配置 PersistentVolume
   - 理解不同的访问模式和回收策略
   - 排查持久卷问题
   - 管理 StorageClass

2. **CSI 驱动程序**
   - 部署和配置 CSI 驱动程序
   - 理解 CSI 架构和组件
   - 排查 CSI 相关问题
   - 管理 CSI 卷快照

3. **存储资源管理**
   - 配置存储资源配额
   - 监控存储使用情况
   - 实施存储最佳实践
   - 管理动态卷配置

#### CKAD (Certified Kubernetes Application Developer)

1. **应用程序存储配置**
   - 创建和使用 PersistentVolumeClaim
   - 配置卷挂载和子路径
   - 使用 ConfigMap 和 Secret 作为卷
   - 实施临时存储和持久存储策略

2. **多容器 Pod 中的存储共享**
   - 在 Pod 中的多个容器间共享卷
   - 配置 emptyDir 卷
   - 使用 initContainer 准备数据
   - 管理卷权限

#### CKS (Certified Kubernetes Security Specialist)

1. **存储安全**
   - 加密静态数据
   - 配置安全的存储访问策略
   - 实施 Pod 安全上下文以限制卷访问
   - 审计存储访问

2. **敏感数据管理**
   - 安全地存储和访问密钥
   - 使用 Secret 卷
   - 实施最小权限原则
   - 保护持久存储中的敏感数据

### AWS 认证考试

#### AWS Certified EKS Specialist

1. **EFS 与 EKS 集成**
   - 配置 EFS CSI 驱动程序
   - 管理 EFS 访问点
   - 排查 EFS 挂载问题
   - 优化 EFS 性能

2. **EKS 存储选项**
   - 比较 EBS、EFS 和 FSx 的使用场景
   - 配置适当的 StorageClass
   - 实施存储生命周期管理
   - 管理跨可用区存储

3. **IAM 与存储集成**
   - 配置 IRSA 用于存储访问
   - 管理 EFS 文件系统策略
   - 实施最小权限 IAM 策略
   - 排查权限问题

#### AWS Certified Solutions Architect

1. **存储架构设计**
   - 设计高可用性存储解决方案
   - 选择适当的存储类型
   - 优化成本和性能
   - 实施备份和恢复策略

2. **多区域和混合云存储**
   - 设计跨区域存储解决方案
   - 配置数据复制和同步
   - 实施灾难恢复策略
   - 集成本地存储与云存储

### 重要考点

1. **EFS 配置与管理**
   - EFS 文件系统创建和配置
   - 挂载目标和安全组设置
   - 性能模式和吞吐量模式选择
   - 生命周期管理和存储类

2. **EFS CSI 驱动程序**
   - 安装和配置 EFS CSI 驱动程序
   - 创建和管理 StorageClass
   - 静态和动态配置
   - 访问点配置

3. **持久卷和声明**
   - PV 和 PVC 的生命周期
   - 访问模式选择
   - 存储容量规划
   - 回收策略管理

4. **多租户存储隔离**
   - 使用访问点隔离租户
   - 配置 POSIX 权限
   - 实施存储配额
   - 监控租户存储使用

5. **性能优化**
   - EFS 性能模式选择
   - 吞吐量配置
   - 缓存策略
   - 监控和调优

### 实战练习题

1. 在 EKS 集群上部署 EFS CSI 驱动程序，并创建一个使用 EFS 的 StatefulSet
2. 配置多个 EFS 访问点，为不同团队提供隔离的存储空间
3. 实现一个使用 EFS 的高可用 WordPress 部署，确保多个 Pod 可以共享相同的文件系统
4. 设计一个备份解决方案，使用 EFS 和 AWS Backup 保护关键数据
5. 排查并解决常见的 EFS 挂载和权限问题



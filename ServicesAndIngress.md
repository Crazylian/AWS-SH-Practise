# Kubernetes Services 与 Ingress 全面指南

## 目录
1. [Services 基本概念](#services-基本概念)
2. [Ingress 基本概念](#ingress-基本概念)
3. [AWS EKS 中的网络实现](#aws-eks-中的网络实现)
4. [应用场景](#应用场景)
5. [实际案例](#实际案例)
6. [考试重点](#考试重点)

## Services 基本概念

### 什么是 Kubernetes Service？

Kubernetes Service 是一种抽象，它定义了一组逻辑上的 Pod 和访问它们的策略。Service 使得 Pod 之间的通信以及外部访问 Pod 变得更加灵活和可靠。由于 Pod 是短暂的（可能随时被创建、销毁或重新调度），其 IP 地址不断变化，因此直接使用 Pod IP 进行通信是不可靠的。Service 提供了一个稳定的端点，使得客户端可以可靠地发现和连接到 Pod，而不需要知道它们的确切位置。

### Service 的类型

Kubernetes 提供了多种类型的 Service，以满足不同的访问需求：

1. **ClusterIP**：
   - 默认类型，为 Service 分配一个集群内部的 IP 地址
   - 只能在集群内部访问
   - 适用于内部微服务通信

2. **NodePort**：
   - 在 ClusterIP 的基础上，在每个节点上开放一个静态端口
   - 可以通过 `<NodeIP>:<NodePort>` 从集群外部访问
   - 端口范围通常为 30000-32767
   - 适用于开发和测试环境

3. **LoadBalancer**：
   - 在 NodePort 的基础上，创建一个外部负载均衡器
   - 自动分配一个外部 IP 地址
   - 在云环境中，会创建云提供商的负载均衡器（如 AWS ELB）
   - 适用于生产环境的外部访问

4. **ExternalName**：
   - 将 Service 映射到一个 DNS 名称
   - 不使用选择器和集群 IP
   - 通过返回 CNAME 记录实现
   - 适用于访问外部服务

5. **Headless Service**：
   - 不分配 ClusterIP（设置 `clusterIP: None`）
   - DNS 查询直接返回 Pod IP 地址
   - 适用于需要直接访问特定 Pod 的场景（如 StatefulSet）

### Service 的关键组件

1. **选择器（Selector）**：
   - 基于标签选择要包含在 Service 中的 Pod
   - Service 将流量路由到匹配选择器的所有 Pod

2. **端口（Port）**：
   - `port`：Service 暴露的端口
   - `targetPort`：Pod 上的目标端口
   - `nodePort`：节点上开放的端口（NodePort 类型）

3. **会话亲和性（Session Affinity）**：
   - 控制来自同一客户端的请求是否总是路由到同一个 Pod
   - 可选值：`None`（默认）或 `ClientIP`

4. **外部流量策略（External Traffic Policy）**：
   - `Cluster`（默认）：允许流量转发到任何集群节点上的 Pod
   - `Local`：只将流量转发到当前节点上的 Pod

### Service 发现机制

Kubernetes 提供了两种主要的服务发现机制：

1. **环境变量**：
   - 当 Pod 启动时，kubelet 会为每个活跃的 Service 添加一组环境变量
   - 格式为 `{SVCNAME}_SERVICE_HOST` 和 `{SVCNAME}_SERVICE_PORT`
   - 限制：Service 必须在 Pod 创建之前存在

2. **DNS**：
   - Kubernetes 集群通常部署 CoreDNS 作为集群 DNS 服务器
   - 为每个 Service 创建 DNS 记录
   - 格式为 `<service-name>.<namespace>.svc.cluster.local`
   - 支持 Pod DNS 记录（适用于 Headless Service）

## Ingress 基本概念

### 什么是 Kubernetes Ingress？

Ingress 是 Kubernetes 中管理外部访问集群内服务的 API 对象，通常用于 HTTP 和 HTTPS 流量。Ingress 提供了负载均衡、SSL 终止和基于名称的虚拟主机等功能。与 Service 不同，Ingress 操作在应用层（HTTP/HTTPS），可以提供更丰富的路由规则。

### Ingress 的工作原理

Ingress 本身不提供负载均衡功能，它需要一个 Ingress 控制器来实现其功能：

1. **Ingress 资源**：
   - 定义路由规则和配置
   - 是一个声明性的 Kubernetes 资源

2. **Ingress 控制器**：
   - 实现 Ingress 资源定义的规则
   - 通常是一个负载均衡器（如 NGINX、HAProxy、AWS ALB）
   - 监视 Ingress 资源的变化并更新路由配置

### 常见的 Ingress 控制器

1. **NGINX Ingress Controller**：
   - 使用 NGINX 作为反向代理
   - 功能丰富，配置灵活
   - 社区维护的版本和 NGINX 官方版本

2. **AWS ALB Ingress Controller**：
   - 使用 AWS Application Load Balancer
   - 与 AWS 服务深度集成
   - 支持 AWS WAF 和 AWS Shield

3. **Contour**：
   - 基于 Envoy 代理
   - 专注于高性能和动态配置
   - 支持 WebSocket 和 gRPC

4. **Traefik**：
   - 自动服务发现
   - 支持多种后端
   - 内置监控和仪表板

### Ingress 的关键功能

1. **路径路由**：
   - 基于 URL 路径将请求路由到不同的服务
   - 支持前缀匹配和精确匹配

2. **基于主机的路由**：
   - 基于请求的主机名（HTTP Host 头）路由流量
   - 支持多个虚拟主机

3. **TLS/SSL 终止**：
   - 配置 TLS 证书进行安全通信
   - 支持多个证书（基于 SNI）

4. **重写和重定向**：
   - URL 重写
   - HTTP 到 HTTPS 重定向
   - 自定义响应头

5. **负载均衡**：
   - 在后端 Pod 之间分配流量
   - 支持不同的负载均衡算法

### Ingress 与 Service 的关系

Ingress 通常与 Service 结合使用：

1. Ingress 定义外部访问规则
2. 这些规则将流量路由到 Service
3. Service 再将流量分发到 Pod

通常的流量路径是：
```
外部客户端 → Ingress 控制器 → Ingress 规则 → Service → Pod
```

## AWS EKS 中的网络实现

### EKS 中的 Service 实现

在 Amazon EKS 中，不同类型的 Service 有不同的实现方式：

1. **ClusterIP**：
   - 使用 kube-proxy 实现
   - 支持 iptables 和 IPVS 模式

2. **NodePort**：
   - 在每个节点上开放端口
   - 通过安全组规则允许流量

3. **LoadBalancer**：
   - 自动创建 AWS Classic Load Balancer (CLB) 或 Network Load Balancer (NLB)
   - 与 AWS VPC 和安全组集成

### AWS Load Balancer Controller

AWS Load Balancer Controller（以前称为 AWS ALB Ingress Controller）是 AWS 提供的一个控制器，用于在 EKS 集群中管理 AWS Elastic Load Balancer：

1. **功能**：
   - 创建和管理 ALB/NLB
   - 支持 TargetGroupBinding 资源
   - 与 AWS WAF 和 AWS Shield 集成

2. **支持的资源**：
   - Ingress（创建 ALB）
   - Service 类型 LoadBalancer（创建 NLB 或 CLB）

3. **注解（Annotations）**：
   - 通过注解配置负载均衡器属性
   - 控制目标组、监听器、SSL 策略等

### EKS 网络模式

EKS 支持多种网络模式，影响 Service 和 Ingress 的行为：

1. **Amazon VPC CNI**：
   - 默认 CNI 插件
   - 为每个 Pod 分配 VPC IP 地址
   - 支持安全组集成

2. **自定义网络**：
   - 支持其他 CNI 插件（如 Calico、Cilium）
   - 可能需要额外配置才能与 AWS 服务集成

### 网络策略

EKS 支持 Kubernetes 网络策略，用于控制 Pod 之间的通信：

1. **实现**：
   - 需要支持网络策略的 CNI 插件（如 Calico）
   - Amazon VPC CNI 需要额外配置

2. **与 Service 和 Ingress 的关系**：
   - 网络策略在 Pod 级别应用
   - 可以控制进出 Service 后端 Pod 的流量
   - 不直接影响 Ingress 控制器，但可以限制其与后端 Pod 的通信
## 应用场景

### 1. 微服务架构

**场景**：在微服务架构中，多个独立的服务需要相互通信，同时部分服务需要暴露给外部访问。

**挑战**：
- 服务发现和负载均衡
- 内部服务通信安全
- 外部访问控制
- 服务版本管理

**解决方案**：

1. **内部服务通信**：
   - 使用 ClusterIP Service 为每个微服务提供稳定的内部端点
   - 使用服务名称进行服务发现（如 `payment-service.default.svc.cluster.local`）
   - 对于有状态服务，使用 Headless Service 直接访问特定 Pod

2. **API 网关模式**：
   - 使用 Ingress 作为 API 网关
   - 配置路径路由将请求分发到不同的后端服务
   - 实现认证、授权和限流等横切关注点

3. **蓝绿部署和金丝雀发布**：
   - 使用 Service 选择器和标签实现流量切换
   - 使用 Ingress 的权重路由功能进行流量分割

**示例配置**：
```yaml
# 内部服务
apiVersion: v1
kind: Service
metadata:
  name: payment-service
spec:
  selector:
    app: payment
  ports:
  - port: 80
    targetPort: 8080

# API 网关
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /payment(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: payment-service
            port:
              number: 80
      - path: /users(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 80
```

### 2. 多租户应用

**场景**：托管多个租户的 SaaS 应用程序，每个租户需要独立访问和隔离。

**挑战**：
- 租户隔离
- 自定义域名支持
- 资源分配和限制
- 租户特定的路由规则

**解决方案**：

1. **基于主机的路由**：
   - 为每个租户配置唯一的子域名
   - 使用 Ingress 的基于主机的路由将流量导向正确的租户服务

2. **命名空间隔离**：
   - 为每个租户创建专用命名空间
   - 在每个命名空间中部署租户特定的服务
   - 使用 NetworkPolicy 限制跨命名空间通信

3. **共享服务与专用服务**：
   - 共享服务（如认证）使用 ClusterIP 在集群内部暴露
   - 租户特定服务使用 Ingress 和 Service 组合暴露

**示例配置**：
```yaml
# 租户 A 的 Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tenant-a-ingress
  namespace: tenant-a
spec:
  rules:
  - host: tenant-a.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: tenant-a-service
            port:
              number: 80

# 租户 B 的 Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tenant-b-ingress
  namespace: tenant-b
spec:
  rules:
  - host: tenant-b.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: tenant-b-service
            port:
              number: 80
```

### 3. 混合云和多集群部署

**场景**：应用程序部署在多个 Kubernetes 集群或混合云环境中，需要统一的访问点和跨集群通信。

**挑战**：
- 跨集群服务发现
- 统一入口点
- 流量路由和负载均衡
- 一致的网络策略

**解决方案**：

1. **全局负载均衡**：
   - 使用 DNS 或全局负载均衡器（如 AWS Global Accelerator）在多个集群之间分配流量
   - 每个集群使用 Ingress 或 LoadBalancer Service 暴露服务

2. **服务网格**：
   - 部署服务网格（如 Istio、Linkerd）管理跨集群通信
   - 使用虚拟服务和目标规则定义路由策略

3. **外部服务访问**：
   - 使用 ExternalName Service 或 ServiceEntry（Istio）引用外部服务
   - 配置 Ingress 或 API 网关进行统一访问

**示例配置**：
```yaml
# 集群 A 中的服务
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  annotations:
    external-dns.alpha.kubernetes.io/hostname: frontend.example.com
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 8080

# 集群 B 中引用外部服务
apiVersion: v1
kind: Service
metadata:
  name: external-api
spec:
  type: ExternalName
  externalName: api.external-service.com
```

### 4. 高可用 Web 应用

**场景**：部署需要高可用性和可扩展性的 Web 应用程序。

**挑战**：
- 高可用性和容错
- 自动扩展
- 会话持久性
- SSL/TLS 终止

**解决方案**：

1. **多层架构**：
   - 使用 Ingress 处理外部流量和 SSL 终止
   - 前端服务使用 ClusterIP 或 NodePort
   - 后端服务和数据库使用 ClusterIP

2. **会话管理**：
   - 配置 Ingress 或 Service 的会话亲和性
   - 使用外部会话存储（如 Redis）实现无状态应用

3. **自动扩展**：
   - 为服务配置 Horizontal Pod Autoscaler
   - 使用 Cluster Autoscaler 自动扩展节点

4. **健康检查和故障转移**：
   - 配置 Service 和 Ingress 的健康检查
   - 使用 Pod 反亲和性规则分散 Pod 到不同节点

**示例配置**：
```yaml
# Web 应用 Ingress 配置
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "route"
    nginx.ingress.kubernetes.io/session-cookie-expires: "172800"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "172800"
spec:
  tls:
  - hosts:
    - webapp.example.com
    secretName: webapp-tls
  rules:
  - host: webapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webapp-frontend
            port:
              number: 80

# 前端服务配置
apiVersion: v1
kind: Service
metadata:
  name: webapp-frontend
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 8080
```

### 5. 边缘计算和 IoT 应用

**场景**：边缘计算环境中的 Kubernetes 集群需要处理来自 IoT 设备的流量并与云端通信。

**挑战**：
- 有限的网络连接
- 资源受限的环境
- 设备认证和安全
- 数据聚合和过滤

**解决方案**：

1. **边缘入口点**：
   - 使用 NodePort 或 LoadBalancer Service 暴露边缘服务
   - 配置 Ingress 处理设备认证和 TLS 终止

2. **数据处理管道**：
   - 使用 ClusterIP Service 连接数据处理组件
   - 实现数据聚合、过滤和压缩

3. **云连接**：
   - 使用 ExternalName Service 引用云服务
   - 配置出站代理或 VPN 连接

**示例配置**：
```yaml
# 设备入口点
apiVersion: v1
kind: Service
metadata:
  name: device-gateway
spec:
  type: NodePort
  selector:
    app: device-gateway
  ports:
  - port: 8883  # MQTT over TLS
    targetPort: 8883
    nodePort: 30883

# 数据处理服务
apiVersion: v1
kind: Service
metadata:
  name: data-processor
spec:
  selector:
    app: data-processor
  ports:
  - port: 8080
    targetPort: 8080

# 云连接服务
apiVersion: v1
kind: Service
metadata:
  name: cloud-sync
spec:
  type: ExternalName
  externalName: api.cloud-platform.com
```
## 实际案例

### 案例 1: 在 EKS 上部署多层 Web 应用

**场景**：部署一个由前端、API 服务和数据库组成的三层 Web 应用程序。

**步骤**：

1. 创建命名空间：

```bash
kubectl create namespace webapp
```

2. 部署数据库（PostgreSQL）：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: webapp
type: Opaque
data:
  password: cG9zdGdyZXNwYXNzd29yZA==  # postgrespassword
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: webapp
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None  # Headless service for StatefulSet
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: webapp
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:13
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: POSTGRES_DB
          value: webappdb
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp2
      resources:
        requests:
          storage: 10Gi
```

3. 部署 API 服务：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: webapp
spec:
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
  namespace: webapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: my-api:1.0
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          value: postgres
        - name: DB_PORT
          value: "5432"
        - name: DB_NAME
          value: webappdb
        - name: DB_USER
          value: postgres
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
```

4. 部署前端应用：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: webapp
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-deployment
  namespace: webapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: my-frontend:1.0
        ports:
        - containerPort: 80
        env:
        - name: API_URL
          value: http://api-service
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
```

5. 安装 AWS Load Balancer Controller：

```bash
# 创建 IAM 策略
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json
aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy.json

# 创建 IAM 角色和服务账户
eksctl create iamserviceaccount \
  --cluster=my-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

# 使用 Helm 安装控制器
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=my-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

6. 创建 Ingress 资源：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webapp-ingress
  namespace: webapp
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/healthcheck-path: /
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:region:account-id:certificate/certificate-id
spec:
  rules:
  - host: webapp.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

7. 验证部署：

```bash
# 获取 Ingress 地址
kubectl get ingress -n webapp

# 测试访问
curl -H "Host: webapp.example.com" http://<INGRESS_ADDRESS>/
curl -H "Host: webapp.example.com" http://<INGRESS_ADDRESS>/api/health
```

### 案例 2: 实现蓝绿部署

**场景**：使用 Service 和 Ingress 实现应用程序的蓝绿部署。

**步骤**：

1. 部署蓝色版本（当前生产版本）：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
      - name: myapp
        image: myapp:1.0
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
  namespace: default
spec:
  selector:
    app: myapp
    version: blue  # 当前指向蓝色版本
  ports:
  - port: 80
    targetPort: 8080
```

2. 创建 Ingress 资源：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp-service
            port:
              number: 80
```

3. 部署绿色版本（新版本）：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
      - name: myapp
        image: myapp:2.0
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-green-service
  namespace: default
spec:
  selector:
    app: myapp
    version: green
  ports:
  - port: 80
    targetPort: 8080
```

4. 测试绿色版本：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-green-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: green.myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp-green-service
            port:
              number: 80
```

5. 切换流量到绿色版本：

```bash
# 更新主服务的选择器
kubectl patch service myapp-service -p '{"spec":{"selector":{"app":"myapp","version":"green"}}}'
```

6. 验证切换并清理：

```bash
# 验证流量已切换到绿色版本
curl -H "Host: myapp.example.com" http://<INGRESS_ADDRESS>/version

# 确认无问题后，删除蓝色版本
kubectl delete deployment app-blue

# 删除测试 Ingress
kubectl delete ingress myapp-green-ingress
```

### 案例 3: 使用 ExternalName 服务访问外部 API

**场景**：应用程序需要访问外部 API，但希望使用 Kubernetes 服务发现机制。

**步骤**：

1. 创建 ExternalName 服务：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: weather-api
  namespace: default
spec:
  type: ExternalName
  externalName: api.weather.com
```

2. 部署使用该服务的应用：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: weather-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: weather-app
  template:
    metadata:
      labels:
        app: weather-app
    spec:
      containers:
      - name: weather-app
        image: weather-app:1.0
        env:
        - name: WEATHER_API_URL
          value: http://weather-api/data  # 使用服务名称
```

3. 测试连接：

```bash
# 进入 Pod 测试连接
kubectl exec -it $(kubectl get pod -l app=weather-app -o jsonpath='{.items[0].metadata.name}') -- curl -v weather-api
```

### 案例 4: 配置 Ingress 进行路径重写和 SSL 终止

**场景**：配置 Ingress 进行路径重写和 SSL 终止，以便更好地集成后端服务。

**步骤**：

1. 创建 TLS 证书 Secret：

```bash
# 生成自签名证书（仅用于测试）
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout tls.key -out tls.crt -subj "/CN=myapp.example.com"

# 创建 Secret
kubectl create secret tls myapp-tls --key tls.key --cert tls.crt
```

2. 部署后端服务：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-v1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
      version: v1
  template:
    metadata:
      labels:
        app: api
        version: v1
    spec:
      containers:
      - name: api
        image: api:1.0
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api-v1-service
spec:
  selector:
    app: api
    version: v1
  ports:
  - port: 80
    targetPort: 8080
```

3. 创建带路径重写和 SSL 终止的 Ingress：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /api(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: api-v1-service
            port:
              number: 80
```

4. 测试配置：

```bash
# 测试 HTTP 到 HTTPS 重定向
curl -v -H "Host: myapp.example.com" http://<INGRESS_ADDRESS>/api/users

# 测试 HTTPS 访问和路径重写
curl -v -k -H "Host: myapp.example.com" https://<INGRESS_ADDRESS>/api/users
# 请求会被重写为 /users 并发送到后端服务
```

### 案例 5: 使用 AWS ALB Ingress Controller 实现高级路由

**场景**：使用 AWS ALB Ingress Controller 实现基于路径、主机和标头的高级路由。

**步骤**：

1. 部署多个后端服务：

```yaml
# 用户服务
apiVersion: apps/v1
kind: Deployment
metadata:
  name: users-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: users
  template:
    metadata:
      labels:
        app: users
    spec:
      containers:
      - name: users
        image: users-service:1.0
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: users-service
spec:
  selector:
    app: users
  ports:
  - port: 80
    targetPort: 8080

# 产品服务
apiVersion: apps/v1
kind: Deployment
metadata:
  name: products-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: products
  template:
    metadata:
      labels:
        app: products
    spec:
      containers:
      - name: products
        image: products-service:1.0
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: products-service
spec:
  selector:
    app: products
  ports:
  - port: 80
    targetPort: 8080
```

2. 创建具有高级路由规则的 Ingress：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: advanced-routing
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/actions.forward-mobile: >
      {"type":"forward","forwardConfig":{"targetGroups":[{"serviceName":"products-service","servicePort":"80","weight":1}]}}
spec:
  rules:
  # 基于主机的路由
  - host: api.example.com
    http:
      paths:
      - path: /users
        pathType: Prefix
        backend:
          service:
            name: users-service
            port:
              number: 80
      - path: /products
        pathType: Prefix
        backend:
          service:
            name: products-service
            port:
              number: 80
  # 基于路径的路由
  - host: example.com
    http:
      paths:
      - path: /api/users
        pathType: Prefix
        backend:
          service:
            name: users-service
            port:
              number: 80
      - path: /api/products
        pathType: Prefix
        backend:
          service:
            name: products-service
            port:
              number: 80
      # 基于条件的路由（移动设备）
      - path: /mobile-app
        pathType: Prefix
        backend:
          service:
            name: forward-mobile
            port:
              name: use-annotation
```

3. 添加自定义标头和响应：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: custom-headers
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    # 添加自定义响应标头
    alb.ingress.kubernetes.io/load-balancer-attributes: routing.http.drop_invalid_header_fields.enabled=true
    alb.ingress.kubernetes.io/success-codes: "200,201,302"
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTP
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '15'
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '5'
    alb.ingress.kubernetes.io/healthy-threshold-count: '2'
    alb.ingress.kubernetes.io/unhealthy-threshold-count: '2'
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

4. 验证配置：

```bash
# 测试基于主机的路由
curl -H "Host: api.example.com" http://<ALB_ADDRESS>/users
curl -H "Host: api.example.com" http://<ALB_ADDRESS>/products

# 测试基于路径的路由
curl -H "Host: example.com" http://<ALB_ADDRESS>/api/users
curl -H "Host: example.com" http://<ALB_ADDRESS>/api/products

# 测试带移动设备 User-Agent 的请求
curl -H "Host: example.com" -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)" http://<ALB_ADDRESS>/mobile-app
```
## 考试重点

### Kubernetes 认证考试

#### CKA (Certified Kubernetes Administrator)

1. **Service 配置与管理**
   - 创建和配置不同类型的 Service（ClusterIP、NodePort、LoadBalancer）
   - 理解 Service 选择器和端口映射
   - 排查 Service 连接问题
   - 配置 Headless Service 和 ExternalName Service

2. **网络故障排除**
   - 诊断 Service 发现问题
   - 验证 Service 端点和连接
   - 使用 `kubectl` 命令检查 Service 和 Endpoint
   - 理解 kube-proxy 模式和限制

3. **Ingress 控制器部署**
   - 部署和配置 Ingress 控制器
   - 理解 Ingress 资源和规则
   - 配置 Ingress 类（IngressClass）
   - 排查 Ingress 路由问题

#### CKAD (Certified Kubernetes Application Developer)

1. **Service 使用**
   - 为应用程序创建适当的 Service
   - 配置环境变量和 DNS 进行服务发现
   - 使用 Service 进行应用程序通信
   - 实现简单的蓝绿部署

2. **Ingress 配置**
   - 创建基本的 Ingress 资源
   - 配置路径路由和主机路由
   - 使用注解自定义 Ingress 行为
   - 实现简单的 TLS 配置

#### CKS (Certified Kubernetes Security Specialist)

1. **网络策略**
   - 使用 NetworkPolicy 限制 Service 访问
   - 实施最小权限原则
   - 保护 Ingress 流量
   - 监控和审计网络流量

2. **Ingress 安全**
   - 配置 TLS 和证书
   - 实施 HTTP 安全标头
   - 保护 Ingress 控制器
   - 防止常见的 Web 攻击

### AWS 认证考试

#### AWS Certified EKS Specialist

1. **EKS 网络模型**
   - 理解 Amazon VPC CNI 插件
   - 配置 Pod 安全组
   - 管理 EKS 集群网络
   - 排查 EKS 网络问题

2. **AWS Load Balancer Controller**
   - 部署和配置 AWS Load Balancer Controller
   - 使用注解自定义 ALB/NLB 行为
   - 配置 TargetGroupBinding 资源
   - 实施 AWS WAF 和 Shield 集成

3. **服务网格集成**
   - 配置 App Mesh 与 EKS 集成
   - 实施服务发现和路由
   - 配置流量管理和可观测性
   - 排查服务网格问题

#### AWS Certified DevOps Engineer

1. **自动化网络配置**
   - 使用 CloudFormation 或 Terraform 自动化 EKS 网络设置
   - 实施 CI/CD 流水线更新 Ingress 和 Service
   - 自动化证书管理和轮换
   - 配置监控和告警

2. **多账户和混合云网络**
   - 设计跨账户 EKS 网络
   - 配置 Transit Gateway 和 VPC 对等互连
   - 实施混合云连接策略
   - 管理跨环境服务发现

### 重要考点

1. **Service 基础**
   - Service 类型和用例
   - 选择器和标签匹配
   - 端口映射和协议
   - 会话亲和性和外部流量策略

2. **Ingress 基础**
   - Ingress 资源结构
   - 路径类型（Exact、Prefix、ImplementationSpecific）
   - 主机路由和 TLS 配置
   - Ingress 控制器特定注解

3. **网络故障排除**
   - 常见连接问题
   - DNS 解析问题
   - 服务发现失败
   - 负载均衡器配置错误

4. **高级网络配置**
   - 多集群服务发现
   - 外部服务集成
   - 自定义负载均衡算法
   - 流量分割和金丝雀发布

5. **AWS 特定功能**
   - ALB vs NLB 使用场景
   - 安全组和 IAM 集成
   - 跨区域负载均衡
   - AWS Global Accelerator 集成

### 实战练习题

1. 创建一个多层应用程序，使用不同类型的 Service 连接各层，并使用 Ingress 暴露前端
2. 实现一个使用 AWS Load Balancer Controller 的应用程序，配置高级路由和 TLS 终止
3. 设计一个蓝绿部署策略，使用 Service 和标签实现无缝流量切换
4. 排查一个 Service 连接问题，确定是选择器配置错误、网络策略限制还是 kube-proxy 问题
5. 为一个多租户应用程序配置 Ingress，实现基于主机的隔离和路径路由

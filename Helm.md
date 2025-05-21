# Helm 全面指南

## 目录
1. [Helm 基本概念](#helm-基本概念)
2. [Helm 架构](#helm-架构)
3. [Helm 应用场景](#helm-应用场景)
4. [Helm 常用命令](#helm-常用命令)
5. [实际案例](#实际案例)
6. [考试重点](#考试重点)

## Helm 基本概念

### 什么是 Helm？

Helm 是 Kubernetes 的包管理工具，类似于 Linux 中的 apt、yum 或 macOS 中的 Homebrew。Helm 使用称为 Chart 的包格式，简化了 Kubernetes 应用程序的定义、安装和升级过程。

### 核心术语

1. **Chart**: Helm 包，包含预配置的 Kubernetes 资源的集合
2. **Repository**: 存储和共享 Chart 的仓库
3. **Release**: Chart 的运行实例，每次安装 Chart 都会创建一个新的 release
4. **Values**: 用于自定义 Chart 的配置值

### Helm 2 vs Helm 3

Helm 3 于 2019 年发布，相比 Helm 2 有以下主要变化：

- 移除了 Tiller 组件，提高了安全性
- 改进了升级策略和发布管理
- 引入了 JSON Schema 验证
- 支持 OCI 注册表
- 改进了多租户环境中的安全性

## Helm 架构

### Helm 客户端

Helm 客户端是一个命令行工具，用于：
- 本地 Chart 开发
- 管理 Chart 仓库
- 与 Chart 仓库交互
- 发送 Chart 安装、升级、卸载请求
- 管理已安装的 Chart 的 release

### Chart 结构

一个典型的 Chart 目录结构：

```
mychart/
  ├── Chart.yaml          # Chart 的元数据
  ├── values.yaml         # 默认配置值
  ├── charts/             # 依赖的 Chart
  ├── templates/          # 模板文件
  │   ├── deployment.yaml
  │   ├── service.yaml
  │   ├── _helpers.tpl    # 模板辅助函数
  │   └── ...
  └── .helmignore         # 类似于 .gitignore
```

### Chart.yaml 文件

Chart.yaml 包含 Chart 的基本信息：

```yaml
apiVersion: v2
name: mychart
version: 1.0.0
description: A Helm chart for Kubernetes
type: application
appVersion: "1.16.0"
dependencies:
  - name: mysql
    version: 8.8.8
    repository: https://charts.bitnami.com/bitnami
```

### values.yaml 文件

values.yaml 包含 Chart 的默认配置值：

```yaml
replicaCount: 1
image:
  repository: nginx
  tag: 1.19.0
service:
  type: ClusterIP
  port: 80
```

## Helm 应用场景

### 1. 简化复杂应用部署

Helm 可以将复杂的多组件应用打包为单个 Chart，简化部署流程。例如，一个典型的 Web 应用可能包含前端、后端、数据库和缓存服务，使用 Helm 可以一键部署所有组件。

### 2. 标准化应用配置

通过 Helm Chart，可以定义应用的标准配置，确保在不同环境中一致部署。这对于多环境（开发、测试、生产）部署特别有用。

### 3. 版本控制和回滚

Helm 提供了应用版本控制和回滚功能，可以轻松地在不同版本之间切换，降低升级风险。

### 4. 共享和重用配置

组织可以创建内部 Chart 仓库，共享和重用经过验证的配置，避免重复工作。

### 5. CI/CD 集成

Helm 可以轻松集成到 CI/CD 流程中，实现应用的自动化部署和升级。

### 6. 管理依赖关系

Helm 可以管理 Chart 之间的依赖关系，确保按正确顺序部署相互依赖的组件。

## Helm 常用命令

### 仓库管理

```bash
# 添加仓库
helm repo add [名称] [URL]
helm repo add stable https://charts.helm.sh/stable

# 更新仓库
helm repo update

# 查看仓库列表
helm repo list

# 删除仓库
helm repo remove [名称]
```

### Chart 管理

```bash
# 搜索 Chart
helm search repo [关键词]
helm search hub [关键词]  # 搜索 Artifact Hub

# 创建新的 Chart
helm create [chart名称]

# 验证 Chart
helm lint [chart路径]

# 打包 Chart
helm package [chart路径]

# 查看 Chart 信息
helm show chart [chart名称]
helm show values [chart名称]  # 显示默认值
helm show all [chart名称]     # 显示所有信息
```

### Release 管理

```bash
# 安装 Chart
helm install [release名称] [chart名称]
helm install -f values.yaml [release名称] [chart名称]
helm install --set key1=value1,key2=value2 [release名称] [chart名称]

# 查看已安装的 release
helm list

# 查看 release 状态
helm status [release名称]

# 升级 release
helm upgrade [release名称] [chart名称]

# 回滚到之前的版本
helm rollback [release名称] [版本号]

# 卸载 release
helm uninstall [release名称]
```

### 调试与测试

```bash
# 测试安装（不实际安装）
helm install [release名称] [chart名称] --dry-run --debug

# 测试 release
helm test [release名称]

# 渲染模板而不安装
helm template [release名称] [chart名称]
```

## 实际案例

### 案例 1: 部署 WordPress 博客

```bash
# 添加 Bitnami 仓库
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# 查看 WordPress Chart 的可配置值
helm show values bitnami/wordpress

# 创建自定义配置文件 wordpress-values.yaml
cat > wordpress-values.yaml <<EOF
wordpressUsername: admin
wordpressPassword: password123
wordpressEmail: admin@example.com
persistence:
  size: 10Gi
service:
  type: LoadBalancer
EOF

# 安装 WordPress
helm install my-blog bitnami/wordpress -f wordpress-values.yaml

# 查看部署状态
helm status my-blog

# 获取 WordPress 访问 URL
kubectl get svc my-blog-wordpress
```

### 案例 2: 创建自定义 Chart 部署微服务

```bash
# 创建新的 Chart
helm create my-microservice

# 编辑 values.yaml 文件
# 修改 templates/ 目录下的模板文件

# 验证 Chart
helm lint my-microservice

# 安装 Chart
helm install my-app ./my-microservice

# 升级应用
helm upgrade my-app ./my-microservice --set replicaCount=3
```

### 案例 3: 在 EKS 上部署 Prometheus 和 Grafana 监控系统

```bash
# 添加 Prometheus 仓库
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# 创建命名空间
kubectl create namespace monitoring

# 安装 Prometheus
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --set alertmanager.persistentVolume.storageClass="gp2" \
  --set server.persistentVolume.storageClass="gp2"

# 添加 Grafana 仓库
helm repo add grafana https://grafana.github.io/helm-charts

# 安装 Grafana
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set persistence.storageClassName="gp2" \
  --set persistence.enabled=true \
  --set adminPassword='EKS!sAWSome' \
  --set datasources."datasources\.yaml".apiVersion=1 \
  --set datasources."datasources\.yaml".datasources[0].name=Prometheus \
  --set datasources."datasources\.yaml".datasources[0].type=prometheus \
  --set datasources."datasources\.yaml".datasources[0].url=http://prometheus-server.monitoring.svc.cluster.local \
  --set datasources."datasources\.yaml".datasources[0].access=proxy \
  --set datasources."datasources\.yaml".datasources[0].isDefault=true

# 获取 Grafana 访问密码
kubectl get secret --namespace monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode

# 获取 Grafana 访问 URL
kubectl get svc --namespace monitoring grafana
```

### 案例 4: 使用 Helm 部署 AWS Load Balancer Controller

```bash
# 创建 IAM 策略
aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy.json

# 创建 IAM 角色和服务账户
eksctl create iamserviceaccount \
  --cluster=<cluster-name> \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::<account-id>:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

# 添加 EKS Chart 仓库
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# 安装 AWS Load Balancer Controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=<cluster-name> \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

## 考试重点

### CKA (Certified Kubernetes Administrator)

1. **基本 Helm 命令**
   - 安装和配置 Helm
   - 添加和管理仓库
   - 安装、升级和回滚 Chart

2. **Helm 与 Kubernetes 集成**
   - 理解 Helm 如何与 Kubernetes API 交互
   - 使用 Helm 部署标准应用

### CKAD (Certified Kubernetes Application Developer)

1. **使用 Helm 部署应用**
   - 使用现有 Chart 部署应用
   - 自定义 Chart 值
   - 理解 Chart 依赖关系

2. **创建和修改 Chart**
   - 创建基本的 Chart 结构
   - 编写和调试模板
   - 使用 values.yaml 配置应用

### CKS (Certified Kubernetes Security Specialist)

1. **Helm 安全最佳实践**
   - 验证 Chart 来源
   - 使用签名 Chart
   - 理解 Helm 权限模型

2. **安全配置**
   - 安全地存储和使用敏感值
   - 使用 Helm 部署安全组件

### AWS Certified DevOps Engineer

1. **在 EKS 上使用 Helm**
   - 配置 Helm 与 EKS 集成
   - 使用 Helm 部署 AWS 特定服务
   - 理解 EKS 与 Helm 的最佳实践

2. **CI/CD 集成**
   - 在 CI/CD 流程中使用 Helm
   - 自动化 Chart 版本管理
   - 使用 AWS CodePipeline 和 Helm

### 重要考点

1. **Helm 模板语法**
   - Go 模板语法
   - 内置函数
   - 流程控制（if/else, with, range）
   - 命名模板

2. **Chart 依赖管理**
   - 定义依赖关系
   - 管理依赖版本
   - 条件依赖

3. **Helm Hooks**
   - pre-install, post-install
   - pre-upgrade, post-upgrade
   - pre-delete, post-delete
   - 权重和执行顺序

4. **Helm 最佳实践**
   - Chart 版本控制
   - 文档和注释
   - 测试和验证
   - 安全考虑

5. **故障排查**
   - 常见错误和解决方法
   - 使用 --debug 和 --dry-run
   - 验证生成的清单

### 实战练习题

1. 创建一个包含 Deployment、Service 和 ConfigMap 的基本 Chart
2. 使用 Helm 部署一个带有持久存储的数据库
3. 实现 Chart 之间的依赖关系
4. 使用 Helm Hooks 实现数据库迁移
5. 为现有应用创建 Helm Chart 并部署到 EKS

记住，Helm 考试通常关注实际操作能力，而不仅仅是理论知识。因此，实践经验对于通过考试至关重要。

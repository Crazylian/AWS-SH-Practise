# Amazon EKS 常用命令文档

本文档汇总了 Amazon EKS (Elastic Kubernetes Service) 的常用命令，包括集群管理、节点组管理、Kubernetes 资源操作等方面。

## 前提条件

确保已安装以下工具：

- AWS CLI
- kubectl
- eksctl (EKS CLI 工具)
- helm (可选，用于包管理)

## 配置与认证

```bash
# 配置 AWS CLI
aws configure

# 更新 kubeconfig 以连接到 EKS 集群
aws eks update-kubeconfig --region <region> --name <cluster-name>

# 验证连接
kubectl get svc
```

## 集群管理

### 创建集群

```bash
# 使用 eksctl 创建基本集群
eksctl create cluster --name=<cluster-name> --region=<region> --nodes=3 --node-type=t3.medium

# 使用配置文件创建集群
eksctl create cluster -f cluster-config.yaml
```

### 查看集群信息

```bash
# 列出所有集群
aws eks list-clusters --region <region>

# 查看特定集群详情
aws eks describe-cluster --name <cluster-name> --region <region>

# 获取集群版本
kubectl version --short

# 查看集群信息
kubectl cluster-info
```

### 更新集群

```bash
# 更新 EKS 集群版本
aws eks update-cluster-version --name <cluster-name> --kubernetes-version <version> --region <region>

# 使用 eksctl 更新集群
eksctl upgrade cluster --name=<cluster-name> --region=<region> --approve
```

### 删除集群

```bash
# 使用 eksctl 删除集群
eksctl delete cluster --name=<cluster-name> --region=<region>

# 使用 AWS CLI 删除集群
aws eks delete-cluster --name <cluster-name> --region <region>
```

## 节点组管理

### 创建节点组

```bash
# 创建托管节点组
eksctl create nodegroup \
  --cluster=<cluster-name> \
  --region=<region> \
  --name=<nodegroup-name> \
  --node-type=t3.medium \
  --nodes=3 \
  --nodes-min=1 \
  --nodes-max=4

# 使用配置文件创建节点组
eksctl create nodegroup -f nodegroup-config.yaml
```

### 查看节点组信息

```bash
# 列出集群的节点组
aws eks list-nodegroups --cluster-name <cluster-name> --region <region>

# 查看特定节点组详情
aws eks describe-nodegroup --cluster-name <cluster-name> --nodegroup-name <nodegroup-name> --region <region>

# 查看节点信息
kubectl get nodes
kubectl describe node <node-name>
```

### 更新节点组

```bash
# 更新节点组大小
aws eks update-nodegroup-config \
  --cluster-name <cluster-name> \
  --nodegroup-name <nodegroup-name> \
  --scaling-config minSize=2,maxSize=6,desiredSize=4 \
  --region <region>

# 使用 eksctl 更新节点组
eksctl scale nodegroup --cluster=<cluster-name> --name=<nodegroup-name> --nodes=4 --region=<region>
```

### 删除节点组

```bash
# 删除节点组
eksctl delete nodegroup --cluster=<cluster-name> --name=<nodegroup-name> --region=<region>

# 使用 AWS CLI 删除节点组
aws eks delete-nodegroup --cluster-name <cluster-name> --nodegroup-name <nodegroup-name> --region <region>
```

## Kubernetes 资源管理

### 部署应用

```bash
# 从文件部署
kubectl apply -f deployment.yaml

# 创建部署
kubectl create deployment <name> --image=<image>

# 扩展部署
kubectl scale deployment <name> --replicas=3
```

### 服务管理

```bash
# 创建服务
kubectl expose deployment <name> --port=80 --target-port=8080 --type=LoadBalancer

# 查看服务
kubectl get services
kubectl describe service <service-name>
```

### Pod 管理

```bash
# 查看 Pod
kubectl get pods
kubectl get pods -o wide
kubectl get pods --all-namespaces

# 查看 Pod 详情
kubectl describe pod <pod-name>

# 查看 Pod 日志
kubectl logs <pod-name>
kubectl logs -f <pod-name> # 实时日志

# 进入 Pod 容器
kubectl exec -it <pod-name> -- /bin/bash
```

### 配置管理

```bash
# 创建 ConfigMap
kubectl create configmap <name> --from-file=<path/to/file>

# 创建 Secret
kubectl create secret generic <name> --from-literal=key1=value1 --from-literal=key2=value2
```

## 网络与安全

### 网络策略

```bash
# 应用网络策略
kubectl apply -f network-policy.yaml
```

### 安全组管理

```bash
# 查看集群安全组
aws eks describe-cluster --name <cluster-name> --region <region> --query "cluster.resourcesVpcConfig.securityGroupIds"
```

## 监控与日志

### 部署 CloudWatch Container Insights

```bash
# 安装 CloudWatch Container Insights
eksctl create iamserviceaccount \
  --name cloudwatch-agent \
  --namespace amazon-cloudwatch \
  --cluster <cluster-name> \
  --attach-policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy \
  --approve \
  --region <region>

# 部署 CloudWatch 代理
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluentd-quickstart.yaml
```

### 查看集群指标

```bash
# 使用 kubectl top 命令查看资源使用情况
kubectl top nodes
kubectl top pods
```

## 故障排查

```bash
# 查看节点状态
kubectl get nodes
kubectl describe node <node-name>

# 查看 Pod 状态
kubectl get pods
kubectl describe pod <pod-name>

# 查看事件
kubectl get events --sort-by='.lastTimestamp'

# 查看组件状态
kubectl get componentstatuses
```

## 常用 eksctl 命令示例

```bash
# 创建 Fargate 配置文件
eksctl create fargateprofile \
  --cluster <cluster-name> \
  --name <profile-name> \
  --namespace <namespace>

# 创建 IAM 服务账户
eksctl create iamserviceaccount \
  --name <service-account-name> \
  --namespace <namespace> \
  --cluster <cluster-name> \
  --attach-policy-arn <policy-arn> \
  --approve

# 启用 OIDC 提供商
eksctl utils associate-iam-oidc-provider \
  --cluster <cluster-name> \
  --approve
```

## 附加组件管理

```bash
# 列出可用的附加组件
aws eks list-addons --cluster-name <cluster-name> --region <region>

# 创建附加组件
aws eks create-addon \
  --cluster-name <cluster-name> \
  --addon-name <addon-name> \
  --addon-version <version> \
  --region <region>

# 更新附加组件
aws eks update-addon \
  --cluster-name <cluster-name> \
  --addon-name <addon-name> \
  --addon-version <version> \
  --region <region>

# 删除附加组件
aws eks delete-addon \
  --cluster-name <cluster-name> \
  --addon-name <addon-name> \
  --region <region>
```

## 常用附加组件

```bash
# 安装 AWS Load Balancer Controller
eksctl create iamserviceaccount \
  --cluster=<cluster-name> \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::<account-id>:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=<cluster-name> \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# 安装 Amazon EBS CSI 驱动
eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa \
  --namespace kube-system \
  --cluster <cluster-name> \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve \
  --role-only \
  --role-name AmazonEKS_EBS_CSI_DriverRole

aws eks create-addon \
  --cluster-name <cluster-name> \
  --addon-name aws-ebs-csi-driver \
  --service-account-role-arn arn:aws:iam::<account-id>:role/AmazonEKS_EBS_CSI_DriverRole \
  --region <region>
```

希望这份 EKS 常用命令文档对您有所帮助！您可以根据实际需求使用这些命令来管理和操作 Amazon EKS 集群。

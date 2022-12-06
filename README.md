#CDK for eks cluster deployed in private subnet

#Reference/Base tempalte
https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/eks/cluster

#Prerequisites
```
npm install -g typescript
npm run build
cdk deploy
```


### Build Plan
```
1. deploy EKS cluster
2. deploy web app
3. deploy load balancer
4. deploy database
5. deploy worker pods
```
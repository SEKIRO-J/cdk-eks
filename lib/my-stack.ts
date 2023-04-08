'use strict';

import autoscaling = require('aws-cdk-lib/aws-autoscaling');
import iam = require('aws-cdk-lib/aws-iam');
import ec2 = require('aws-cdk-lib/aws-ec2');
import eks = require('aws-cdk-lib/aws-eks');
import rds = require('aws-cdk-lib/aws-rds');
import cdk = require('aws-cdk-lib');
import { Construct } from 'constructs';

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVPC', {
      cidr: '10.0.0.0/16',
      natGateways: 1,
      maxAzs: 3,
      subnetConfiguration: [
        {
          name: 'MyPrivate',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'MyPublic',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'MyIsolate',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const clusterAdmin = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    // IAM role for our EC2 worker nodes
    const workerRole = new iam.Role(this, 'EKSWorkerRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });

    const eksCluster = new eks.Cluster(this, 'MyCluster', {
      mastersRole: clusterAdmin,
      vpc: vpc,
      defaultCapacity: 1,  // we want to manage capacity our selves
      version: eks.KubernetesVersion.V1_21,
    });

    const onDemandASG = new autoscaling.AutoScalingGroup(this, 'OnDemandASG', {
      vpc: vpc,
      role: workerRole,
      minCapacity: 1,
      maxCapacity: 10,
      instanceType: new ec2.InstanceType('t3.nano'),
      machineImage: new eks.EksOptimizedImage({
        kubernetesVersion: '1.21',
        nodeType: eks.NodeType.STANDARD  // without this, incorrect SSM parameter for AMI is resolved
      }),
      updatePolicy: autoscaling.UpdatePolicy.rollingUpdate()
    });

    eksCluster.connectAutoScalingGroupCapacity(onDemandASG, {});

    const cluster = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.AURORA,
      instanceProps: { vpc },
    });

    const proxy = new rds.DatabaseProxy(this, 'Proxy', {
      proxyTarget: rds.ProxyTarget.fromCluster(cluster),
      secrets: [cluster.secret!],
      vpc,
    });

    const role = new iam.Role(this, 'DBProxyRole', { assumedBy: new iam.AccountPrincipal(this.account) });
    proxy.grantConnect(role, 'admin'); // Grant the role connection access to the DB Proxy for database user 'admin'.


  }
}

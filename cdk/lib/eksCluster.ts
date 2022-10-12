import autoscaling = require('aws-cdk-lib/aws-autoscaling');
import iam = require('aws-cdk-lib/aws-iam');
import ec2 = require('aws-cdk-lib/aws-ec2');
import eks = require('aws-cdk-lib/aws-eks');
import cdk = require('aws-cdk-lib');
import {
    CfnOutput,
    Stack,
    StackProps,
    Tags,
    App,
    Fn,
    Duration,
    RemovalPolicy,
  } from 'aws-cdk-lib';

  export interface EksProps extends StackProps {
  
    /**
     * VPC Id
     * @type {string}
     * @memberof EksProps
     */
    readonly vpcId?: string;
  }

  export class EKSCluster extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: EksProps) {
      super(scope, id, props);
  
      const azs = Fn.getAzs();
    
      // vpc
      const vpc = ec2.Vpc.fromVpcAttributes(this, 'ExistingVPC', {
        vpcId: props.vpcId!,
        availabilityZones: azs,
      });
      
      const clusterAdmin = new iam.Role(this, 'AdminRole', {
        assumedBy: new iam.AccountRootPrincipal()
        });
  
      // IAM role for our EC2 worker nodes
      const workerRole = new iam.Role(this, 'EKSWorkerRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
      });
  
      const eksCluster = new eks.Cluster(this, 'Cluster', {
        clusterName: "myEKS",
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
    }
  }
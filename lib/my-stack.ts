'use strict';

import autoscaling = require('aws-cdk-lib/aws-autoscaling');
import iam = require('aws-cdk-lib/aws-iam');
import ec2 = require('aws-cdk-lib/aws-ec2');
import eks = require('aws-cdk-lib/aws-eks');
import rds = require('aws-cdk-lib/aws-rds');
import cdk = require('aws-cdk-lib');
import { Construct } from 'constructs';
import { Aurora } from './aurora';
import { Eks } from './eks';

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 1,
      maxAzs: 3,
      subnetConfiguration: [
        {
          name: 'Ingress',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Application',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const eks = new Eks(this, 'MyEks', {
      vpc: vpc,
    }).cluster

    const rds = new Aurora(this, 'MyAurora', {
      vpc: vpc,
      subnets: vpc.privateSubnets,
      dbName: "mydb",
      engine: "postgresql",
      ingressSources: [eks.clusterSecurityGroup],
    });
  }
}

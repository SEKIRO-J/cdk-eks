'use strict';

import { KubectlV25Layer } from '@aws-cdk/lambda-layer-kubectl-v25';
import { Construct } from 'constructs';
import autoscaling = require('aws-cdk-lib/aws-autoscaling');
import iam = require('aws-cdk-lib/aws-iam');
import ec2 = require('aws-cdk-lib/aws-ec2');
import eks = require('aws-cdk-lib/aws-eks');

export interface EksProps {
    /**
     * the VPC
     *
     * @type {string}
     * @memberof AuroraProps
     */
    readonly vpc: ec2.Vpc;
}

export class Eks extends Construct {

    public readonly cluster: eks.Cluster;

    constructor(scope: Construct, id: string, props: EksProps) {
        super(scope, id);

        const vpc = props.vpc;

        const clusterAdmin = new iam.Role(this, 'ClusterAdminRole', {
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
            version: eks.KubernetesVersion.V1_25,
            kubectlLayer: new KubectlV25Layer(this, 'kubectl'),
        });

        const onDemandASG = new autoscaling.AutoScalingGroup(this, 'OnDemandASG', {
            vpc: vpc,
            role: workerRole,
            minCapacity: 1,
            maxCapacity: 10,
            instanceType: new ec2.InstanceType('t3.nano'),
            machineImage: new eks.EksOptimizedImage({
                kubernetesVersion: '1.25',
                nodeType: eks.NodeType.STANDARD  // without this, incorrect SSM parameter for AMI is resolved
            }),
            updatePolicy: autoscaling.UpdatePolicy.rollingUpdate(),
        });

        eksCluster.connectAutoScalingGroupCapacity(onDemandASG, {});

        this.cluster = eksCluster;
    }
}
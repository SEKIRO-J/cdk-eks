"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const autoscaling = require("aws-cdk-lib/aws-autoscaling");
const iam = require("aws-cdk-lib/aws-iam");
const ec2 = require("aws-cdk-lib/aws-ec2");
const eks = require("aws-cdk-lib/aws-eks");
const cdk = require("aws-cdk-lib");
class EKSCluster extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const vpc = new ec2.Vpc(this, 'myVPC', {
            cidr: '10.0.0.0/16',
            natGateways: 1,
            maxAzs: 3,
            subnetConfiguration: [
                {
                    name: 'myPrivate',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
                    cidrMask: 24,
                },
                {
                    name: 'myPublic',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
                {
                    name: 'mySolated',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 28,
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
        const eksCluster = new eks.Cluster(this, 'Cluster', {
            clusterName: "myEKSv2",
            mastersRole: clusterAdmin,
            vpc: vpc,
            defaultCapacity: 1,
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
                nodeType: eks.NodeType.STANDARD // without this, incorrect SSM parameter for AMI is resolved
            }),
            updatePolicy: autoscaling.UpdatePolicy.rollingUpdate()
        });
        eksCluster.connectAutoScalingGroupCapacity(onDemandASG, {});
    }
}
const app = new cdk.App();
new EKSCluster(app, 'MyEKSCluster');
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDJEQUE0RDtBQUM1RCwyQ0FBNEM7QUFDNUMsMkNBQTRDO0FBQzVDLDJDQUE0QztBQUM1QyxtQ0FBb0M7QUFFcEMsTUFBTSxVQUFXLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDaEMsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzVELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQ3JDLElBQUksRUFBRSxhQUFhO1lBQ25CLFdBQVcsRUFBRSxDQUFDO1lBQ2QsTUFBTSxFQUFFLENBQUM7WUFDVCxtQkFBbUIsRUFBRTtnQkFDbkI7b0JBQ0UsSUFBSSxFQUFFLFdBQVc7b0JBQ2pCLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtvQkFDM0MsUUFBUSxFQUFFLEVBQUU7aUJBQ2I7Z0JBQ0Q7b0JBQ0UsSUFBSSxFQUFFLFVBQVU7b0JBQ2hCLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU07b0JBQ2pDLFFBQVEsRUFBRSxFQUFFO2lCQUNiO2dCQUNEO29CQUNFLElBQUksRUFBRSxXQUFXO29CQUNqQixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0I7b0JBQzNDLFFBQVEsRUFBRSxFQUFFO2lCQUNiO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUNuRCxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsb0JBQW9CLEVBQUU7U0FDeEMsQ0FBQyxDQUFDO1FBRUwsb0NBQW9DO1FBQ3BDLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3JELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQztTQUN6RCxDQUFDLENBQUM7UUFFSCxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUNsRCxXQUFXLEVBQUUsU0FBUztZQUN0QixXQUFXLEVBQUUsWUFBWTtZQUN6QixHQUFHLEVBQUUsR0FBRztZQUNSLGVBQWUsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sRUFBRSxHQUFHLENBQUMsaUJBQWlCLENBQUMsS0FBSztTQUNyQyxDQUFDLENBQUM7UUFFSCxNQUFNLFdBQVcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3hFLEdBQUcsRUFBRSxHQUFHO1lBQ1IsSUFBSSxFQUFFLFVBQVU7WUFDaEIsV0FBVyxFQUFFLENBQUM7WUFDZCxXQUFXLEVBQUUsRUFBRTtZQUNmLFlBQVksRUFBRSxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO1lBQzdDLFlBQVksRUFBRSxJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztnQkFDdEMsaUJBQWlCLEVBQUUsTUFBTTtnQkFDekIsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFFLDREQUE0RDthQUM5RixDQUFDO1lBQ0YsWUFBWSxFQUFFLFdBQVcsQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFO1NBQ3JELENBQUMsQ0FBQztRQUVMLFVBQVUsQ0FBQywrQkFBK0IsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDOUQsQ0FBQztDQUNGO0FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDMUIsSUFBSSxVQUFVLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQ3BDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhdXRvc2NhbGluZyA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1hdXRvc2NhbGluZycpO1xuaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ2F3cy1jZGstbGliL2F3cy1pYW0nKTtcbmltcG9ydCBlYzIgPSByZXF1aXJlKCdhd3MtY2RrLWxpYi9hd3MtZWMyJyk7XG5pbXBvcnQgZWtzID0gcmVxdWlyZSgnYXdzLWNkay1saWIvYXdzLWVrcycpO1xuaW1wb3J0IGNkayA9IHJlcXVpcmUoJ2F3cy1jZGstbGliJyk7XG5cbmNsYXNzIEVLU0NsdXN0ZXIgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkFwcCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgdnBjID0gbmV3IGVjMi5WcGModGhpcywgJ215VlBDJywge1xuICAgICAgY2lkcjogJzEwLjAuMC4wLzE2JyxcbiAgICAgIG5hdEdhdGV3YXlzOiAxLFxuICAgICAgbWF4QXpzOiAzLFxuICAgICAgc3VibmV0Q29uZmlndXJhdGlvbjogW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ215UHJpdmF0ZScsXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX05BVCxcbiAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAnbXlQdWJsaWMnLFxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBVQkxJQyxcbiAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAnbXlTb2xhdGVkJyxcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxuICAgICAgICAgIGNpZHJNYXNrOiAyOCxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG4gICAgXG4gICAgY29uc3QgY2x1c3RlckFkbWluID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdBZG1pblJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uQWNjb3VudFJvb3RQcmluY2lwYWwoKVxuICAgICAgfSk7XG5cbiAgICAvLyBJQU0gcm9sZSBmb3Igb3VyIEVDMiB3b3JrZXIgbm9kZXNcbiAgICBjb25zdCB3b3JrZXJSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdFS1NXb3JrZXJSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2VjMi5hbWF6b25hd3MuY29tJylcbiAgICB9KTtcblxuICAgIGNvbnN0IGVrc0NsdXN0ZXIgPSBuZXcgZWtzLkNsdXN0ZXIodGhpcywgJ0NsdXN0ZXInLCB7XG4gICAgICBjbHVzdGVyTmFtZTogXCJteUVLU3YyXCIsXG4gICAgICBtYXN0ZXJzUm9sZTogY2x1c3RlckFkbWluLFxuICAgICAgdnBjOiB2cGMsXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDEsICAvLyB3ZSB3YW50IHRvIG1hbmFnZSBjYXBhY2l0eSBvdXIgc2VsdmVzXG4gICAgICB2ZXJzaW9uOiBla3MuS3ViZXJuZXRlc1ZlcnNpb24uVjFfMjEsXG4gICAgfSk7XG5cbiAgICBjb25zdCBvbkRlbWFuZEFTRyA9IG5ldyBhdXRvc2NhbGluZy5BdXRvU2NhbGluZ0dyb3VwKHRoaXMsICdPbkRlbWFuZEFTRycsIHtcbiAgICAgIHZwYzogdnBjLFxuICAgICAgcm9sZTogd29ya2VyUm9sZSxcbiAgICAgIG1pbkNhcGFjaXR5OiAxLFxuICAgICAgbWF4Q2FwYWNpdHk6IDEwLFxuICAgICAgaW5zdGFuY2VUeXBlOiBuZXcgZWMyLkluc3RhbmNlVHlwZSgndDMubmFubycpLFxuICAgICAgbWFjaGluZUltYWdlOiBuZXcgZWtzLkVrc09wdGltaXplZEltYWdlKHtcbiAgICAgICAga3ViZXJuZXRlc1ZlcnNpb246ICcxLjIxJyxcbiAgICAgICAgbm9kZVR5cGU6IGVrcy5Ob2RlVHlwZS5TVEFOREFSRCAgLy8gd2l0aG91dCB0aGlzLCBpbmNvcnJlY3QgU1NNIHBhcmFtZXRlciBmb3IgQU1JIGlzIHJlc29sdmVkXG4gICAgICB9KSxcbiAgICAgIHVwZGF0ZVBvbGljeTogYXV0b3NjYWxpbmcuVXBkYXRlUG9saWN5LnJvbGxpbmdVcGRhdGUoKVxuICAgICAgfSk7XG5cbiAgICBla3NDbHVzdGVyLmNvbm5lY3RBdXRvU2NhbGluZ0dyb3VwQ2FwYWNpdHkob25EZW1hbmRBU0csIHt9KTtcbiAgfVxufVxuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xubmV3IEVLU0NsdXN0ZXIoYXBwLCAnTXlFS1NDbHVzdGVyJyk7XG5hcHAuc3ludGgoKTsiXX0=
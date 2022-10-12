import ec2 = require('aws-cdk-lib/aws-ec2');
import cdk = require('aws-cdk-lib');
import {EKSCluster}  from 'lib/eksCluster';
import {Postgres}  from 'lib/postgres';


const app = new cdk.App();
const vpc = new ec2.Vpc(this, 'MyVpc');  // Create a new VPC for our cluster
const vpcId = vpc.vpcId;

new EKSCluster(app, 'MyEKSCluster', {
  vpcId: vpcId
});

new Postgres(app, 'PostgresStack', {
  env:{region:"us-east-1"}, description:"PostgresSQL Stack",
  vpcId: vpcId
  subnetIds:["subnet-xxxxxxxx", "subnet-yyyyyyyy", "subnet-zzzzzzzz"],
  dbName:"myDB"
});

app.synth();
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
  import * as ec2 from 'aws-cdk-lib/aws-ec2';
  import * as logs from 'aws-cdk-lib/aws-logs';
  import * as rds from 'aws-cdk-lib/aws-rds';
  import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
  import { Construct } from 'constructs';
  
  export interface PostgresProps extends StackProps {
  
    /**
     * VPC Id
     * @type {string}
     * @memberof PostgresProps
     */
    readonly vpcId?: string;
  
    /**
     * List of Subnet
     * @type {string[]}
     * @memberof PostgresProps
     */
    readonly subnetIds?: string[];
  
  
    /**
     * provide the name of the database
     * @type {string}
     * @memberof PostgresProps
     */
    readonly dbName?: string;
  
    /**
     *
     * ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.LARGE)
     * @type {*}
     * @memberof PostgresProps
     * @default ec2.InstanceType.of(ec2.InstanceClass.t3, ec2.InstanceSize.SMALL)
     */
    readonly instanceType?: any;
  
    /**
     * provide the version of the database
     * @type {*}
     * @memberof PostgresProps
     * @default rds.PostgresEngineVersion.VER_13_6
     */
    readonly engineVersion?: any;
  
    /**
     * user name of the database
     * @type {str}
     * @memberof PostgresProps
     * @default dbadmin
     */
    readonly PostgresUsername?: string;
  
    /**
     * backup retention days for example 14
     * @type {number}
     * @memberof PostgresProps
     * @default 14
     */
    readonly backupRetentionDays?: number;
  
    /**
     * backup window time 00:15-01:15
     * @type {string}
     * @memberof PostgresProps
     * @default 00:15-01:15
     */
  
    readonly backupWindow?: string;
  
    /**
     *
     * maintenance time Sun:23:45-Mon:00:15
     * @type {string}
     * @memberof PostgresProps
     * @default Sun:23:45-Mon:00:15
     */
    readonly preferredMaintenanceWindow?: string;
  
    /**
     *
     * list of ingress sources
     * @type {any []}
     * @memberof PostgresProps
     */
    readonly ingressSources?: any[];
  }
  
  export class Postgres extends Stack {
    constructor(scope: Construct, id: string, props: PostgresProps) {
      super(scope, id);
  
      // default database username
      var PostgresUsername = "dbadmin";
      if (typeof props.PostgresUsername !== 'undefined') {
        PostgresUsername = props.PostgresUsername;
      }
      var ingressSources = [];
      if (typeof props.ingressSources !== 'undefined') {
        ingressSources = props.ingressSources;
      }
      var engineVersion = rds.PostgresEngineVersion.VER_13_6;
      if (typeof props.engineVersion !== 'undefined') {
        engineVersion = props.engineVersion;
      }
  
  
  
      const azs = Fn.getAzs();
  
      // vpc
      const vpc = ec2.Vpc.fromVpcAttributes(this, 'ExistingVPC', {
        vpcId: props.vpcId!,
        availabilityZones: azs,
      });
  
      // Subnets
      const subnets: any[] = [];
  
      for (let subnetId of props.subnetIds!) {
        const subid = subnetId
          .replace('-', '')
          .replace('_', '')
          .replace(' ', '');
        subnets.push(
          ec2.Subnet.fromSubnetAttributes(this, subid, {
            subnetId: subid,
          }),
        );
      }
  
      const vpcSubnets: ec2.SubnetSelection = {
        subnets: subnets,
      };
  
      const allAll = ec2.Port.allTraffic();
      const tcp3306 = ec2.Port.tcpRange(3306, 3306);
  
      const dbsg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
        vpc: vpc,
        allowAllOutbound: true,
        description: id + 'Database',
        securityGroupName: id + 'Database',
      });
  
      dbsg.addIngressRule(dbsg, allAll, 'all from self');
      dbsg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), allAll, 'all out');
  
      const PostgresConnectionPorts = [
        { port: tcp3306, description: 'tcp3306 Postgres' },
      ];
  
      for (let ingressSource of ingressSources!) {
        for (let c of PostgresConnectionPorts) {
          dbsg.addIngressRule(ingressSource, c.port, c.description);
        }
      }
  
      const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
        vpc: vpc,
        description: id + 'subnet group',
        vpcSubnets: vpcSubnets,
        subnetGroupName: id + 'subnet group',
      });
  
      const PostgresSecret = new secretsmanager.Secret(this, 'PostgresCredentials', {
        secretName: props.dbName + 'PostgresCredentials',
        description: props.dbName + 'Postgres Database Crendetials',
        generateSecretString: {
          excludeCharacters: "\"@/\\ '",
          generateStringKey: 'password',
          passwordLength: 30,
          secretStringTemplate: `{"username":${PostgresUsername}}`,
        },
      });
  
      const PostgresCredentials = rds.Credentials.fromSecret(
        PostgresSecret,
        PostgresUsername,
      );
  
      const dbParameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
        engine: rds.DatabaseInstanceEngine.Postgres({
          version: engineVersion,
        }),
        parameters: { open_cursors: '2500' },
      });
  
  
  
      const PostgresInstance = new rds.DatabaseInstance(this, 'PostgresDatabase', {
        databaseName: props.dbName,
        instanceIdentifier: props.dbName,
        credentials: PostgresCredentials,
        engine: rds.DatabaseInstanceEngine.Postgres({
          version: engineVersion,
        }),
        backupRetention: Duration.days(7),
        allocatedStorage: 20,
        securityGroups: [dbsg],
        allowMajorVersionUpgrade: true,
        autoMinorVersionUpgrade: true,
        instanceType: props.instanceType,
        vpcSubnets: vpcSubnets,
        vpc: vpc,
        removalPolicy: RemovalPolicy.DESTROY,
        storageEncrypted: true,
        monitoringInterval: Duration.seconds(60),
        enablePerformanceInsights: true,
        parameterGroup: dbParameterGroup,
        subnetGroup: dbSubnetGroup,
        preferredBackupWindow: props.backupWindow,
        preferredMaintenanceWindow: props.preferredMaintenanceWindow,
        publiclyAccessible: false,
      });
  
      PostgresInstance.addRotationSingleUser();
  
      // Tags
      Tags.of(PostgresInstance).add('Name', 'PostgresDatabase', {
        priority: 300,
      });
  
  
      new CfnOutput(this, 'PostgresEndpoint', {
        exportName: 'PostgresEndPoint',
        value: PostgresInstance.dbInstanceEndpointAddress,
      });
  
      new CfnOutput(this, 'PostgresUserName', {
        exportName: 'PostgresUserName',
        value: PostgresUsername,
      });
  
      new CfnOutput(this, 'PostgresDbName', {
        exportName: 'PostgresDbName',
        value: props.dbName!,
      });
    }
  }
  
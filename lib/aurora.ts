'use strict';

import {
    CfnOutput, Duration,
    RemovalPolicy, Tags
} from 'aws-cdk-lib';

import cloudwatch = require('aws-cdk-lib/aws-cloudwatch');
import kms = require('aws-cdk-lib/aws-kms');
import ec2 = require('aws-cdk-lib/aws-ec2');
import secretsmanager = require('aws-cdk-lib/aws-secretsmanager');
import rds = require('aws-cdk-lib/aws-rds');
import logs = require('aws-cdk-lib/aws-logs');

import { Construct } from 'constructs';

export interface AuroraProps {

    /**
     * the VPC
     *
     * @type {string}
     * @memberof AuroraProps
     */
    readonly vpc: ec2.Vpc;


    /**
     *
     * this list of subnets
     *
     * @type {ISubnet []}
     * @memberof AuroraProps
     *
     */
    readonly subnets?: ec2.ISubnet[];

    /**
     * The name of the database
     *
     *
     * @type {string}
     * @memberof AuroraProps
     *
     */
    readonly dbName?: string;

    /**
     * the type of instance for example ec2 graviton for example ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.LARGE)
     *
     * @type {*}
     * @memberof AuroraProps
     *
     */
    readonly instanceType?: any;

    /**
     * any replica instances
     *
     *
     * @type {number}
     * @memberof AuroraProps
     */
    readonly replicaInstances?: number;

    /**
     *
     * prove aurora cluster username
     *
     * @type {string}
     * @memberof AuroraProps
     */
    readonly auroraClusterUsername?: string;

    /**
     *
     * Backup retention days like 14
     *
     * @type {number}
     * @memberof AuroraProps
     */
    readonly backupRetentionDays?: number;

    /**
     *
     *  backup window time for example  22:00-23:00
     *
     * @type {string}
     * @memberof AuroraProps
     */
    readonly backupWindow?: string;

    /**
     *
     * maintenance time Sun:23:45-Mon:00:15
     *
     * @type {string}
     * @memberof AuroraProps
     */
    readonly preferredMaintenanceWindow?: string;

    /**
     * the engine type for example mysql or postresql
     *
     *
     * @type {string}
     * @memberof AuroraProps
     */
    readonly engine?: string;
    readonly enableBabelfish?: boolean;

    /**
     * list of ingress sources
     *
     *
     * @type {any[]}
     * @memberof AuroraProps
     */
    readonly ingressSources?: any[];

    /**
     *
     * provide description
     *
     * @type {string}
     * @memberof AuroraProps
     *
     */
    readonly description?: string;

    /**
    *
    * provide description
    *
    * @type {string []}
    * @memberof AuroraProps
    *
    */
    readonly inboundSecurityGroupIds?: string[];
}


export class Aurora extends Construct {
    constructor(scope: Construct, id: string, props: AuroraProps) {
        super(scope, id);

        let instanceType = props.instanceType;
        let replicaInstances = props.replicaInstances ?? 1;
        let backupRetentionDays = props.backupRetentionDays ?? 14;

        var ingressSources = [];
        if (typeof props.ingressSources !== 'undefined') {
            ingressSources = props.ingressSources;
        }

        const dbs = ['mysql', 'postgresql'];
        if (!dbs.includes(props.engine!)) {
            throw new Error('Unknown Engine Please Use mysql or postgresql');
            process.exit(1);
        }
        if (backupRetentionDays < 14) {
            backupRetentionDays = 14;
        }
        if (replicaInstances < 1) {
            replicaInstances = 1;
        }

        // vpc
        const vpc = props.vpc;

        // interface
        const vpcSubnets: ec2.SubnetSelection = {
            subnets: props.subnets,
        };

        // all the ports
        const allAll = ec2.Port.allTraffic();
        const tcp3306 = ec2.Port.tcpRange(3306, 3306);
        const tcp5432 = ec2.Port.tcpRange(5432, 5432);
        const tcp1433 = ec2.Port.tcpRange(1433, 1433);

        let connectionPort: any;
        let connectionName: string;

        // Database Security Group
        const dbsg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
            vpc: vpc,
            description: id + 'Database',
            securityGroupName: id + 'Database',
        });
        dbsg.addIngressRule(dbsg, allAll, 'all from self');

        if (props.engine == 'mysql') {
            connectionPort = tcp3306;
            connectionName = 'tcp3306 MySQL';
        } else {
            connectionPort = tcp5432;
            connectionName = 'tcp5432 PostgresSQL';
        }

        for (let ingress_source of ingressSources!) {
            dbsg.addIngressRule(ingress_source, connectionPort, connectionName);
        }

        // Declaring postgres engine
        let auroraEngine = rds.DatabaseClusterEngine.auroraPostgres({
            version: rds.AuroraPostgresEngineVersion.VER_14_6,
        });

        if (props.engine == 'mysql') {
            auroraEngine = rds.DatabaseClusterEngine.auroraMysql({
                version: rds.AuroraMysqlEngineVersion.VER_3_03_0,
            });
        }

        let auroraParameters: any = {};
        // If PostgreSQL, enable Babelfish
        if (props.enableBabelfish && props.engine == 'postgresql') {
            auroraParameters['rds.babelfish_status'] = 'on';
        }

        // aurora params
        const auroraParameterGroup = new rds.ParameterGroup(
            this,
            'DatabaseParameterGroup',
            {
                engine: auroraEngine,
                description: id + ' Parameter Group',
                parameters: auroraParameters,
            },
        );

        const auroraClusterUsername = props.auroraClusterUsername  ?? "username" 
        const auroraClusterSecret = new secretsmanager.Secret(
            this,
            'DatabaseClusterCredentials',
            {
                secretName: props.dbName + 'DatabaseCredentials',
                description: props.dbName + 'DatabaseCrendetials',
                generateSecretString: {
                    excludeCharacters: "\"@/\\ '",
                    generateStringKey: 'password',
                    passwordLength: 30,
                    secretStringTemplate: `{"username": "${auroraClusterUsername}"}`,
                },
            },
        );

        // aurora credentials
        const auroraClusterCrendentials = rds.Credentials.fromSecret(
            auroraClusterSecret,
            props.auroraClusterUsername,
        );

        if (instanceType == null || instanceType == undefined) {
            instanceType = ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE4_GRAVITON,
                ec2.InstanceSize.MEDIUM,
            );
        }

        // Aurora DB Storage Encryption Key
        const kmsKey = new kms.Key(this, 'DatabaseStorageEncryptionKey', {
            enableKeyRotation: true,
            alias: props.dbName+'DatabaseStorageEncryptionKey',
        });

        let cloudwatchLogsExports: any = ['postgresql'];
        if (props.engine == 'mysql') {
            cloudwatchLogsExports = ['slowquery'];
        }

        const aurora_cluster = new rds.DatabaseCluster(this, 'MyDatabase', {
            engine: auroraEngine,
            credentials: auroraClusterCrendentials,
            backup: {
                preferredWindow: props.backupWindow,
                retention: Duration.days(backupRetentionDays),
            },
            parameterGroup: auroraParameterGroup,
            instances: replicaInstances,
            iamAuthentication: true,
            storageEncrypted: true,
            storageEncryptionKey: kmsKey,
            deletionProtection: true,
            removalPolicy: RemovalPolicy.SNAPSHOT,
            copyTagsToSnapshot: true,
            cloudwatchLogsExports: cloudwatchLogsExports,
            cloudwatchLogsRetention: logs.RetentionDays.ONE_MONTH,
            preferredMaintenanceWindow: props.preferredMaintenanceWindow,
            instanceIdentifierBase: props.dbName,
            instanceProps: {
                instanceType: props.instanceType,
                vpcSubnets: vpcSubnets,
                vpc: vpc,
                securityGroups: [dbsg],
            },
        });

        aurora_cluster.applyRemovalPolicy(RemovalPolicy.RETAIN);

        Tags.of(aurora_cluster).add('Name', props.dbName!, {
            priority: 300,
        });

        aurora_cluster.addRotationSingleUser({
            automaticallyAfter: Duration.days(30),
            excludeCharacters: "\"@/\\ '",
            vpcSubnets: vpcSubnets,
        });

        /*
         * CloudWatch Dashboard
         */

        const dashboard = new cloudwatch.Dashboard(this, 'DatabaseMonitoringDashboard', {
            dashboardName: props.dbName,
        });

        let dbConnections = aurora_cluster.metricDatabaseConnections();
        let cpuUtilization = aurora_cluster.metricCPUUtilization();
        let deadlocks = aurora_cluster.metricDeadlocks();
        let freeLocalStorage = aurora_cluster.metricFreeLocalStorage();
        let freeableMemory = aurora_cluster.metricFreeableMemory();
        let networkRecieveThroughput = aurora_cluster.metricNetworkReceiveThroughput();
        let networkThroughput = aurora_cluster.metricNetworkThroughput();
        let networkTransmitThroughput = aurora_cluster.metricNetworkTransmitThroughput();
        let snapshotStorageUsed = aurora_cluster.metricSnapshotStorageUsed();
        let totalBackupStorageBilled = aurora_cluster.metricTotalBackupStorageBilled();
        let volumeBytesUsed = aurora_cluster.metricVolumeBytesUsed();
        let volumeReadIoPs = aurora_cluster.metricVolumeReadIOPs();
        let volumeWriteIoPs = aurora_cluster.metricVolumeWriteIOPs();


        //  The average amount of time taken per disk I/O operation (average over 1 minute)
        const readLatency = aurora_cluster.metric('ReadLatency', {
            statistic: 'Average',
            period: Duration.seconds(60),
        });

        const widgetDbConnections = new cloudwatch.GraphWidget({
            title: 'DB Connections',
            // Metrics to display on left Y axis.
            left: [dbConnections],
        });

        const widgetCpuUtilizaton = new cloudwatch.GraphWidget({
            title: 'CPU Utilization',
            // Metrics to display on left Y axis
            left: [cpuUtilization],
        });

        const widgetReadLatency = new cloudwatch.GraphWidget({
            title: 'Read Latency',
            //  Metrics to display on left Y axis.
            left: [readLatency],
        });

        freeLocalStorage = aurora_cluster.metricFreeLocalStorage();
        freeableMemory = aurora_cluster.metricFreeableMemory();
        networkRecieveThroughput = aurora_cluster.metricNetworkReceiveThroughput();
        networkThroughput = aurora_cluster.metricNetworkThroughput();
        networkTransmitThroughput = aurora_cluster.metricNetworkTransmitThroughput();
        snapshotStorageUsed = aurora_cluster.metricSnapshotStorageUsed();
        totalBackupStorageBilled = aurora_cluster.metricTotalBackupStorageBilled();
        volumeBytesUsed = aurora_cluster.metricVolumeBytesUsed();
        volumeReadIoPs = aurora_cluster.metricVolumeReadIOPs();
        volumeWriteIoPs = aurora_cluster.metricVolumeWriteIOPs();

        const widgetDeadlocks = new cloudwatch.GraphWidget({
            title: 'Deadlocks',
            left: [deadlocks],
        });

        const widgetFreeLocalStorage = new cloudwatch.GraphWidget({
            title: 'Free Local Storage',
            left: [freeLocalStorage],
        });

        const widgetFreeableMemory = new cloudwatch.GraphWidget({
            title: 'Freeable Memory',
            left: [freeableMemory],
        });

        const widget_network_receive_throughput = new cloudwatch.GraphWidget({
            title: 'Network Throuput',
            left: [networkRecieveThroughput, networkThroughput, networkTransmitThroughput],

        });

        const widgetTotalBackupStorageBilled = new cloudwatch.GraphWidget({
            title: 'Backup Storage Billed',
            left: [totalBackupStorageBilled],
        });

        const widgetVolumeBytes = new cloudwatch.GraphWidget({
            title: 'Storage',
            left: [volumeBytesUsed, snapshotStorageUsed],
        });

        const widgetVolumeIops = new cloudwatch.GraphWidget({
            title: 'Volume IOPs',
            left: [volumeReadIoPs, volumeWriteIoPs],
        });


        dashboard.addWidgets(
            widgetDbConnections,
            widgetCpuUtilizaton
        );
        dashboard.addWidgets(
            widgetTotalBackupStorageBilled,
            widgetFreeLocalStorage
        );
        dashboard.addWidgets(
            widgetFreeableMemory,
            widgetVolumeBytes,
            widgetVolumeIops,
        );
        dashboard.addWidgets(
            widget_network_receive_throughput,
            widgetReadLatency,
            widgetDeadlocks,
        );

        new CfnOutput(this, 'OutputSecretName', {
            exportName: aurora_cluster.stack.stackName + ':SecretName',
            value: aurora_cluster.secret?.secretArn!,
        });

        new CfnOutput(this, 'OutputSecretArn', {
            exportName: aurora_cluster.stack.stackName + ':SecretArn',
            value: aurora_cluster.secret?.secretArn!,
        });


        new CfnOutput(this, 'OutputGetSecretValue', {
            exportName: aurora_cluster.stack.stackName + ':GetSecretValue',
            value: 'aws secretsmanager get-secret-value --secret-id ' + aurora_cluster.secret?.secretArn,
        });


        new CfnOutput(this, 'OutputInstanceIdentifiers', {
            exportName: aurora_cluster.stack.stackName + 'InstanceIdentifiers',
            value: aurora_cluster.instanceIdentifiers.toString(),
        });

        const instance_endpoints: any = [];

        for (let ie of aurora_cluster.instanceEndpoints) {
            instance_endpoints.push(ie.hostname);
        }
        new CfnOutput(this, 'OutputEndpoints', {
            exportName: aurora_cluster.stack.stackName + ':Endpoints',
            value: instance_endpoints.toString(),
        });

        new CfnOutput(this, 'OutputClusterEndpoint', {
            exportName: aurora_cluster.stack.stackName + ':Endpoint',
            value: aurora_cluster.clusterEndpoint.socketAddress,
        });


        // Outputs Cluster Engine
        new CfnOutput(this, 'OutputEngineFamily', {
            exportName: aurora_cluster.stack.stackName + ':EngineFamily',
            value: aurora_cluster.engine?.engineFamily!,
        });

        new CfnOutput(this, 'OutputEngineType', {
            exportName: aurora_cluster.stack.stackName + ':EngineType',
            value: aurora_cluster.engine?.engineType!,
        });

        new CfnOutput(this, 'OutputEngineFullVersion', {
            exportName: aurora_cluster.stack.stackName + ':EngineFullVersion',
            value: aurora_cluster.engine?.engineVersion?.fullVersion!,
        });

        new CfnOutput(this, 'OutputEngineMajorVersion', {
            exportName: aurora_cluster.stack.stackName + ':EngineMajorVersion',
            value: aurora_cluster.engine?.engineVersion?.majorVersion!,
        });

        new CfnOutput(this, 'OutputParameterGroupFamily', {
            exportName: aurora_cluster.stack.stackName + ':ParameterGroupFamily',
            value: aurora_cluster.engine?.parameterGroupFamily!,
        });

    }

}
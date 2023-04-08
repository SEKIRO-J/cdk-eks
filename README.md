# CDK for eks cluster deployed in isolate subnet

# Reference/Base template
https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/eks/cluster

# Prerequisites
1. setup aws credentials

```
./bin/setup.sh
```

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

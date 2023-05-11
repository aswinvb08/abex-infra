import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Construct } from 'constructs';

export class AbexInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // WHAT IS VPC?
    // A Virtual Private Cloud (VPC) is a virtual network dedicated to an AWS account.
    // It allows users to launch AWS resources,
    // such as Amazon EC2 instances,
    // within a virtual network that is isolated
    // from other virtual networks in the same account.
    // A VPC is similar to a traditional network
    // that you would operate in your own data center,
    // with the benefits of using scalable infrastructure of AWS.

    // In a VPC, you can define your own IP address range,
    // create subnets, configure route tables, and network gateways.
    // This gives you complete control over your virtual network environment,
    // allowing you to create a secure and scalable infrastructure for your applications.
    
    // Define the VPC and subnets
    const vpc = new ec2.Vpc(this, 'FlagrVpc', {
      maxAzs: 2, // Use 2 Availability Zones for high availability
    });


    // WHAT IS SECURITY GROUP?
    // In Amazon Web Services (AWS),
    // a Security Group is a virtual firewall
    // that controls inbound and outbound traffic
    // for Amazon Elastic Compute Cloud (EC2) instances.
    // It acts as a barrier between the internet and
    // your virtual private cloud (VPC) instances,
    // allowing you to specify the protocols, ports,
    // and source IP ranges that are allowed to reach your instances, and vice versa.

    // You can think of a Security Group
    // as a set of firewall rules that define
    // what kind of traffic is allowed in
    // and out of a set of instances in a VPC.
    // Security Groups are stateful,
    // which means that they keep track of
    // the state of the traffic flowing through them
    // and automatically allow the return traffic
    // for inbound requests that have been allowed.

    // Define the security group for the EC2 instances
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      vpc,
      allowAllOutbound: true, // Allow all outbound traffic
    });

    // Define the security group for the Flagr server
    const flagrSecurityGroup = new ec2.SecurityGroup(this, 'FlagrSecurityGroup', {
      vpc,
      allowAllOutbound: true, // Allow all outbound traffic
    });


    // In Amazon Web Services (AWS),
    // a security group acts as a virtual firewall
    // for an instance to control inbound and outbound traffic.
    // The addIngressRule method is used to
    // add a new inbound rule to the security group
    // that allows traffic to come in from a specified source.
    // The addEgressRule method is used to
    // add a new outbound rule to the security group
    // that allows traffic to go out to a specified destination.
    // These methods allow you to specify the type of traffic to be allowed,
    // the source or destination of the traffic,
    // and the protocol used for the traffic, among other parameters.
    // Allow inbound traffic to the EC2 instance from the Flagr security group
    ec2SecurityGroup.addIngressRule(flagrSecurityGroup, ec2.Port.tcp(22), 'Allow SSH access from Flagr');

    // Allow inbound traffic to the Flagr server from the internet
    flagrSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow incoming traffic to the Flagr server container',
    );


    // WHAT IS AN ECS CLUSTER?
    // Amazon Elastic Container Service (ECS)
    // is a fully-managed container orchestration service provided by AWS. 
    // An ECS cluster is a logical grouping of container instances 
    // that you can place tasks on. It is essentially a pool of 
    // resources that can be used to run containers. 
    // You can deploy your containerized applications
    // to an ECS cluster and let ECS manage the
    // scheduling, scaling, and availability of your containers.
    // It provides features such as load balancing, service discovery,
    // and automatic scaling to make it easier to
    // deploy and manage containerized applications.

    // Create an ECS cluster
    const ecsCluster = new ecs.Cluster(this, 'FlagrECSCluster', {
      vpc,
      clusterName: 'flagr-ecs-cluster',
    });

    // WHAT IS A TASK DEFINITION?
    // In Amazon Elastic Container Service (ECS),
    // a Task Definition is a text file in JSON or YAML format
    // that describes one or more containers (up to a maximum of ten)
    // that form your application.
    // It specifies details such as which Docker image to use,
    // how much CPU and memory to allocate to each container,
    // which ports to expose, and more. 
    // You can think of it as a blueprint for running your containers on ECS.

    // A Task Definition is required to run a containerized application on ECS.
    // Once you have created a Task Definition,
    // you can use it to create a Task,
    // which represents a running instance of your application. 
    // You can then create a Service that manages your Tasks,
    // ensuring that a specified number of Tasks are running at all times,
    // automatically replacing any failed Tasks, and more.

    // WHAT IS FARGATE?
    // AWS Fargate is a serverless compute engine
    // for containers that allows you to run Docker
    // containers without having to manage the underlying EC2 instances.
    // With Fargate, you no longer need to choose instance types, 
    // scale cluster capacity, or manage the lifecycle of individual EC2 instances. 
    // Instead, you can focus on developing and running your applications in containers. 
    // Fargate supports two launch types: Fargate and EC2.

    // In the context of running containers in AWS, 
    // Fargate launch type refers to running your containers 
    // on the Fargate platform without having 
    // to manage any underlying EC2 instances. 
    // With Fargate launch type, you can run containers 
    // without having to manage any infrastructure, 
    // and you only pay for the resources that your containers consume.  

    // Define the Task Definition for the Flagr server
    const flagrTaskDefinition = new ecs.TaskDefinition(this, 'FlagrTaskDef', {
      compatibility: ecs.Compatibility.FARGATE, // Use Fargate launch type for the task
      cpu: '512',
      memoryMiB: '1024',
    });


    // WHAT IS AN ECS SERVICE?
    // An ECS (Amazon Elastic Container Service) Service 
    // is a managed service that runs and maintains 
    // a specified number of instances of a task definition, 
    // ensuring that the desired number of tasks are running at any given time. 
    // A service also provides the ability to automatically deploy 
    // new versions of the task definition as they become available. 
    // It can be thought of as a higher-level abstraction over a task definition, 
    // providing features like load balancing and automatic scaling.
    
    // Create an ECS Service
    const ecsService = new ecs.FargateService(this, 'MyECSService', {
      cluster: ecsCluster,
      taskDefinition: flagrTaskDefinition,
      desiredCount: 1, // Run 1 instance of the container
    });

    

    // Add the Flagr security group to the ECS service's security groups
    ecsService.connections.allowFrom(flagrSecurityGroup, ec2.Port.tcp(80), 'Allow traffic from Flagr security group');

    const dbUserName = 'myuser'
    const dbPassword = 'mypassword'

    // Create a new RDS instance for the Flagr server's database
    const flagrDb = new rds.DatabaseInstance(this, 'FlagrDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_13_3,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      vpc: vpc, // Replace with your VPC created in Step 1
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      multiAz: true, // Enable multi-AZ deployment for high availability
      allocatedStorage: 20, // 20 GB storage
      storageType: rds.StorageType.GP2, // Use General Purpose SSD storage
      backupRetention: cdk.Duration.days(7), // Keep backups for 7 days
      autoMinorVersionUpgrade: true, // Enable automatic minor version upgrades
      deletionProtection: false, // Disable deletion protection
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Automatically delete the instance when the stack is deleted
      credentials: rds.Credentials.fromPassword(dbUserName, new cdk.SecretValue(dbPassword)), // Set the master username and password for the instance
    });

    // Allow incoming traffic to the database from the Flagr server's security group
    flagrDb.connections.allowDefaultPortFrom(flagrSecurityGroup);
  
    // Add a container to the Task Definition for the Flagr server
    const flagrContainer = flagrTaskDefinition.addContainer('FlagrContainer', {
      image: ecs.ContainerImage.fromRegistry('myflagrserver:latest'), // Replace with your Docker image name and tag
      environment: {
        DATABASE_HOST: flagrDb.instanceEndpoint.hostname, // Pass the database hostname to the container as an environment variable
        DATABASE_PORT: flagrDb.instanceEndpoint.port.toString(), // Pass the database port to the container as an environment variable
        DATABASE_NAME: 'mydatabase', // Replace with your database name
        DATABASE_USERNAME: dbUserName, // Replace with your database username
        DATABASE_PASSWORD: dbPassword, // Replace with your database password
      },
      portMappings: [
        {
          containerPort: 80, // Expose port 80 in the container
        },
      ],
    });

    // Set any necessary container settings for the Flagr server
    flagrContainer.addPortMappings({
      containerPort: 80, // Map the container port to port 80
    });

    // Define any necessary volume mounts for the container
    flagrContainer.addMountPoints({
      containerPath: '/var/lib/flagr',
      sourceVolume: 'flagr-data',
      readOnly: false
    });

    // Create a volume for the container to use
    flagrTaskDefinition.addVolume({
      name: 'flagr-data',
      host: {
        sourcePath: '/mnt/efs/flagr-data', // Use an EFS mount point for the volume
      },
    });

    // WHAT is ApplicationLoadBalancedFargateService?
    // ApplicationLoadBalancedFargateService is a construct 
    // provided by the AWS Cloud Development Kit (CDK) 
    // that deploys an Amazon ECS service using 
    // AWS Fargate and configures an Application Load Balancer 
    // to distribute traffic to the tasks in the service. 
    // It is a high-level construct that makes it easier to
    // deploy a scalable and highly available web application.

    // This construct combines several other constructs in the CDK, 
    // including ApplicationLoadBalancer, AutoScalingGroup, Cluster, 
    // TaskDefinition, and FargateService. 
    // It configures an Application Load Balancer 
    // with a target group that forwards traffic to a group of 
    // Fargate tasks running in an ECS cluster. 
    // It also sets up auto-scaling for the Fargate tasks based on CPU usage.

    // By using the ApplicationLoadBalancedFargateService construct, 
    // you can deploy a highly available web application 
    // that can scale automatically in response to changes in demand.

    // Create a new ECS Fargate service for the Flagr server
    const flagrService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'FlagrService', {
      cluster: ecsCluster,
      taskDefinition: flagrTaskDefinition,
      desiredCount: 1, // Run a single instance of the task
      publicLoadBalancer: true, // Use a public-facing ALB for the service
      serviceName: 'flagrserver', // Replace with your service name
    });

    // Allow incoming traffic to the Flagr server from the internet
    flagrService.service.connections.allowFromAnyIpv4(ec2.Port.tcp(80));

    // Get the Flagr server container
    const flagrContainerEl = flagrTaskDefinition.defaultContainer;

    // Configure the Flagr server to use the RDS instance as its database
    flagrContainerEl?.addEnvironment('DB_HOST', flagrDb.dbInstanceEndpointAddress);
    flagrContainerEl?.addEnvironment('DB_PORT', flagrDb.dbInstanceEndpointPort.toString());
    flagrContainerEl?.addEnvironment('DB_USERNAME', dbUserName);
    flagrContainerEl?.addEnvironment('DB_PASSWORD', dbPassword);
  }
}

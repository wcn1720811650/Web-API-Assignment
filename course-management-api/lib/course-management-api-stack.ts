import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import * as apig from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { courses, enrollments } from "../seed/courses";

export class CourseManagementApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Tables
    const coursesTable = new dynamodb.Table(this, "CoursesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "departmentId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "courseId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Courses",
    });

    const enrollmentsTable = new dynamodb.Table(this, "EnrollmentsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "courseId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "studentId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Enrollments",
    });

    // Functions
    const getCourseByIdFn = new lambdanode.NodejsFunction(this, "GetCourseByIdFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getCourseById.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: coursesTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const getAllCoursesFn = new lambdanode.NodejsFunction(this, "GetAllCoursesFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getAllCourses.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: coursesTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const addCourseFn = new lambdanode.NodejsFunction(this, "AddCourseFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/addCourse.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: coursesTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const translateCourseFn = new lambdanode.NodejsFunction(this, "TranslateCourseFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/translateCourse.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: coursesTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    // Initialize DynamoDB data
    new custom.AwsCustomResource(this, "coursesddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [coursesTable.tableName]: generateBatch(courses),
            [enrollmentsTable.tableName]: generateBatch(enrollments),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("coursesddbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [coursesTable.tableArn, enrollmentsTable.tableArn],
      }),
    });

    
    // Permissions
    coursesTable.grantReadData(getCourseByIdFn);
    coursesTable.grantReadData(getAllCoursesFn);
    coursesTable.grantReadWriteData(addCourseFn);
    coursesTable.grantReadWriteData(translateCourseFn);

    // API Gateway
    const api = new apig.RestApi(this, "CourseApi", {
      restApiName: "Course Management API",
      description: "Course Management API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date", "x-api-key"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // API Endpoints
    const coursesEndpoint = api.root.addResource("courses");
    coursesEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllCoursesFn, { proxy: true })
    );
    
    coursesEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(addCourseFn, { proxy: true }),
      {
        apiKeyRequired: true
      }
    );

    const courseEndpoint = coursesEndpoint.addResource("{departmentId}");
    courseEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getCourseByIdFn, { proxy: true })
    );

    const translationEndpoint = courseEndpoint.addResource("translation");
    translationEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(translateCourseFn, { proxy: true })
    );

    // API Key and Usage Plan
    const apiKey = new apig.ApiKey(this, "CourseApiKey");
    const plan = new apig.UsagePlan(this, "UsagePlan", {
      name: "Standard",
    });
    
    plan.addApiKey(apiKey);
    plan.addApiStage({
      stage: api.deploymentStage,
      api,
    });
  }
}

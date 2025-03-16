import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
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
    const translationsTable = new dynamodb.Table(this, "TranslationsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "originalText", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "targetLanguage", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Translations",
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
        COURSES_TABLE: coursesTable.tableName,
        TRANSLATIONS_TABLE: translationsTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    translateCourseFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['translate:TranslateText'],
        resources: ['*'],
      })
    );

    const deleteCourseFn = new lambdanode.NodejsFunction(this, "DeleteCourseFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/deleteCourse.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: coursesTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const updateCourseFn = new lambdanode.NodejsFunction(this, "UpdateCourseFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/updateCourse.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: coursesTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const getEnrollmentsFn = new lambdanode.NodejsFunction(this, "GetEnrollmentsFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getEnrollments.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: enrollmentsTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const addEnrollmentFn = new lambdanode.NodejsFunction(this, "AddEnrollmentFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/addEnrollment.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: enrollmentsTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    const deleteEnrollmentFn = new lambdanode.NodejsFunction(this, "DeleteEnrollmentFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/deleteEnrollment.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: enrollmentsTable.tableName,
        REGION: 'eu-west-1',
      },
    });

    

    // Initialize DynamoDB data
    console.log('Raw courses data:', courses);
    console.log('Raw enrollments data:', enrollments);

    const checkDataFormat = (data: any[], expectedKeys: string[]) => {
      return data.every(item => 
        expectedKeys.every(key => key in item)
      );
    };

    const coursesExpectedKeys = ['departmentId', 'courseId', 'title', 'description', 'credits', 'isActive'];
    const enrollmentsExpectedKeys = ['courseId', 'studentId', 'enrollmentDate', 'status'];

    if (!checkDataFormat(courses, coursesExpectedKeys)) {
      console.error('Courses data format is incorrect:', courses);
    }

    if (!checkDataFormat(enrollments, enrollmentsExpectedKeys)) {
      console.error('Enrollments data format is incorrect:', enrollments);
    }

    const validateBatch = (batch: any[], partitionKey: string, sortKey?: string) => {
      if (!Array.isArray(batch) || batch.length === 0) {
        console.warn('Batch is not an array or is empty:', batch);
        return [];
      }
      
      try {
        return batch.filter(item => 
          item && 
          item.PutRequest && 
          item.PutRequest.Item && 
          item.PutRequest.Item[partitionKey] &&
          (!sortKey || item.PutRequest.Item[sortKey])  
        );
      } catch (error) {
        console.error('Error validating batch:', error);
        return [];
      }
    };

    const createBatchItems = (items: any[], requiredFields: string[]) => {
      if (!Array.isArray(items) || items.length === 0) {
        console.warn('Empty or invalid items array:', items);
        return [];
      }
      
      console.log('Creating batch items from:', JSON.stringify(items, null, 2));
      
      return items.map((item, index) => {
        const missingFields = requiredFields.filter(field => !item[field]);
        if (missingFields.length > 0) {
          console.error(`Missing required fields [${missingFields.join(', ')}] in item ${index}:`, item);
          return null;
        }
        
        try {
          return {
            PutRequest: {
              Item: Object.fromEntries(
                Object.entries(item).map(([key, value]) => [
                  key,
                  (() => {
                    switch (typeof value) {
                      case 'string': return { S: value };
                      case 'number': return { N: value.toString() };
                      case 'boolean': return { BOOL: value };
                      default:
                        console.error(`Unsupported type for ${key} in item ${index}:`, typeof value);
                        return { NULL: true };
                    }
                  })()
                ])
              )
            }
          };
        } catch (error) {
          console.error(`Type conversion error in item ${index}:`, error);
          return null;
        }
      }).filter(item => item !== null);
    };

    const coursesBatch = validateBatch(
      createBatchItems(courses, ['departmentId', 'courseId']), 
      "departmentId", 
      "courseId"
    );
    
    const enrollmentsBatch = validateBatch(
      createBatchItems(enrollments, ['courseId', 'studentId']),
      "courseId", 
      "studentId"
    );

    if (coursesBatch.length === 0) {
      console.error('No valid courses batch generated');
    }
    if (enrollmentsBatch.length === 0) {
      console.error('No valid enrollments batch generated');
    }

    if (coursesBatch.length > 0 || enrollmentsBatch.length > 0) {
      const requestItems: Record<string, any[]> = {};
      
      if (coursesBatch.length > 0) {
        requestItems[coursesTable.tableName] = coursesBatch;
      }
      
      if (enrollmentsBatch.length > 0) {
        requestItems[enrollmentsTable.tableName] = enrollmentsBatch;
      }
      
      new custom.AwsCustomResource(this, "coursesddbInitData", {
        onCreate: {
          service: "DynamoDB",
          action: "batchWriteItem",
          parameters: {
            RequestItems: requestItems
          },
          physicalResourceId: custom.PhysicalResourceId.of("coursesddbInitData"),
        },
        policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [coursesTable.tableArn, enrollmentsTable.tableArn],
        })
      });
    }
    
    
    // Permissions
    coursesTable.grantReadData(getCourseByIdFn);
    coursesTable.grantReadData(getAllCoursesFn);
    coursesTable.grantReadWriteData(addCourseFn);
    coursesTable.grantReadWriteData(translateCourseFn);
    coursesTable.grantWriteData(deleteCourseFn);
    coursesTable.grantReadWriteData(updateCourseFn);
    enrollmentsTable.grantReadData(getEnrollmentsFn);
    enrollmentsTable.grantWriteData(addEnrollmentFn);
    enrollmentsTable.grantWriteData(deleteEnrollmentFn);
    translationsTable.grantReadWriteData(translateCourseFn);

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

    courseEndpoint.addMethod(
      "DELETE",
      new apig.LambdaIntegration(deleteCourseFn, { proxy: true }),
      {
        apiKeyRequired: true
      }
    );
    courseEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(updateCourseFn, { proxy: true }),
      {
        apiKeyRequired: true
      }
    );

    const enrollmentsEndpoint = courseEndpoint.addResource("enrollments");
    enrollmentsEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getEnrollmentsFn, { proxy: true })
    );

    enrollmentsEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(addEnrollmentFn, { proxy: true }),
      {
        apiKeyRequired: true
      }
    );

    enrollmentsEndpoint.addMethod(
      "DELETE",
      new apig.LambdaIntegration(deleteEnrollmentFn, { proxy: true }),
      {
        apiKeyRequired: true
      }
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

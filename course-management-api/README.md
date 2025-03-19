## Serverless REST Assignment - Distributed Systems.

__Name:__ Zixin Wang

__Demo:__ ... [link to your YouTube video demonstration](https://youtu.be/UqOpn7sCQ2I) ......

### Context.

State the context you chose for your web API and detail the attributes of the DynamoDB table items, e.g.

Context: Courses Management

Table item attributes:
+ departmentId - string  
+ courseId - string  
+ title - string
+ description - string
+ credits - number
+ isActive - boolean
+ studentId - string
+ enrollmentDate - date
+ status - string


### App API endpoints.

[ Provide a bullet-point list of the app's endpoints (excluding the Auth API) you have successfully implemented. ]
+ GET https://ID.execute-api.eu-west-1.amazonaws.com/dev/courses - get all the courses.
+ DELETE https://ID.execute-api.eu-west-1.amazonaws.com/dev/courses/CS/CS101 - delete the specified course
need api-key
+ POST https://ID.execute-api.eu-west-1.amazonaws.com/dev/courses - add a new course
e.g.
{
    "departmentId": "MATH",
    "courseId": "CS103",
    "title": "Introduction to Programming", 
    "description": "A beginner's guide to computer programming",
    "credits": 6,
    "isActive": true
  }

+ PUT https://ID.execute-api.eu-west-1.amazonaws.com/dev/courses/CS/CS101 - update the specified course
need api-key

enrollments
+ POST https://ID.execute-api.eu-west-1.amazonaws.com/dev/courses/CS101/enrollments - add a new enrollment.
need api-key
e.g.
{
  "studentId": "ST999",
  "enrollmentDate": "2024-01-01",
  "status": "active"
}

+ GET https://ID.execute-api.eu-west-1.amazonaws.com/dev/courses/CS101/enrollments - get the specific course's enrollment

Translation
+ GET https://ID.execute-api.eu-west-1.amazonaws.com/dev/courses/CS/CS101/translation?targetLanguage=zh - translate the information into Chinese

### Features.

#### Translation persistence (if completed)

[ Explain briefly your solution to the translation persistence requirement - no code excerpts required. Show the structure of a table item that includes review translations, e.g.

+ originalText - string  (Partition key)
+ targetLanguage - string  (Sort Key)
+ translatedText - string
+ timestamp - string (ISO Timestamp)
]

#### Custom L2 Construct (if completed)

[State briefly the infrastructure provisioned by your custom L2 construct. Show the structure of its input props object and list the public properties it exposes, e.g. taken from the Cognito lab,

Construct Input props object:
~~~
type AuthApiProps = {
 userPoolId: string;
 userPoolClientId: string;
}
~~~
Construct public properties
~~~
export class MyConstruct extends Construct {
 public  PropertyName: type
 etc.
~~~
 ]

#### Multi-Stack app (if completed)

[Explain briefly the stack composition of your app - no code excerpts required.]

#### Lambda Layers (if completed)

[Explain briefly where you used the Layers feature of the AWS Lambda service - no code excerpts required.]


#### API Keys. (if completed)

[Explain briefly how to implement API key authentication to protect API Gateway endpoints. Include code excerpts from your app to support this. ][]

The AWS CDK L2 structure implements automatic configuration of key authentication, and all sensitive operations (POST/DELETE/PUT) are required to carry a valid API key header.
~~~js
// This is a code excerpt markdown 
const apiKey = new apig.ApiKey(this, "CourseApiKey", {
  description: "Course management API access key",
});
const plan = new apig.UsagePlan(this, "UsagePlan", {
  name: "StandardPlan",
  throttle: {
    rateLimit: 100,
    burstLimit: 20
  }
});
plan.addApiKey(apiKey);
plan.addApiStage({
  stage: api.deploymentStage,
  api,
});
coursesEndpoint.addMethod("POST", new apig.LambdaIntegration(addCourseFn), {
  apiKeyRequired: true 
});
courseEndpoint.addMethod("DELETE", new apig.LambdaIntegration(deleteCourseFn), {
  apiKeyRequired: true, 
  requestParameters: {
    'method.request.path.departmentId': true
  }
});
~~~

###  Extra (If relevant).

[ State any other aspects of your solution that use CDK/serverless features not covered in the lectures ]
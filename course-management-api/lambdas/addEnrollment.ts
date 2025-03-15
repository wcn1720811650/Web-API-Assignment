import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";

const dynamodb = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const courseId = event.pathParameters?.courseId;
    const requestBody = JSON.parse(event.body || "");

    if (!courseId || !requestBody.studentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters" }),
      };
    }

    const params = {
      TableName: TABLE_NAME,
      Item: {
        courseId: courseId,
        studentId: requestBody.studentId,
        enrollmentDate: new Date().toISOString(),
        status: requestBody.status || "active",
      },
      ConditionExpression: "attribute_not_exists(courseId) AND attribute_not_exists(studentId)",
    };

    await dynamodb.put(params).promise();

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(params.Item),
    };
  } catch (error: any) {
    if (error.code === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Student already enrolled in this course" }),
      };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not create enrollment" }),
    };
  }
};
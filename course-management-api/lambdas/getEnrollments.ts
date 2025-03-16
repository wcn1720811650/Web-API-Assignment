import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";

const dynamodb = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "";

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const courseId = event.pathParameters?.departmentId;
    
    if (!courseId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Course ID is required" }),
      };
    }

    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "courseId = :courseId",
      ExpressionAttributeValues: {
        ":courseId": courseId,
      },
    };

    const result = await dynamodb.query(params).promise();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not retrieve enrollments" }),
    };
  }
};
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";

const dynamodb = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const requestBody = JSON.parse(event.body || "");

    if (!requestBody.departmentId || !requestBody.courseId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const params = {
      TableName: TABLE_NAME,
      Item: {
        departmentId: requestBody.departmentId,
        courseId: requestBody.courseId,
        name: requestBody.name,
        description: requestBody.description,
        credits: requestBody.credits,
        isActive: requestBody.isActive || true,
        createdAt: new Date().toISOString(),
      },
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
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not create course" }),
    };
  }
};
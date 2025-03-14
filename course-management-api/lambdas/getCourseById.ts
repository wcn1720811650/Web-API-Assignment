import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";

const dynamodb = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const departmentId = event.pathParameters?.departmentId;
    const courseId = event.queryStringParameters?.courseId;

    if (!departmentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing departmentId parameter" }),
      };
    }

    const params: DynamoDB.DocumentClient.QueryInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "departmentId = :departmentId",
      ExpressionAttributeValues: {
        ":departmentId": departmentId,
      },
    };

    if (courseId) {
      params.KeyConditionExpression += " and courseId = :courseId";
      (params.ExpressionAttributeValues as Record<string, any>)[":courseId"] = courseId;
    }

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
      body: JSON.stringify({ error: "Could not retrieve course" }),
    };
  }
};
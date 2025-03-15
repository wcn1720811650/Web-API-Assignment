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
    const requestBody = JSON.parse(event.body || "{}");

    if (!departmentId || !courseId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters" }),
      };
    }

    let updateExpression = "set";
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    Object.keys(requestBody).forEach((key) => {
      if (key !== "departmentId" && key !== "courseId") {
        updateExpression += ` #${key} = :${key},`;
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = requestBody[key];
      }
    });

    updateExpression = updateExpression.slice(0, -1);

    const params = {
      TableName: TABLE_NAME,
      Key: {
        departmentId: departmentId,
        courseId: courseId,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamodb.update(params).promise();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(result.Attributes),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not update course" }),
    };
  }
};
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { Translate } from "@aws-sdk/client-translate";

const dynamodb = new DynamoDB.DocumentClient();
const translate = new Translate({ region: process.env.REGION });
const TABLE_NAME = process.env.TABLE_NAME || "";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const departmentId = event.pathParameters?.departmentId;
    const courseId = event.queryStringParameters?.courseId;
    const targetLanguage = event.queryStringParameters?.language || 'fr';

    if (!departmentId || !courseId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters" }),
      };
    }

    // Try to get cached translations first
    const params = {
      TableName: TABLE_NAME,
      Key: {
        departmentId: departmentId,
        courseId: courseId,
      },
    };

    const result = await dynamodb.get(params).promise();
    const course = result.Item;

    if (!course) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Course not found" }),
      };
    }

    // Check if there is already a cached translation
    const cacheKey = `translation_${targetLanguage}`;
    if (course[cacheKey]) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          ...course,
          description: course[cacheKey],
          translated: true,
          fromCache: true,
        }),
      };
    }

    const translateParams = {
      Text: course.description,
      SourceLanguageCode: "en",
      TargetLanguageCode: targetLanguage,
    };

    const translationResult = await translate.translateText(translateParams);

    const updateParams = {
      TableName: TABLE_NAME,
      Key: {
        departmentId: departmentId,
        courseId: courseId,
      },
      UpdateExpression: `set ${cacheKey} = :translation`,
      ExpressionAttributeValues: {
        ":translation": translationResult.TranslatedText,
      },
    };

    await dynamodb.update(updateParams).promise();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        ...course,
        description: translationResult.TranslatedText,
        translated: true,
        fromCache: false,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Translation failed" }),
    };
  }
};
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB, Translate } from "aws-sdk";

const dynamodb = new DynamoDB.DocumentClient();
const translate = new Translate();
const COURSES_TABLE = process.env.COURSES_TABLE || "";
const TRANSLATIONS_TABLE = process.env.TRANSLATIONS_TABLE || "";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const departmentId = event.pathParameters?.departmentId;
    const courseId = event.queryStringParameters?.courseId;
    const targetLanguage = event.queryStringParameters?.language || "zh";

    if (!departmentId || !courseId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters" }),
      };
    }

    const courseParams = {
      TableName: COURSES_TABLE,
      Key: {
        departmentId: departmentId,
        courseId: courseId,
      },
    };

    const courseResult = await dynamodb.get(courseParams).promise();
    const course = courseResult.Item;

    if (!course) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Course not found" }),
      };
    }

    const fieldsToTranslate = ["title", "description"];
    const translatedCourse = { ...course };

    for (const field of fieldsToTranslate) {
      if (course[field]) {
        const originalText = course[field];
        
        const cacheParams = {
          TableName: TRANSLATIONS_TABLE,
          Key: {
            originalText: originalText,
            targetLanguage: targetLanguage,
          },
        };
        
        const cacheResult = await dynamodb.get(cacheParams).promise();
        
        if (cacheResult.Item) {
          translatedCourse[field] = cacheResult.Item.translatedText;
        } else {
          const translateParams = {
            Text: originalText,
            SourceLanguageCode: "en",
            TargetLanguageCode: targetLanguage,
          };
          
          const translateResult = await translate.translateText(translateParams).promise();
          translatedCourse[field] = translateResult.TranslatedText;
          
          const putCacheParams = {
            TableName: TRANSLATIONS_TABLE,
            Item: {
              originalText: originalText,
              targetLanguage: targetLanguage,
              translatedText: translateResult.TranslatedText,
              timestamp: new Date().toISOString(),
            },
          };
          
          await dynamodb.put(putCacheParams).promise();
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(translatedCourse),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not translate course" }),
    };
  }
};
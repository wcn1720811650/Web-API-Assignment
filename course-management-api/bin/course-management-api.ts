#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CourseManagementApiStack } from '../lib/course-management-api-stack';

const app = new cdk.App();
new CourseManagementApiStack(app, "CourseManagementApiStack", { 
  env: { 
    region: "eu-west-1" 
  } 
});
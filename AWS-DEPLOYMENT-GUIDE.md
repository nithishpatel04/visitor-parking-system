# AWS Deployment Guide for Visitor Parking System

## Architecture Overview

```
┌─────────────────────────────────────┐
│   Users' Browsers (Any Device)      │
└────────────────────┬────────────────┘
                     │ HTTPS
                     ▼
         ┌───────────────────────┐
         │   AWS API Gateway     │
         │   (HTTP Endpoint)     │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   AWS Lambda          │
         │   (Node.js Handler)   │
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
┌─────────┐    ┌──────────┐    ┌───────────┐
│DynamoDB │    │DynamoDB  │    │DynamoDB   │
│Passes   │    │Sessions  │    │Exceptions │
└─────────┘    └──────────┘    └───────────┘
```

## Step-by-Step AWS Setup

### Phase 1: AWS Account & Credentials (5 minutes)

1. **Create AWS Account** (if you don't have one)
   - Go to aws.amazon.com
   - Click "Create an AWS Account"
   - Follow the setup wizard

2. **Create IAM User** for programmatic access
   - Go to AWS Console → IAM
   - Click "Users" → "Create user"
   - Username: `parking-app-user`
   - Check "Provide user access to the AWS Management Console" (optional)
   - Click "Next"

3. **Attach Permissions**
   - Click "Attach policies directly"
   - Search and select: `AmazonDynamoDBFullAccess`
   - Click "Next" → "Create user"

4. **Get Access Keys**
   - Click on the new user
   - Go to "Security Credentials" tab
   - Click "Create access key"
   - Select "Local code"
   - Copy the Access Key ID and Secret Access Key
   - **Save these securely!** You'll need them soon

### Phase 2: Create DynamoDB Tables (10 minutes)

1. **Go to DynamoDB Console**
   - AWS Console → DynamoDB

2. **Create Table: `parking-passes`**
   - Click "Create table"
   - Table name: `parking-passes`
   - Partition key: `id` (String)
   - Sort key: Leave empty
   - Billing: On-demand
   - Scroll down → "Create table"

3. **Create Table: `parking-sessions`**
   - Click "Create table"
   - Table name: `parking-sessions`
   - Partition key: `token` (String)
   - Sort key: Leave empty
   - Billing: On-demand
   - Scroll down → "Create table"
   - **Add TTL**: After table is created
     - Go to "Manage TTL"
     - Attribute name: `ttl`
     - Click "Enable"

4. **Create Table: `parking-exceptions`**
   - Click "Create table"
   - Table name: `parking-exceptions`
   - Partition key: `id` (String)
   - Sort key: Leave empty
   - Billing: On-demand
   - Scroll down → "Create table"
   - **Add TTL**: After table is created
     - Go to "Manage TTL"
     - Attribute name: `ttl`
     - Click "Enable"

### Phase 3: Deploy to AWS Lambda (15 minutes)

#### Option A: Using AWS Console (Easiest)

1. **Prepare Your Code**
   ```bash
   cd e:\visitor-parking-system
   npm install --prefix server
   ```

2. **Create Lambda Function**
   - AWS Console → Lambda
   - Click "Create function"
   - Function name: `parking-management-api`
   - Runtime: Node.js 18.x
   - Click "Create function"

3. **Upload Code**
   - In the Lambda console, scroll to "Code source"
   - Click "Upload from" → "Zip file"
   - Create a zip of your project:
     ```bash
     # On PowerShell
     Compress-Archive -Path "e:\visitor-parking-system\*" -DestinationPath "e:\parking-app.zip"
     ```
   - Upload the zip file

4. **Configure Handler**
   - In "Runtime settings"
   - Change Handler to: `server/server.js`

5. **Set Environment Variables**
   - Scroll to "Environment variables"
   - Add:
     ```
     AWS_REGION = us-east-1
     AWS_ACCESS_KEY_ID = [your key from IAM]
     AWS_SECRET_ACCESS_KEY = [your secret from IAM]
     DYNAMODB_PASSES_TABLE = parking-passes
     DYNAMODB_SESSIONS_TABLE = parking-sessions
     DYNAMODB_EXCEPTIONS_TABLE = parking-exceptions
     ```
   - Click "Save"

6. **Increase Timeout**
   - Scroll to "Basic settings"
   - Change Timeout to 30 seconds
   - Click "Save"

#### Option B: Using AWS CLI (Recommended)

```bash
# Install AWS CLI (if not already installed)
# https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# Configure AWS credentials
aws configure
# Enter your Access Key ID
# Enter your Secret Access Key
# Default region: us-east-1
# Output format: json

# Create Lambda function
aws lambda create-function `
  --function-name parking-management-api `
  --runtime nodejs18.x `
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-role `
  --handler server/server.js `
  --zip-file fileb://parking-app.zip `
  --timeout 30 `
  --memory-size 512 `
  --environment Variables={AWS_REGION=us-east-1,DYNAMODB_PASSES_TABLE=parking-passes,DYNAMODB_SESSIONS_TABLE=parking-sessions,DYNAMODB_EXCEPTIONS_TABLE=parking-exceptions}
```

### Phase 4: Set Up API Gateway (10 minutes)

1. **Create API Gateway**
   - AWS Console → API Gateway
   - Click "Create API"
   - Choose "REST API" → "Build"
   - API name: `parking-api`
   - Description: `Parking Management API`
   - Click "Create API"

2. **Create Resource**
   - Click on "/" (root resource)
   - Click "Create resource"
   - Resource name: `api`
   - Click "Create resource"

3. **Create Method**
   - Select `/api` resource
   - Click "Create method" → "ANY"
   - Integration type: "Lambda function"
   - Lambda function: `parking-management-api`
   - Click "Create method"

4. **Enable CORS**
   - Select `/api` resource
   - Click "Enable CORS"
   - Click "Enable CORS and replace existing CORS headers"

5. **Deploy API**
   - Click "Deploy API"
   - Stage name: `prod`
   - Click "Deploy"
   - **Copy the Invoke URL** - this is your public endpoint!

### Phase 5: Update Client Files (5 minutes)

1. **Open `client/js/api.js`**

2. **Replace localhost with your API Gateway URL**
   ```javascript
   // OLD:
   const BASE_URL = 'http://localhost:3000';

   // NEW:
   const BASE_URL = 'https://YOUR_API_GATEWAY_URL.execute-api.us-east-1.amazonaws.com/prod';
   ```

3. **Also update `client/js/auth.js`** if needed with the same BASE_URL

4. **Deploy client files** to S3 (optional, or serve from somewhere else)

### Phase 6: Test Your Deployment (5 minutes)

1. **Test Login**
   ```bash
   $url = "https://YOUR_API_GATEWAY_URL.execute-api.us-east-1.amazonaws.com/prod/api/auth/login"
   $body = @{ username = "concierge"; password = "1234" } | ConvertTo-Json
   Invoke-RestMethod -Method Post -Uri $url -Body $body -ContentType 'application/json'
   ```

2. **Test Pass Creation**
   ```bash
   # First get a token from login, then use it
   $token = "TOKEN_FROM_LOGIN"
   $url = "https://YOUR_API_GATEWAY_URL.execute-api.us-east-1.amazonaws.com/prod/api/passes"
   $body = @{
     building = "2 Sonic"
     unit = "101"
     resident = "Test User"
     plate = "TEST123"
     vehicle = "Car"
     color = "Black"
     duration = 1
     authorizedBy = "Admin"
   } | ConvertTo-Json
   
   Invoke-RestMethod -Method Post -Uri $url -Body $body -Headers @{"Authorization" = "Bearer $token"} -ContentType 'application/json'
   ```

## Troubleshooting

### Issue: "Cannot find module 'aws-sdk'"
**Solution**: Run `npm install` in the server directory before deploying

### Issue: "Access Denied" to DynamoDB
**Solution**: 
- Check IAM user has `AmazonDynamoDBFullAccess` policy
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are correct in Lambda environment variables

### Issue: "Table not found"
**Solution**:
- Verify DynamoDB table names match exactly in:
  - `.env` file
  - Lambda environment variables
  - DynamoDB console

### Issue: Lambda timeout
**Solution**: 
- Increase Lambda timeout to 60 seconds
- Check DynamoDB table is not being throttled

## Cost Estimation

- **Lambda**: ~$0.20/million requests (free tier: 1 million/month)
- **DynamoDB**: ~$1.25/month on-demand for low usage
- **API Gateway**: ~$3.50/million API calls (free tier: 1 million/month)
- **Total for small usage**: ~$0-5/month

## Resume Impact

✅ **On Your Resume**: 
> "Deployed serverless parking management system on AWS Lambda and DynamoDB, demonstrating cloud architecture design and serverless computing principles"

✅ **What You Learned**:
- AWS Lambda functions
- DynamoDB NoSQL database
- API Gateway for REST APIs
- IAM roles and permissions
- Environment variable management
- Cloud deployment workflows

## Next Steps

1. Test all features thoroughly
2. Monitor Lambda and DynamoDB metrics in AWS Console
3. Set up CloudWatch alarms for errors
4. Consider adding CloudFront for faster client delivery
5. Explore AWS Amplify for frontend hosting

## Support

For AWS documentation:
- Lambda: https://docs.aws.amazon.com/lambda/
- DynamoDB: https://docs.aws.amazon.com/dynamodb/
- API Gateway: https://docs.aws.amazon.com/apigateway/

Good luck! 🚀

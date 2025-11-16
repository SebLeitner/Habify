terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

locals {
  project_name    = "habify"
  app_domain_name = "${var.app_subdomain}.${var.root_domain}"
  pwa_domain_name = "app.${local.app_domain_name}"

  callback_urls = distinct([
    "https://${local.app_domain_name}/login",
    "https://${local.pwa_domain_name}/login",
    "http://localhost:5173/login",
    "http://127.0.0.1:5173/login",
    "http://localhost:4173/login",
  ])

  logout_urls = distinct([
    "https://${local.app_domain_name}/login",
    "https://${local.pwa_domain_name}/login",
    "http://localhost:5173/login",
    "http://127.0.0.1:5173/login",
    "http://localhost:4173/login",
  ])

  lambda_source_dir          = "${path.module}/../../lambda"
  lambda_package_output_path = "${path.module}/.terraform-artifacts/lambda.zip"
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = local.lambda_source_dir
  output_path = local.lambda_package_output_path
}

data "aws_route53_zone" "root" {
  name         = var.root_domain
  private_zone = false
}

resource "aws_acm_certificate" "app" {
  provider          = aws.us_east_1
  domain_name       = local.app_domain_name
  subject_alternative_names = [
    local.pwa_domain_name,
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "certificate_validation" {
  for_each = {
    for dvo in aws_acm_certificate.app.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = data.aws_route53_zone.root.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "app" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.app.arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

resource "aws_s3_bucket" "frontend" {
  bucket        = "${local.project_name}-${var.environment}-frontend"
  force_destroy = true

  tags = {
    Project     = local.project_name
    Environment = var.environment
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = ["s3:GetObject"]
        Resource = ["${aws_s3_bucket.frontend.arn}/*"]
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.project_name}-${var.environment}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  comment             = "Habify Frontend"
  default_root_object = "index.html"
  aliases             = [local.app_domain_name, local.pwa_domain_name]

  depends_on = [aws_acm_certificate_validation.app]

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "s3-frontend"

    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-frontend"

    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = aws_acm_certificate_validation.app.certificate_arn
    minimum_protocol_version       = "TLSv1.2_2021"
    ssl_support_method             = "sni-only"
  }

  tags = {
    Project     = local.project_name
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "activities" {
  name         = "${local.project_name}-${var.environment}-activities"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Project     = local.project_name
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "logs" {
  name         = "${local.project_name}-${var.environment}-logs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  range_key    = "timestamp"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  global_secondary_index {
    name            = "activityId-index"
    hash_key        = "activityId"
    projection_type = "ALL"
  }

  attribute {
    name = "activityId"
    type = "S"
  }

  tags = {
    Project     = local.project_name
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "highlights" {
  name         = "${local.project_name}-${var.environment}-highlights"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Project     = local.project_name
    Environment = var.environment
  }
}

resource "aws_iam_role" "lambda" {
  name = "${local.project_name}-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_dynamo" {
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Effect   = "Allow"
        Resource = [
          aws_dynamodb_table.activities.arn,
          aws_dynamodb_table.logs.arn,
          "${aws_dynamodb_table.logs.arn}/index/activityId-index",
          aws_dynamodb_table.highlights.arn,
        ]
      }
    ]
  })
}

resource "aws_lambda_function" "api" {
  function_name = "${local.project_name}-${var.environment}-api"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda.arn

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  environment {
    variables = {
      ACTIVITIES_TABLE = aws_dynamodb_table.activities.name
      LOGS_TABLE       = aws_dynamodb_table.logs.name
      HIGHLIGHTS_TABLE = aws_dynamodb_table.highlights.name
    }
  }
}

resource "aws_cognito_user_pool" "habify" {
  name = "${local.project_name}-${var.environment}-users"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = false
  }

  auto_verified_attributes = ["email"]

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  tags = {
    Project     = local.project_name
    Environment = var.environment
  }
}

resource "aws_cognito_user_pool_client" "habify" {
  name         = "${local.project_name}-${var.environment}-spa"
  user_pool_id = aws_cognito_user_pool.habify.id

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  callback_urls                        = local.callback_urls
  logout_urls                          = local.logout_urls
  supported_identity_providers         = ["COGNITO"]
}

resource "aws_cognito_user_pool_domain" "habify" {
  domain       = "${local.project_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.habify.id
}

resource "aws_apigatewayv2_api" "habify" {
  name          = "${local.project_name}-${var.environment}-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.habify.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

locals {
  routes = [
    "/activities/add",
    "/activities/list",
    "/activities/update",
    "/activities/delete",
    "/logs/add",
    "/logs/list",
    "/logs/update",
    "/logs/delete",
    "/highlights/add",
    "/highlights/list",
    "/highlights/update",
    "/highlights/delete",
    "/stats/today",
    "/stats/week",
    "/stats/month"
  ]
}

resource "aws_apigatewayv2_route" "api_routes" {
  for_each = toset(local.routes)

  api_id    = aws_apigatewayv2_api.habify.id
  route_key = "POST ${each.value}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "api_options_routes" {
  for_each = toset(local.routes)

  api_id    = aws_apigatewayv2_api.habify.id
  route_key = "OPTIONS ${each.value}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id = aws_apigatewayv2_api.habify.id
  name   = var.environment
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      integrationError = "$context.integrationErrorMessage"
    })
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/${local.project_name}-${var.environment}"
  retention_in_days = 14
}

resource "aws_lambda_permission" "api_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.habify.execution_arn}/*/*"
}

resource "aws_route53_record" "frontend" {
  zone_id = data.aws_route53_zone.root.zone_id
  name    = local.app_domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "pwa_frontend" {
  zone_id = data.aws_route53_zone.root.zone_id
  name    = local.pwa_domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

output "cloudfront_url" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "api_url" {
  value = aws_apigatewayv2_stage.prod.invoke_url
}

output "app_domain" {
  value = local.app_domain_name
}

output "pwa_app_domain" {
  value = local.pwa_domain_name
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.habify.id
}

output "cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.habify.id
}

output "cognito_domain" {
  value = "https://${aws_cognito_user_pool_domain.habify.domain}.auth.${var.aws_region}.amazoncognito.com"
}

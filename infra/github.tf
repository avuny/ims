variable "github_repo_name" {
  description = "The exact name of the repository"
  type        = string
  default     = "vite-monorepo"
}

# Automatically syncs the IAM Role ARN to a GitHub Secret
resource "github_actions_secret" "aws_role_arn" {
  repository  = var.github_repo_name
  secret_name = "AWS_ROLE_ARN"
  value       = aws_iam_role.github_actions.arn
}

# Automatically syncs the S3 Bucket Name to a GitHub Secret
resource "github_actions_secret" "s3_bucket" {
  repository  = var.github_repo_name
  secret_name = "S3_BUCKET"
  value       = aws_s3_bucket.web_app.id
}

# Automatically syncs the CloudFront ID to a GitHub Secret
resource "github_actions_secret" "cloudfront_dist_id" {
  repository  = var.github_repo_name
  secret_name = "CLOUDFRONT_DIST_ID"
  value       = aws_cloudfront_distribution.web_app.id
}

# Automatically syncs the AWS Region to a GitHub Secret
resource "github_actions_secret" "aws_region" {
  repository  = var.github_repo_name
  secret_name = "AWS_REGION"
  value       = var.aws_region
}
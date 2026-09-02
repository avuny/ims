variable "github_repo_name" {
  description = "The exact name of the repository"
  type        = string
  default     = "ims"
}

# ==============================================================================
# FRONTEND & AWS AUTH SECRETS
# ==============================================================================

resource "github_actions_secret" "aws_role_arn" {
  repository  = var.github_repo_name
  secret_name = "AWS_ROLE_ARN"
  value       = aws_iam_role.github_actions.arn
}

resource "github_actions_secret" "s3_bucket" {
  repository  = var.github_repo_name
  secret_name = "S3_BUCKET"
  value       = aws_s3_bucket.web_app.id
}

resource "github_actions_secret" "cloudfront_dist_id" {
  repository  = var.github_repo_name
  secret_name = "CLOUDFRONT_DIST_ID"
  value       = aws_cloudfront_distribution.web_app.id
}

resource "github_actions_secret" "aws_region" {
  repository  = var.github_repo_name
  secret_name = "AWS_REGION"
  value       = var.aws_region
}

# ==============================================================================
# BACKEND (ECR & ECS) SECRETS
# ==============================================================================

resource "github_actions_secret" "ecr_repository" {
  repository  = var.github_repo_name
  secret_name = "ECR_REPOSITORY"
  value       = aws_ecr_repository.server_app.name
}

resource "github_actions_secret" "ecs_cluster" {
  repository  = var.github_repo_name
  secret_name = "ECS_CLUSTER"
  value       = aws_ecs_cluster.main.name
}

resource "github_actions_secret" "ecs_service" {
  repository  = var.github_repo_name
  secret_name = "ECS_SERVICE"
  value       = aws_ecs_service.server.name
}

resource "github_actions_secret" "ecs_task_family" {
  repository  = var.github_repo_name
  secret_name = "ECS_TASK_FAMILY"
  value       = aws_ecs_task_definition.server.family
}
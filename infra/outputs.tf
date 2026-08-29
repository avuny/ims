# ==============================================================================
# OUTPUTS
# ==============================================================================
# After running 'terraform apply', Terraform prints these values 
# in the terminal. You need these exact strings to configure GitHub Actions 
# Secrets (S3_BUCKET, CLOUDFRONT_DIST_ID, and AWS_ROLE_ARN).

output "s3_bucket_name" {
  description = "The name of the S3 bucket (Use this for the GitHub Actions S3_BUCKET secret)"
  value       = aws_s3_bucket.web_app.id
}

output "cloudfront_domain_name" {
  description = "The public URL to access your app in the browser."
  value       = aws_cloudfront_distribution.web_app.domain_name
}

output "cloudfront_distribution_id" {
  description = "The Distribution ID (Use this for the GitHub Actions CLOUDFRONT_DIST_ID secret)"
  value       = aws_cloudfront_distribution.web_app.id
}

output "github_actions_role_arn" {
  description = "The IAM Role ARN to use in GitHub Actions (Use this for the GitHub Actions AWS_ROLE_ARN secret)"
  value       = aws_iam_role.github_actions.arn
}
